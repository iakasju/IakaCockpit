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
import { notifyUser } from "../api/backend";
import type { NotifySupport, ServiceStatus } from "../api/backend";
import { embeddedTeams, TEAM_NONE } from "../theme/vignettes";
import { DEFAULT_CHEF_ALLOWED_TOOLS } from "../hooks/useSettings";
import type {
  ChefTrustMode,
  Density,
  FontFamily,
  NavPos,
  Shape,
  UseSettings,
} from "../hooks/useSettings";
// Chartes embarquees (L14) : catalogue GENERE depuis iakagraph (10 chartes). Le
// CSS associe (chartes.css) est importe au build dans App.tsx ; ici on ne lit que
// le manifest (id + nom + swatches) pour peupler le sélecteur de charte.
import { CHARTES } from "../assets/chartes/manifest";

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

/**
 * Teams de vignettes disponibles (L9) : « aucune » (pastilles texte) + les teams
 * embarquées dans le manifest. Libellés lisibles ; la charte suit le thème actif.
 */
const TEAM_LABELS: Record<string, string> = {
  none: "Aucune (pastilles)",
  lotr: "LOTR",
  avengers: "Avengers",
  starfleet: "Starfleet",
};
const TEAM_OPTIONS: { id: string; label: string }[] = [
  { id: TEAM_NONE, label: TEAM_LABELS[TEAM_NONE] },
  ...embeddedTeams().map((t) => ({ id: t, label: TEAM_LABELS[t] ?? t })),
];

/** Supports de diffusion du canal adresse (L6, D2) — choisis côté Cockpit. */
const SUPPORTS: { id: NotifySupport; label: string }[] = [
  { id: "slack", label: "Slack" },
  { id: "discord", label: "Discord" },
  { id: "mqtt", label: "MQTT" },
];

/** Modes de trust du cwd du chef-runner (L10b/P3, § 4.5). */
const TRUST_MODES: { id: ChefTrustMode; label: string }[] = [
  { id: "inherit", label: "héritage" },
  { id: "accept", label: "acceptation" },
];

/**
 * Sommaire (TOC) du menu gauche (L12 — retour terrain) : reflète les sections
 * RÉELLES du panneau, dans l'ordre, regroupées par thème. Chaque entrée pointe vers
 * l'`id` de sa section ; cliquer défile jusqu'à elle (`scrollIntoView`) et l'active.
 * SOURCE UNIQUE : ajouter une section = une entrée ici + l'`id` correspondant sur le
 * `.block` dans le JSX (sinon le clic n'a pas de cible). Fini les items décoratifs.
 */
interface SettingsSection {
  id: string;
  label: string;
  icon: string;
}
const SETTINGS_GROUPS: { label: string; items: SettingsSection[] }[] = [
  {
    label: "Généraux",
    items: [
      { id: "set-interface", label: "Interface", icon: "🧭" },
      { id: "set-police", label: "Police", icon: "🔤" },
      { id: "set-charte", label: "Charte", icon: "🎨" },
    ],
  },
  {
    label: "Cockpit / opérationnel",
    items: [
      { id: "set-cockpit", label: "Cockpit", icon: "🎩" },
      { id: "set-ia", label: "IA (LiteLLM)", icon: "🧠" },
      { id: "set-securite", label: "Sécurité d'exécution", icon: "🤖" },
      { id: "set-maincourante", label: "Main courante", icon: "📓" },
      { id: "set-adresse", label: "Canal adresse (n8n)", icon: "📣" },
      { id: "set-services", label: "Services iakabox", icon: "📡" },
    ],
  },
];
const FIRST_SECTION_ID = SETTINGS_GROUPS[0].items[0].id;

export interface SettingsViewProps {
  settings: UseSettings;
  services: ServiceStatus[];
  onRescan: () => void;
  /**
   * Déclencheur d'envoi du canal adresse (L6). Par défaut la façade `notifyUser`
   * (seul point `invoke`, D6) ; injectable pour les tests. Le bouton « Tester
   * l'envoi » l'appelle et affiche l'ack ou l'erreur lisible.
   */
  onNotify?: typeof notifyUser;
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
  onNotify = notifyUser,
}: SettingsViewProps): JSX.Element {
  const [rootDraft, setRootDraft] = useState<string>("");
  const [endpointDraft, setEndpointDraft] = useState<string>("");
  const [modelDraft, setModelDraft] = useState<string>("");
  const [keyDraft, setKeyDraft] = useState<string>("");
  const [couchUrlDraft, setCouchUrlDraft] = useState<string>("");
  const [couchDbDraft, setCouchDbDraft] = useState<string>("");
  const [couchUserDraft, setCouchUserDraft] = useState<string>("");
  const [couchPassDraft, setCouchPassDraft] = useState<string>("");
  const [n8nUrlDraft, setN8nUrlDraft] = useState<string>("");
  const [n8nTokenDraft, setN8nTokenDraft] = useState<string>("");
  const [n8nCibleDraft, setN8nCibleDraft] = useState<string>("");
  const [n8nMsgDraft, setN8nMsgDraft] = useState<string>("");
  const [n8nTestResult, setN8nTestResult] = useState<string>("");
  const [n8nTesting, setN8nTesting] = useState<boolean>(false);
  const [chefToolsDraft, setChefToolsDraft] = useState<string>("");

  // Section active du sommaire (L12) : pilote l'état actif du menu gauche. Le clic
  // défile jusqu'à la section et la marque active. Aucun I/O — pure navigation DOM.
  const [activeSection, setActiveSection] = useState<string>(FIRST_SECTION_ID);
  const gotoSection = (id: string): void => {
    setActiveSection(id);
    const el =
      typeof document !== "undefined" ? document.getElementById(id) : null;
    el?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };

  // Pré-remplit les brouillons à la première valeur chargée.
  const rootValue = rootDraft || settings.root || "";
  const endpointValue =
    endpointDraft || settings.litellmEndpoint || "";
  const modelValue = modelDraft || settings.litellmModel || "";
  const couchUrlValue = couchUrlDraft || settings.couchdbUrl || "";
  const couchDbValue = couchDbDraft || settings.couchdbDb || "";
  const n8nUrlValue = n8nUrlDraft || settings.n8nWebhookUrl || "";
  // Chef-runner (L10b/P3) : l'allowlist reste GLOBALE (sécurité d'exécution, AR-3).
  // Le runner/modèle sont désormais définis PAR AGENT (« Teams & agents », L11).
  const chefToolsValue =
    chefToolsDraft || settings.chefAllowedTools || DEFAULT_CHEF_ALLOWED_TOOLS;

  // Déclencheur « Tester l'envoi » (L6) : émet via la façade, affiche ack/erreur.
  // Aucun `invoke` ici — c'est `onNotify` (façade) qui parle à Rust (D6).
  const runNotifyTest = async (): Promise<void> => {
    setN8nTesting(true);
    setN8nTestResult("");
    try {
      const ack = await onNotify(
        n8nMsgDraft,
        settings.n8nActiveSupport,
        n8nCibleDraft || undefined,
        {
          royaume: "IAKACOCKPIT",
          agent: "Cockpit",
          project: "iakacockpit",
          ts: new Date().toISOString(),
          source: "iakacockpit",
        },
      );
      setN8nTestResult(
        ack.provider === "mock"
          ? "Mock : payload construit, aucun POST réel (URL webhook vide ou flag dev)."
          : `Pris en charge par n8n (provider ${ack.provider}, HTTP ${ack.http_status ?? "?"}).`,
      );
    } catch (e) {
      setN8nTestResult(`Échec : ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setN8nTesting(false);
    }
  };

  return (
    <section className="view st" aria-label="Réglages">
      <nav className="setnav" aria-label="Sections réglages">
        {SETTINGS_GROUPS.map((group) => (
          <div key={group.label} className="setgroup">
            <h3>{group.label}</h3>
            {group.items.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`seti${activeSection === s.id ? " active" : ""}`}
                aria-current={activeSection === s.id ? "true" : undefined}
                onClick={() => gotoSection(s.id)}
              >
                <span className="e">{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="setmain">
        {/* ---------- GÉNÉRAUX (persistés) ---------- */}
        <div className="setpanel">
          <h1>Réglages généraux</h1>
          <p className="lead">
            Interface, forme, police et charte. Ces préférences sont persistées
            (elles survivent au redémarrage).
          </p>

          <div className="block" id="set-interface">
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

          <div className="block" id="set-police">
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
                  max={200}
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

          <div className="block" id="set-charte">
            <div className="bt">
              <span className="e">🎨</span>
              <h2>Charte</h2>
            </div>
            <div className="themegrid">
              {CHARTES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`tcard${settings.theme === t.id ? " sel" : ""}`}
                  aria-pressed={settings.theme === t.id}
                  onClick={() => void settings.setTheme(t.id)}
                >
                  <div className="swatch">
                    {t.swatches.map((c, i) => (
                      <i key={i} style={{ background: c }} />
                    ))}
                  </div>
                  <div className="nm">{t.name}</div>
                </button>
              ))}
            </div>

            <div className="fieldrow">
              <div className="lab">
                <div className="t">Team (vignettes)</div>
                <div className="d">
                  Incarne la team : un casting (univers) qui peuple les rôles.
                  Les vignettes suivent la charte active. « Aucune » = pastilles
                  texte.
                </div>
              </div>
              <div className="ctl">
                <select
                  className="field"
                  value={settings.team}
                  aria-label="Team de vignettes"
                  onChange={(e) => void settings.setTeam(e.target.value)}
                >
                  {TEAM_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ---------- COCKPIT MINIMAL ---------- */}
        <div className="setpanel">
          <div className="block" id="set-cockpit">
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
          </div>

          <div className="block" id="set-ia">
            <div className="bt">
              <span className="e">🧠</span>
              <h2>IA (LiteLLM)</h2>
            </div>

            <div className="fieldrow">
              <div className="lab">
                <div className="t">Endpoint IA (OpenAI-compat — LiteLLM recommandé)</div>
                <div className="d">
                  URL non sensible. Cible au choix : LiteLLM LAN, Ollama
                  localhost/LAN (http://localhost:11434/v1), ou cloud OpenAI-compat.
                  Vide → mode mock (suggestions simulées).
                </div>
              </div>
              <div className="ctl">
                <input
                  className="field"
                  type="url"
                  placeholder="http://192.168.2.11:4000"
                  value={endpointValue}
                  onChange={(e) => setEndpointDraft(e.target.value)}
                  aria-label="Endpoint IA"
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

            <div className="fieldrow">
              <div className="lab">
                <div className="t">Modèle</div>
                <div className="d">
                  Nom/alias transmis tel quel à l'endpoint (alias LiteLLM, modèle
                  Ollama, ou modèle cloud).
                </div>
              </div>
              <div className="ctl">
                <input
                  className="field"
                  type="text"
                  placeholder="llama3.1:8b"
                  value={modelValue}
                  onChange={(e) => setModelDraft(e.target.value)}
                  aria-label="Modèle IA"
                />
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => void settings.setLitellmModel(modelValue)}
                >
                  Enregistrer
                </button>
              </div>
            </div>

            <div className="fieldrow">
              <div className="lab">
                <div className="t">Clé IA (facultative)</div>
                <div className="d">
                  Stockée au keychain (jamais affichée). Facultative — inutile pour
                  un Ollama local.{" "}
                  <strong>
                    {settings.aiKeySet ? "Clé enregistrée ✓" : "Aucune clé"}
                  </strong>
                </div>
              </div>
              <div className="ctl">
                <input
                  className="field"
                  type="password"
                  placeholder="sk-… (laisser vide pour retirer)"
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                  aria-label="Clé IA"
                />
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => {
                    void settings.setAiKey(keyDraft).then(() => setKeyDraft(""));
                  }}
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>

          {/* TEAMS & AGENTS : sortis dans la vue dédiée « Teams » (L13). */}
          <div className="block" id="set-securite">
            <div className="bt">
              <span className="e">🤖</span>
              <h2>Sécurité d'exécution du chef-runner</h2>
            </div>
            <p className="lead">
              Le coordinateur de la team possède la conversation (terminal-source) ; le
              chat en est la vue filtrée. Le <strong>runner et le modèle</strong> se
              règlent désormais <strong>par agent</strong> (page « Teams »). Ces
              réglages-ci restent <strong>GLOBAUX</strong> (politique de sécurité
              d'exécution, lue à l'ouverture d'une conversation).
            </p>

            <div className="fieldrow">
              <div className="lab">
                <div className="t">Outils autorisés (allowlist)</div>
                <div className="d">
                  <code>--allowedTools</code> (CSV). Jamais de bypass global. ⚠️ N'a
                  d'effet que sur un workspace trusté (cf. trust ci-dessous). Vide →
                  défaut ({DEFAULT_CHEF_ALLOWED_TOOLS}).
                </div>
              </div>
              <div className="ctl">
                <input
                  className="field"
                  type="text"
                  placeholder={DEFAULT_CHEF_ALLOWED_TOOLS}
                  value={chefToolsValue}
                  onChange={(e) => setChefToolsDraft(e.target.value)}
                  aria-label="Allowlist d'outils du chef-runner"
                />
                <button
                  type="button"
                  className="btn sm"
                  onClick={() =>
                    void settings.setChefAllowedTools(chefToolsValue)
                  }
                >
                  Enregistrer
                </button>
              </div>
            </div>

            <div className="fieldrow">
              <div className="lab">
                <div className="t">Trust du cwd</div>
                <div className="d">
                  <strong>héritage</strong> : confiance héritée d'un dossier parent
                  trusté, sinon dialogue natif dans le terminal.{" "}
                  <strong>acceptation</strong> : pré-accepte le cwd (idempotent) pour
                  que le dialogue ne bloque pas l'auto-lancement.
                </div>
              </div>
              <div className="ctl">
                <Seg
                  options={TRUST_MODES}
                  value={settings.chefTrustMode}
                  onChange={(v) => void settings.setChefTrustMode(v)}
                />
              </div>
            </div>

            <div className="fieldrow">
              <div className="lab">
                <div className="t">Canal pensée</div>
                <div className="d">
                  Masque par défaut le canal « pensée » (thinking) dans le chat
                  (réduit le bruit). Réglable aussi depuis la barre du chat.
                </div>
              </div>
              <div className="ctl">
                <Seg
                  options={[
                    { id: "hidden", label: "masquée" },
                    { id: "shown", label: "visible" },
                  ]}
                  value={settings.hidePensee ? "hidden" : "shown"}
                  onChange={(v) => void settings.setHidePensee(v === "hidden")}
                />
              </div>
            </div>
          </div>

          <div className="block" id="set-maincourante">
            <div className="bt">
              <span className="e">📓</span>
              <h2>Main courante (iakaboxlogs)</h2>
            </div>

            <div className="fieldrow">
              <div className="lab">
                <div className="t">URL CouchDB</div>
                <div className="d">
                  Base de la main courante 3-canaux (lecture seule). Non sensible.
                  Vide → mode dégradé (données simulées).
                </div>
              </div>
              <div className="ctl">
                <input
                  className="field"
                  type="url"
                  placeholder="http://192.168.2.11:5984"
                  value={couchUrlValue}
                  onChange={(e) => setCouchUrlDraft(e.target.value)}
                  aria-label="URL CouchDB"
                />
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => void settings.setCouchdbUrl(couchUrlValue)}
                >
                  Enregistrer
                </button>
              </div>
            </div>

            <div className="fieldrow">
              <div className="lab">
                <div className="t">Base CouchDB</div>
                <div className="d">Nom de la base (défaut : conversations).</div>
              </div>
              <div className="ctl">
                <input
                  className="field"
                  type="text"
                  placeholder="conversations"
                  value={couchDbValue}
                  onChange={(e) => setCouchDbDraft(e.target.value)}
                  aria-label="Base CouchDB"
                />
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => void settings.setCouchdbDb(couchDbValue)}
                >
                  Enregistrer
                </button>
              </div>
            </div>

            <div className="fieldrow">
              <div className="lab">
                <div className="t">Identifiants CouchDB</div>
                <div className="d">
                  Stockés au keychain (jamais affichés). Mot de passe vide → retire
                  les identifiants.{" "}
                  <strong>
                    {settings.couchCredsSet
                      ? "Identifiants enregistrés ✓"
                      : "Aucun identifiant"}
                  </strong>
                </div>
              </div>
              <div className="ctl">
                <input
                  className="field"
                  type="text"
                  placeholder="utilisateur (admin)"
                  value={couchUserDraft}
                  onChange={(e) => setCouchUserDraft(e.target.value)}
                  aria-label="Utilisateur CouchDB"
                />
                <input
                  className="field"
                  type="password"
                  placeholder="mot de passe (vide pour retirer)"
                  value={couchPassDraft}
                  onChange={(e) => setCouchPassDraft(e.target.value)}
                  aria-label="Mot de passe CouchDB"
                />
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => {
                    void settings
                      .setCouchCredentials(couchUserDraft, couchPassDraft)
                      .then(() => {
                        setCouchUserDraft("");
                        setCouchPassDraft("");
                      });
                  }}
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>

          <div className="block" id="set-adresse">
            <div className="bt">
              <span className="e">📣</span>
              <h2>Canal adresse externe (n8n)</h2>
            </div>
            <p className="lead">
              Émet les messages du canal « adresse » vers UN webhook n8n, qui route
              vers le support actif. Aucun secret de support (Discord/Slack/MQTT) ne
              vit dans le Cockpit : ils restent dans n8n.
            </p>

            <div className="fieldrow">
              <div className="lab">
                <div className="t">URL du webhook n8n</div>
                <div className="d">
                  Production URL du workflow n8n (Active). Non sensible. Vide → mode
                  mock (aucun POST réel).
                </div>
              </div>
              <div className="ctl">
                <input
                  className="field"
                  type="url"
                  placeholder="http://localhost:5678/webhook/iakacockpit-adresse"
                  value={n8nUrlValue}
                  onChange={(e) => setN8nUrlDraft(e.target.value)}
                  aria-label="URL du webhook n8n"
                />
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => void settings.setN8nWebhookUrl(n8nUrlValue)}
                >
                  Enregistrer
                </button>
              </div>
            </div>

            <div className="fieldrow">
              <div className="lab">
                <div className="t">Support actif</div>
                <div className="d">
                  Choisi côté Cockpit (passé dans le payload) ; n8n route dessus.
                </div>
              </div>
              <div className="ctl">
                <Seg
                  options={SUPPORTS}
                  value={settings.n8nActiveSupport}
                  onChange={(v) => void settings.setN8nActiveSupport(v)}
                />
              </div>
            </div>

            <div className="fieldrow">
              <div className="lab">
                <div className="t">Token du webhook (facultatif)</div>
                <div className="d">
                  En-tête <code>X-API-Key</code> si le webhook n8n est protégé (Header
                  Auth). Stocké au keychain (jamais affiché). Vide → retire.{" "}
                  <strong>
                    {settings.n8nTokenSet ? "Token enregistré ✓" : "Aucun token"}
                  </strong>
                </div>
              </div>
              <div className="ctl">
                <input
                  className="field"
                  type="password"
                  placeholder="token (laisser vide pour retirer)"
                  value={n8nTokenDraft}
                  onChange={(e) => setN8nTokenDraft(e.target.value)}
                  aria-label="Token du webhook n8n"
                />
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => {
                    void settings
                      .setN8nToken(n8nTokenDraft)
                      .then(() => setN8nTokenDraft(""));
                  }}
                >
                  Enregistrer
                </button>
              </div>
            </div>

            <div className="fieldrow">
              <div className="lab">
                <div className="t">Tester l'envoi</div>
                <div className="d">
                  Émet un message sur le canal adresse via n8n (cible optionnelle :
                  canal/salon/topic). Affiche l'ack ou l'erreur.
                </div>
              </div>
              <div className="ctl">
                <input
                  className="field"
                  type="text"
                  placeholder="cible (optionnelle : #iakaframe, topic…)"
                  value={n8nCibleDraft}
                  onChange={(e) => setN8nCibleDraft(e.target.value)}
                  aria-label="Cible du message"
                />
                <input
                  className="field"
                  type="text"
                  placeholder="message de test"
                  value={n8nMsgDraft}
                  onChange={(e) => setN8nMsgDraft(e.target.value)}
                  aria-label="Message de test"
                />
                <button
                  type="button"
                  className="btn accent sm"
                  disabled={n8nTesting}
                  onClick={() => void runNotifyTest()}
                >
                  {n8nTesting ? "Envoi…" : "Tester l'envoi"}
                </button>
              </div>
            </div>
            {n8nTestResult && (
              <div className="svcrow" role="status" aria-live="polite">
                {n8nTestResult}
              </div>
            )}
          </div>

          <div className="block" id="set-services">
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
