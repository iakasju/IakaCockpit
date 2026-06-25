/**
 * SettingsView — vue Réglages (D4). GÉNÉRAUX (UI persistée, PO-2) + COCKPIT
 * MINIMAL (chapeau, endpoint LiteLLM, thème, bloc services). Tout le reste de v7
 * (panneaux « horizon ») est OUT (D4-bis / Périmètre).
 *
 * Présentationnel : reçoit `useSettings` + `useServices` en props ; chaque
 * changement appelle le setter du hook (qui PERSISTE via config + applique au
 * DOM). Aucun I/O direct dans la vue.
 */
import { useState } from "react";
import type { ServiceStatus } from "../api/backend";
import type {
  Density,
  FontFamily,
  NavPos,
  Shape,
  UseSettings,
} from "../hooks/useSettings";

const THEMES: { id: string; name: string; sw: string[] }[] = [
  { id: "naonedge-dark", name: "NaonEdge dark", sw: ["#0a0a0a", "#161616", "#c8a44e"] },
  { id: "naonedge-light", name: "NaonEdge light", sw: ["#f4f2ec", "#ffffff", "#9a7521"] },
];

const NAV_POS: { id: NavPos; label: string }[] = [
  { id: "left", label: "gauche" },
  { id: "split", label: "centrée" },
  { id: "right", label: "droite" },
];
const DENSITY: { id: Density; label: string }[] = [
  { id: "comfort", label: "confort" },
  { id: "standard", label: "standard" },
  { id: "compact", label: "compact" },
];
const SHAPE: { id: Shape; label: string }[] = [
  { id: "round", label: "arrondi" },
  { id: "square", label: "carré" },
];
const FONT: { id: FontFamily; label: string }[] = [
  { id: "system", label: "système" },
  { id: "serif", label: "serif" },
  { id: "mono-ui", label: "mono" },
];

export interface SettingsViewProps {
  settings: UseSettings;
  services: ServiceStatus[];
  onRescan: () => void;
}

function Seg<T extends string>(props: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}): JSX.Element {
  return (
    <div className="seg" role="group">
      {props.options.map((o) => (
        <button
          key={o.id}
          type="button"
          className={`o${o.id === props.value ? " active" : ""}`}
          aria-pressed={o.id === props.value}
          onClick={() => props.onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsView({
  settings,
  services,
  onRescan,
}: SettingsViewProps): JSX.Element {
  const [rootDraft, setRootDraft] = useState<string>("");
  const [endpointDraft, setEndpointDraft] = useState<string>("");

  // Pré-remplit les brouillons à la première valeur chargée.
  const rootValue = rootDraft || settings.root || "";
  const endpointValue =
    endpointDraft || settings.litellmEndpoint || "";

  return (
    <section className="view st" aria-label="Réglages">
      <nav className="setnav" aria-label="Sections réglages">
        <h3>Réglages</h3>
        <div className="seti active">
          <span className="e">🎛</span>Généraux
        </div>
        <div className="seti">
          <span className="e">🎩</span>Cockpit
        </div>
      </nav>

      <div className="setmain">
        {/* ---------- GÉNÉRAUX (persistés) ---------- */}
        <div className="setpanel active">
          <h1>Réglages généraux</h1>
          <p className="lead">
            Interface, forme, police et charte. Ces préférences sont persistées
            (elles survivent au redémarrage).
          </p>

          <div className="block">
            <div className="bt">
              <span className="e">🧭</span>
              <h2>Interface</h2>
            </div>
            <div className="fieldrow">
              <div className="lab">
                <div className="t">Position de la navigation</div>
                <div className="d">left / split / right</div>
              </div>
              <div className="ctl">
                <Seg
                  options={NAV_POS}
                  value={settings.ui.navPos}
                  onChange={(v) => void settings.setUiPref("navPos", v)}
                />
              </div>
            </div>
            <div className="fieldrow">
              <div className="lab">
                <div className="t">Densité</div>
                <div className="d">espacement des vues</div>
              </div>
              <div className="ctl">
                <Seg
                  options={DENSITY}
                  value={settings.ui.density}
                  onChange={(v) => void settings.setUiPref("density", v)}
                />
              </div>
            </div>
            <div className="fieldrow">
              <div className="lab">
                <div className="t">Forme</div>
                <div className="d">coins arrondis ou carrés</div>
              </div>
              <div className="ctl">
                <Seg
                  options={SHAPE}
                  value={settings.ui.shape}
                  onChange={(v) => void settings.setUiPref("shape", v)}
                />
              </div>
            </div>
          </div>

          <div className="block">
            <div className="bt">
              <span className="e">🔤</span>
              <h2>Police</h2>
            </div>
            <div className="fieldrow">
              <div className="lab">
                <div className="t">Famille</div>
                <div className="d">système / serif / mono</div>
              </div>
              <div className="ctl">
                <Seg
                  options={FONT}
                  value={settings.ui.fontFamily}
                  onChange={(v) => void settings.setUiPref("fontFamily", v)}
                />
              </div>
            </div>
            <div className="fieldrow">
              <div className="lab">
                <div className="t">Échelle</div>
                <div className="d">{settings.ui.fontScale}%</div>
              </div>
              <div className="ctl">
                <input
                  className="range"
                  type="range"
                  min={80}
                  max={140}
                  step={5}
                  value={settings.ui.fontScale}
                  onChange={(e) =>
                    void settings.setUiPref("fontScale", Number(e.target.value))
                  }
                  aria-label="Échelle de police"
                />
              </div>
            </div>
          </div>

          <div className="block">
            <div className="bt">
              <span className="e">🎨</span>
              <h2>Charte</h2>
            </div>
            <div className="themegrid">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`tcard${settings.theme === t.id ? " sel" : ""}`}
                  aria-pressed={settings.theme === t.id}
                  onClick={() => void settings.setTheme(t.id)}
                >
                  <div className="swatch">
                    {t.sw.map((c, i) => (
                      <i key={i} style={{ background: c }} />
                    ))}
                  </div>
                  <div className="nm">{t.name}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ---------- COCKPIT MINIMAL ---------- */}
        <div className="setpanel active">
          <div className="block">
            <div className="bt">
              <span className="e">🎩</span>
              <h2>Cockpit</h2>
            </div>

            <div className="fieldrow">
              <div className="lab">
                <div className="t">Chapeau (racine)</div>
                <div className="d">dossier scanné par le portfolio</div>
              </div>
              <div className="ctl">
                <input
                  className="field"
                  type="text"
                  value={rootValue}
                  onChange={(e) => setRootDraft(e.target.value)}
                  aria-label="Racine du chapeau"
                />
                <button
                  type="button"
                  className="btn accent sm"
                  onClick={() => {
                    void settings.setRoot(rootValue).then(onRescan);
                  }}
                >
                  Appliquer & re-scanner
                </button>
              </div>
            </div>

            <div className="fieldrow">
              <div className="lab">
                <div className="t">Endpoint LiteLLM</div>
                <div className="d">URL non sensible (la clé va au keychain, L3)</div>
              </div>
              <div className="ctl">
                <input
                  className="field"
                  type="url"
                  placeholder="http://192.168.2.11:4000"
                  value={endpointValue}
                  onChange={(e) => setEndpointDraft(e.target.value)}
                  aria-label="Endpoint LiteLLM"
                />
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => void settings.setLitellmEndpoint(endpointValue)}
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>

          <div className="block">
            <div className="bt">
              <span className="e">📡</span>
              <h2>Services iakabox</h2>
            </div>
            {services.length === 0 && (
              <div className="svcrow">Aucun service (hors box ou non sondé).</div>
            )}
            {services.map((s) => (
              <div key={s.name} className="svcrow">
                <span className={`dot ${s.reachable ? "up" : "down"}`} aria-hidden />
                <span>{s.name}</span>
                <span style={{ color: "var(--text-3)" }}>
                  {s.host}:{s.port}
                </span>
                <span style={{ marginLeft: "auto" }}>
                  {s.reachable
                    ? `${s.latency_ms ?? "?"} ms`
                    : "injoignable"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
