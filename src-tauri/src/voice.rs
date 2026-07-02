//! voice — pilotage vocal (L16-P1).
//!
//! Pipeline **entièrement LOCAL** : capture micro (`cpal`) → STT (`whisper-rs`,
//! whisper.cpp) → texte transcrit. La voix ne quitte JAMAIS la machine (aucun
//! envoi cloud). Le front (`dispatcher.ts`) résout ensuite le texte en action IHM.
//!
//! Contrat : la commande `voice_listen` fait un **push-to-talk MVP** — au clic,
//! elle enregistre une courte fenêtre (fixe), transcrit en FR et renvoie le
//! texte. Le maintien-pour-parler (hold) et le VAD sont différés (P2+).
//!
//! Modèle : `ggml-base.bin` (whisper base multilingue), **téléchargé au 1er run**
//! (non bundlé, cf. cadrage) sous le cache OS, puis réutilisé hors ligne.
//!
//! Dégradation : tout chemin d'erreur renvoie `Err(String)` lisible (pas de
//! panique) — le hook front bascule alors en mode « micro indisponible ».

use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

/// Modèle whisper base multilingue (décision Stéphane 2026-07-01).
const MODEL_URL: &str = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin";
const MODEL_FILE: &str = "ggml-base.bin";

/// Fréquence d'échantillonnage attendue par whisper (16 kHz mono f32).
const TARGET_SR: u32 = 16_000;
/// Fenêtre d'enregistrement (MVP fixe). Les commandes de nav sont courtes.
const RECORD_SECS: u64 = 4;

// ---------------------------------------------------------------------------
// Helpers PURS (testables sans matériel)
// ---------------------------------------------------------------------------

/// Réduit un flux entrelacé multicanal en mono (moyenne des canaux par trame).
pub fn downmix_to_mono(interleaved: &[f32], channels: usize) -> Vec<f32> {
    if channels <= 1 {
        return interleaved.to_vec();
    }
    interleaved
        .chunks(channels)
        .map(|frame| frame.iter().sum::<f32>() / frame.len() as f32)
        .collect()
}

/// Ré-échantillonne un signal mono par interpolation linéaire de `src_sr` vers
/// `dst_sr`. Suffisant pour de la parole/commande (qualité STT non critique).
pub fn resample_linear(input: &[f32], src_sr: u32, dst_sr: u32) -> Vec<f32> {
    if src_sr == dst_sr || input.is_empty() {
        return input.to_vec();
    }
    let ratio = dst_sr as f64 / src_sr as f64;
    let out_len = ((input.len() as f64) * ratio).round() as usize;
    let mut out = Vec::with_capacity(out_len);
    for i in 0..out_len {
        let src_pos = i as f64 / ratio;
        let idx = src_pos.floor() as usize;
        let frac = src_pos - idx as f64;
        let a = input[idx.min(input.len() - 1)];
        let b = input[(idx + 1).min(input.len() - 1)];
        out.push((a as f64 + (b as f64 - a as f64) * frac) as f32);
    }
    out
}

/// Nettoie la transcription whisper (espaces, retours ligne) en une ligne.
pub fn clean_transcript(raw: &str) -> String {
    raw.split_whitespace().collect::<Vec<_>>().join(" ")
}

// ---------------------------------------------------------------------------
// Modèle : résolution + téléchargement au 1er run
// ---------------------------------------------------------------------------

/// Emplacement local du modèle : `<cache OS>/iakacockpit/models/ggml-base.bin`.
fn model_path() -> Result<PathBuf, String> {
    let base = dirs::cache_dir().ok_or("cache OS introuvable")?;
    Ok(base.join("iakacockpit").join("models").join(MODEL_FILE))
}

/// Renvoie le chemin du modèle, le **téléchargeant** (HTTPS) si absent. Écrit
/// dans un fichier temporaire puis renomme (atomique) pour ne jamais laisser un
/// modèle partiel exploitable.
fn ensure_model() -> Result<PathBuf, String> {
    let path = model_path()?;
    if path.exists() {
        eprintln!("[voice] modèle présent: {}", path.display());
        return Ok(path);
    }
    eprintln!(
        "[voice] modèle absent -> téléchargement (~147 Mo): {}",
        MODEL_URL
    );
    let dir = path.parent().ok_or("chemin modèle invalide")?.to_path_buf();
    std::fs::create_dir_all(&dir).map_err(|e| format!("création dossier modèle: {e}"))?;

    let resp = ureq::get(MODEL_URL)
        .call()
        .map_err(|e| format!("téléchargement modèle whisper: {e}"))?;
    let mut reader = resp.into_reader();
    let tmp = path.with_extension("part");
    {
        let mut file =
            std::fs::File::create(&tmp).map_err(|e| format!("création fichier modèle: {e}"))?;
        std::io::copy(&mut reader, &mut file).map_err(|e| format!("écriture modèle: {e}"))?;
    }
    std::fs::rename(&tmp, &path).map_err(|e| format!("finalisation modèle: {e}"))?;
    eprintln!("[voice] modèle téléchargé: {}", path.display());
    Ok(path)
}

// ---------------------------------------------------------------------------
// Capture micro (cpal)
// ---------------------------------------------------------------------------

/// Enregistre une fenêtre fixe depuis le micro par défaut, downmix mono +
/// ré-échantillonnage 16 kHz. Bloquant (~`RECORD_SECS`).
fn record_window() -> Result<Vec<f32>, String> {
    let host = cpal::default_host();
    let device = host
        .default_input_device()
        .ok_or("aucun micro par défaut")?;
    let config = device
        .default_input_config()
        .map_err(|e| format!("config micro: {e}"))?;
    let src_sr = config.sample_rate().0;
    let channels = config.channels() as usize;
    eprintln!(
        "[voice] micro='{}' sr={} ch={} fmt={:?}",
        device.name().unwrap_or_else(|_| "?".into()),
        src_sr,
        channels,
        config.sample_format()
    );

    let buf: Arc<Mutex<Vec<f32>>> = Arc::new(Mutex::new(Vec::new()));
    let err_fn = |e| eprintln!("[voice] erreur flux audio: {e}");

    // Un flux par format d'échantillon exposé par le device.
    let stream = match config.sample_format() {
        cpal::SampleFormat::F32 => {
            let buf = buf.clone();
            device.build_input_stream(
                &config.into(),
                move |data: &[f32], _| buf.lock().unwrap().extend_from_slice(data),
                err_fn,
                None,
            )
        }
        cpal::SampleFormat::I16 => {
            let buf = buf.clone();
            device.build_input_stream(
                &config.into(),
                move |data: &[i16], _| {
                    let mut b = buf.lock().unwrap();
                    b.extend(data.iter().map(|&s| s as f32 / i16::MAX as f32));
                },
                err_fn,
                None,
            )
        }
        cpal::SampleFormat::U16 => {
            let buf = buf.clone();
            device.build_input_stream(
                &config.into(),
                move |data: &[u16], _| {
                    let mut b = buf.lock().unwrap();
                    b.extend(
                        data.iter()
                            .map(|&s| (s as f32 / u16::MAX as f32) * 2.0 - 1.0),
                    );
                },
                err_fn,
                None,
            )
        }
        other => return Err(format!("format audio non géré: {other:?}")),
    }
    .map_err(|e| format!("ouverture micro: {e}"))?;

    stream.play().map_err(|e| format!("démarrage micro: {e}"))?;
    let start = Instant::now();
    while start.elapsed() < Duration::from_secs(RECORD_SECS) {
        std::thread::sleep(Duration::from_millis(50));
    }
    drop(stream); // arrête la capture

    let raw = Arc::try_unwrap(buf)
        .map_err(|_| "buffer audio encore référencé".to_string())?
        .into_inner()
        .map_err(|_| "verrou audio empoisonné".to_string())?;

    let mono = downmix_to_mono(&raw, channels);
    let out = resample_linear(&mono, src_sr, TARGET_SR);
    let peak = out.iter().fold(0f32, |m, &x| m.max(x.abs()));
    let rms = (out.iter().map(|&x| x * x).sum::<f32>() / out.len().max(1) as f32).sqrt();
    eprintln!(
        "[voice] capturé {} échantillons bruts -> {} @16k (peak={peak:.4} rms={rms:.4})",
        raw.len(),
        out.len()
    );
    Ok(out)
}

// ---------------------------------------------------------------------------
// Transcription (whisper-rs)
// ---------------------------------------------------------------------------

fn transcribe(model: &Path, samples: &[f32]) -> Result<String, String> {
    let model_str = model.to_str().ok_or("chemin modèle non UTF-8")?;
    let ctx = WhisperContext::new_with_params(model_str, WhisperContextParameters::default())
        .map_err(|e| format!("chargement modèle whisper: {e}"))?;
    let mut state = ctx
        .create_state()
        .map_err(|e| format!("état whisper: {e}"))?;

    let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
    params.set_language(Some("fr"));
    params.set_translate(false);
    params.set_print_special(false);
    params.set_print_progress(false);
    params.set_print_realtime(false);
    params.set_print_timestamps(false);

    state
        .full(params, samples)
        .map_err(|e| format!("transcription whisper: {e}"))?;

    let n = state
        .full_n_segments()
        .map_err(|e| format!("segments whisper: {e}"))?;
    let mut text = String::new();
    for i in 0..n {
        if let Ok(seg) = state.full_get_segment_text(i) {
            text.push_str(&seg);
        }
    }
    let out = clean_transcript(&text);
    eprintln!("[voice] transcription: '{out}'");
    Ok(out)
}

// ---------------------------------------------------------------------------
// Commande Tauri (façade `voiceListen()` côté front)
// ---------------------------------------------------------------------------

/// Corps bloquant : (modèle prêt) → enregistre (~4 s) → transcrit → texte. Toute
/// la chaîne (dont le `cpal::Stream` `!Send`) reste sur un seul thread bloquant.
fn listen_blocking() -> Result<String, String> {
    eprintln!("[voice] voice_listen: début");
    let model = ensure_model()?;
    let samples = record_window()?;
    if samples.is_empty() {
        eprintln!("[voice] aucun échantillon capturé");
        return Ok(String::new());
    }
    let r = transcribe(&model, &samples);
    if let Err(ref e) = r {
        eprintln!("[voice] échec: {e}");
    }
    r
}

/// Écoute vocale push-to-talk. **Async + `spawn_blocking`** : l'enregistrement et
/// la transcription (plusieurs secondes) tournent hors thread UI, la fenêtre
/// reste réactive (le retour visuel « à l'écoute » s'anime). Local de bout en bout.
#[tauri::command]
pub async fn voice_listen() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(listen_blocking)
        .await
        .map_err(|e| format!("tâche vocale interrompue: {e}"))?
}

// ---------------------------------------------------------------------------
// Tests des helpers purs (le matériel/STT relève de la recette réelle)
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn downmix_mono_passthrough() {
        let s = vec![0.1, 0.2, 0.3];
        assert_eq!(downmix_to_mono(&s, 1), s);
    }

    #[test]
    fn downmix_stereo_moyenne() {
        // 2 canaux : [L,R, L,R] -> moyenne par trame.
        let s = vec![0.0, 1.0, 0.5, -0.5];
        assert_eq!(downmix_to_mono(&s, 2), vec![0.5, 0.0]);
    }

    #[test]
    fn resample_identite_si_meme_sr() {
        let s = vec![0.1, 0.2, 0.3];
        assert_eq!(resample_linear(&s, 16_000, 16_000), s);
    }

    #[test]
    fn resample_downsample_longueur() {
        // 48 kHz -> 16 kHz : ~1/3 des échantillons.
        let s: Vec<f32> = (0..300).map(|i| i as f32 / 300.0).collect();
        let out = resample_linear(&s, 48_000, 16_000);
        assert_eq!(out.len(), 100);
        // bornes non explosées
        assert!(out.iter().all(|&x| (0.0..=1.0).contains(&x)));
    }

    #[test]
    fn resample_vide() {
        assert!(resample_linear(&[], 48_000, 16_000).is_empty());
    }

    #[test]
    fn clean_transcript_normalise() {
        assert_eq!(
            clean_transcript("  montre\n le  journal "),
            "montre le journal"
        );
    }
}
