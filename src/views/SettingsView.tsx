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
import { Trans, useTranslation } from "react-i18next";
import type { Lang } from "../i18n";
import { notifyUser } from "../api/backend";
import type { NotifySupport, ServiceStatus } from "../api/backend";
import { embeddedTeams, TEAM_NONE } from "../theme/vignettes";
import {
  clampTermFontSize,
  clampTermLineHeight,
  DEFAULT_CHEF_ALLOWED_TOOLS,
  TERM_FONT_MAX,
  TERM_FONT_MIN,
  TERM_FONT_STEP,
  TERM_LINE_HEIGHT_MAX,
  TERM_LINE_HEIGHT_MIN,
  TERM_LINE_HEIGHT_STEP,
} from "../hooks/useSettings";
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
// L34 : l'endpoint interrogé est un miroir de `tauri.conf.json` (le plugin ne
// l'expose pas à la webview) — sa cohérence est gardée par un test dédié.
import { primaryUpdateEndpoint } from "../app/updateEndpoints";
import type { UpdateState } from "../hooks/useAppUpdate";

// Options de segmented controls : id + clé i18n du libellé (résolue au rendu).
const NAV_POS: { id: NavPos; key: string }[] = [
  { id: "left", key: "settings.navPosLeft" },
  { id: "split", key: "settings.navPosSplit" },
  { id: "right", key: "settings.navPosRight" },
];
const DENSITY: { id: Density; key: string }[] = [
  { id: "comfort", key: "settings.densityComfort" },
  { id: "standard", key: "settings.densityStandard" },
  { id: "compact", key: "settings.densityCompact" },
];
const SHAPE: { id: Shape; key: string }[] = [
  { id: "round", key: "settings.shapeRound" },
  { id: "square", key: "settings.shapeSquare" },
];
const FONT: { id: FontFamily; key: string }[] = [
  { id: "system", key: "settings.fontSystem" },
  { id: "serif", key: "settings.fontSerif" },
  { id: "mono-ui", key: "settings.fontMono" },
];

/** Teams de vignettes disponibles (L9) : ids ; libellés résolus en i18n au rendu. */
const TEAM_IDS: string[] = [TEAM_NONE, ...embeddedTeams()];

/** Supports de diffusion du canal adresse (L6, D2) — choisis côté Cockpit. */
const SUPPORTS: { id: NotifySupport; key: string }[] = [
  { id: "slack", key: "settings.supportSlack" },
  { id: "discord", key: "settings.supportDiscord" },
  { id: "mqtt", key: "settings.supportMqtt" },
];

/** Modes de trust du cwd du chef-runner (L10b/P3, § 4.5). */
const TRUST_MODES: { id: ChefTrustMode; key: string }[] = [
  { id: "inherit", key: "settings.trustInherit" },
  { id: "accept", key: "settings.trustAccept" },
];

/**
 * Sommaire (TOC) du menu gauche (L12) : sections RÉELLES, par thème. `labelKey` =
 * clé i18n résolue au rendu. SOURCE UNIQUE : ajouter une section = une entrée ici +
 * l'`id` correspondant sur le `.block` dans le JSX.
 */
interface SettingsSection {
  id: string;
  labelKey: string;
}
const SETTINGS_GROUPS: { labelKey: string; items: SettingsSection[] }[] = [
  {
    labelKey: "settings.groupGeneral",
    items: [
      { id: "set-interface", labelKey: "settings.sectionInterface" },
      { id: "set-police", labelKey: "settings.sectionFont" },
      { id: "set-charte", labelKey: "settings.sectionCharte" },
    ],
  },
  {
    labelKey: "settings.groupOps",
    items: [
      { id: "set-cockpit", labelKey: "settings.sectionCockpit" },
      { id: "set-ia", labelKey: "settings.sectionAi" },
      { id: "set-securite", labelKey: "settings.sectionSecurity" },
      { id: "set-maincourante", labelKey: "settings.sectionJournal" },
      { id: "set-adresse", labelKey: "settings.sectionAddress" },
      { id: "set-services", labelKey: "settings.sectionServices" },
      { id: "set-maj", labelKey: "settings.sectionUpdate" },
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
  /**
   * L34 — état du contrôle de mise à jour, porté par `useAppUpdate` chez App
   * (un seul exemplaire du hook pour toute l'app : le bandeau et cet écran
   * partagent la même machine à états). La vue reste présentationnelle : elle
   * reçoit l'état et remonte l'intention « vérifier ».
   */
  updateState?: UpdateState;
  /** Version installée ; `null` = non lisible → on affiche « inconnue », jamais un chiffre inventé. */
  appVersion?: string | null;
  /** Contrôle MANUEL (verbose) : l'erreur, elle, s'affiche. */
  onCheckUpdate?: () => void;
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
  updateState = { status: "idle" },
  appVersion = null,
  onCheckUpdate,
}: SettingsViewProps): JSX.Element {
  const { t } = useTranslation();
  const LANGS: { id: Lang; label: string }[] = [
    { id: "fr", label: t("settings.langFr") },
    { id: "en", label: t("settings.langEn") },
  ];
  // Options de segments : résolution i18n des libellés au rendu (id inchangé).
  const navPosOpts = NAV_POS.map((o) => ({ id: o.id, label: t(o.key) }));
  const densityOpts = DENSITY.map((o) => ({ id: o.id, label: t(o.key) }));
  const shapeOpts = SHAPE.map((o) => ({ id: o.id, label: t(o.key) }));
  const fontOpts = FONT.map((o) => ({ id: o.id, label: t(o.key) }));
  const supportOpts = SUPPORTS.map((o) => ({ id: o.id, label: t(o.key) }));
  const trustOpts = TRUST_MODES.map((o) => ({ id: o.id, label: t(o.key) }));
  const teamOpts = TEAM_IDS.map((id) => ({
    id,
    label: t(`teams.castingLabels.${id}`, { defaultValue: id }),
  }));
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
          ? t("settings.n8nResultMock")
          : t("settings.n8nResultOk", {
              provider: ack.provider,
              status: ack.http_status ?? "?",
            }),
      );
    } catch (e) {
      setN8nTestResult(
        t("settings.n8nResultFail", {
          error: e instanceof Error ? e.message : String(e),
        }),
      );
    } finally {
      setN8nTesting(false);
    }
  };

  return (
    <section className="view st" aria-label={t("settings.ariaLabel")}>
      <nav className="setnav" aria-label={t("settings.navAria")}>
        {SETTINGS_GROUPS.map((group) => (
          <div key={group.labelKey} className="setgroup">
            <h3>{t(group.labelKey)}</h3>
            {group.items.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`seti${activeSection === s.id ? " active" : ""}`}
                aria-current={activeSection === s.id ? "true" : undefined}
                onClick={() => gotoSection(s.id)}
              >
                {t(s.labelKey)}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="setmain">
        {/* ---------- GÉNÉRAUX (persistés) ---------- */}
        <div className="setpanel">
          <h1>{t("settings.generalTitle")}</h1>
          <p className="lead">{t("settings.generalLead")}</p>

          <div className="block" id="set-interface">
            <div className="bt">
              <h2>{t("settings.interfaceTitle")}</h2>
            </div>
            <div className="fieldrow">
              <div className="lab">
                <div className="t">{t("settings.navPosLabel")}</div>
                <div className="d">{t("settings.navPosDesc")}</div>
              </div>
              <div className="ctl">
                <Seg
                  options={navPosOpts}
                  value={settings.ui.navPos}
                  onChange={(v) => void settings.setUiPref("navPos", v)}
                />
              </div>
            </div>
            <div className="fieldrow">
              <div className="lab">
                <div className="t">{t("settings.densityLabel")}</div>
                <div className="d">{t("settings.densityDesc")}</div>
              </div>
              <div className="ctl">
                <Seg
                  options={densityOpts}
                  value={settings.ui.density}
                  onChange={(v) => void settings.setUiPref("density", v)}
                />
              </div>
            </div>
            <div className="fieldrow">
              <div className="lab">
                <div className="t">{t("settings.shapeLabel")}</div>
                <div className="d">{t("settings.shapeDesc")}</div>
              </div>
              <div className="ctl">
                <Seg
                  options={shapeOpts}
                  value={settings.ui.shape}
                  onChange={(v) => void settings.setUiPref("shape", v)}
                />
              </div>
            </div>
            <div className="fieldrow">
              <div className="lab">
                <div className="t">{t("settings.langLabel")}</div>
                <div className="d">{t("settings.langDesc")}</div>
              </div>
              <div className="ctl">
                <Seg
                  options={LANGS}
                  value={settings.lang}
                  onChange={(v) => void settings.setLang(v)}
                />
              </div>
            </div>
          </div>

          <div className="block" id="set-police">
            <div className="bt">
              <h2>{t("settings.fontTitle")}</h2>
            </div>
            <div className="fieldrow">
              <div className="lab">
                <div className="t">{t("settings.fontFamilyLabel")}</div>
                <div className="d">{t("settings.fontFamilyDesc")}</div>
              </div>
              <div className="ctl">
                <Seg
                  options={fontOpts}
                  value={settings.ui.fontFamily}
                  onChange={(v) => void settings.setUiPref("fontFamily", v)}
                />
              </div>
            </div>
            <div className="fieldrow">
              <div className="lab">
                <div className="t">{t("settings.fontScaleLabel")}</div>
                <div className="d">
                  {t("settings.fontScaleValue", { scale: settings.ui.fontScale })}
                </div>
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
                  aria-label={t("settings.fontScaleAria")}
                />
              </div>
            </div>
            {/* Taille du TERMINAL : réglage distinct de l'échelle ci-dessus, parce que xterm
                rend dans son propre canvas et ne suit pas `--fscale`. Même contrôle rapide
                disponible au-dessus du shell (barre d'onglets de la Table). */}
            <div className="fieldrow">
              <div className="lab">
                <div className="t">{t("settings.termFontLabel")}</div>
                <div className="d">{t("settings.termFontDesc")}</div>
              </div>
              <div className="ctl">
                <input
                  className="range"
                  type="range"
                  min={TERM_FONT_MIN}
                  max={TERM_FONT_MAX}
                  step={TERM_FONT_STEP}
                  value={settings.ui.termFontSize}
                  onChange={(e) =>
                    void settings.setUiPref(
                      "termFontSize",
                      clampTermFontSize(Number(e.target.value)),
                    )
                  }
                  aria-label={t("settings.termFontAria")}
                />
                <span className="rangeval">
                  {t("settings.termFontValue", {
                    size: settings.ui.termFontSize,
                  })}
                </span>
              </div>
            </div>
            {/* Interligne : indissociable de la taille. xterm vaut 1.0 par défaut, donc une
                police plus grande produit des lignes plus serrées EN PROPORTION — c'est ce
                qui rendait le shell illisible en grand. */}
            <div className="fieldrow">
              <div className="lab">
                <div className="t">{t("settings.termLineHeightLabel")}</div>
                <div className="d">{t("settings.termLineHeightDesc")}</div>
              </div>
              <div className="ctl">
                <input
                  className="range"
                  type="range"
                  min={TERM_LINE_HEIGHT_MIN}
                  max={TERM_LINE_HEIGHT_MAX}
                  step={TERM_LINE_HEIGHT_STEP}
                  value={settings.ui.termLineHeight}
                  onChange={(e) =>
                    void settings.setUiPref(
                      "termLineHeight",
                      clampTermLineHeight(Number(e.target.value)),
                    )
                  }
                  aria-label={t("settings.termLineHeightAria")}
                />
                <span className="rangeval">
                  {t("settings.termLineHeightValue", {
                    ratio: settings.ui.termLineHeight.toFixed(2),
                  })}
                </span>
              </div>
            </div>
          </div>

          <div className="block" id="set-charte">
            <div className="bt">
              <h2>{t("settings.charteTitle")}</h2>
            </div>
            <div className="themegrid">
              {CHARTES.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  className={`tcard${settings.theme === ch.id ? " sel" : ""}`}
                  aria-pressed={settings.theme === ch.id}
                  onClick={() => void settings.setTheme(ch.id)}
                >
                  <div className="swatch">
                    {ch.swatches.map((c, i) => (
                      <i key={i} style={{ background: c }} />
                    ))}
                  </div>
                  <div className="nm">{ch.name}</div>
                </button>
              ))}
            </div>

            <div className="fieldrow">
              <div className="lab">
                <div className="t">{t("settings.teamVignettesLabel")}</div>
                <div className="d">{t("settings.teamVignettesDesc")}</div>
              </div>
              <div className="ctl">
                <select
                  className="field"
                  value={settings.team}
                  aria-label={t("settings.teamVignettesAria")}
                  onChange={(e) => void settings.setTeam(e.target.value)}
                >
                  {teamOpts.map((o) => (
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
              <h2>{t("settings.cockpitTitle")}</h2>
            </div>

            <div className="fieldrow">
              <div className="lab">
                <div className="t">{t("settings.rootLabel")}</div>
                <div className="d">{t("settings.rootDesc")}</div>
              </div>
              <div className="ctl">
                <input
                  className="field"
                  type="text"
                  value={rootValue}
                  onChange={(e) => setRootDraft(e.target.value)}
                  aria-label={t("settings.rootAria")}
                />
                <button
                  type="button"
                  className="btn accent sm"
                  onClick={() => {
                    void settings.setRoot(rootValue).then(onRescan);
                  }}
                >
                  {t("settings.rootApply")}
                </button>
              </div>
            </div>
          </div>

          <div className="block" id="set-ia">
            <div className="bt">
              <h2>{t("settings.aiTitle")}</h2>
            </div>

            <div className="fieldrow">
              <div className="lab">
                <div className="t">{t("settings.aiEndpointLabel")}</div>
                <div className="d">{t("settings.aiEndpointDesc")}</div>
              </div>
              <div className="ctl">
                <input
                  className="field"
                  type="url"
                  placeholder="http://192.168.2.11:4000"
                  value={endpointValue}
                  onChange={(e) => setEndpointDraft(e.target.value)}
                  aria-label={t("settings.aiEndpointAria")}
                />
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => void settings.setLitellmEndpoint(endpointValue)}
                >
                  {t("common.save")}
                </button>
              </div>
            </div>

            <div className="fieldrow">
              <div className="lab">
                <div className="t">{t("settings.aiModelLabel")}</div>
                <div className="d">{t("settings.aiModelDesc")}</div>
              </div>
              <div className="ctl">
                <input
                  className="field"
                  type="text"
                  placeholder="llama3.1:8b"
                  value={modelValue}
                  onChange={(e) => setModelDraft(e.target.value)}
                  aria-label={t("settings.aiModelAria")}
                />
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => void settings.setLitellmModel(modelValue)}
                >
                  {t("common.save")}
                </button>
              </div>
            </div>

            <div className="fieldrow">
              <div className="lab">
                <div className="t">{t("settings.aiKeyLabel")}</div>
                <div className="d">
                  {t("settings.aiKeyDescPrefix")}
                  <strong>
                    {settings.aiKeySet
                      ? t("settings.aiKeySet")
                      : t("settings.aiKeyUnset")}
                  </strong>
                </div>
              </div>
              <div className="ctl">
                <input
                  className="field"
                  type="password"
                  placeholder={t("settings.aiKeyPlaceholder")}
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                  aria-label={t("settings.aiKeyAria")}
                />
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => {
                    void settings.setAiKey(keyDraft).then(() => setKeyDraft(""));
                  }}
                >
                  {t("common.save")}
                </button>
              </div>
            </div>
          </div>

          {/* TEAMS & AGENTS : sortis dans la vue dédiée « Teams » (L13). */}
          <div className="block" id="set-securite">
            <div className="bt">
              <h2>{t("settings.securityTitle")}</h2>
            </div>
            <p className="lead">
              <Trans
                i18nKey="settings.securityLead"
                components={[<strong />, <strong />, <strong />]}
              />
            </p>

            <div className="fieldrow">
              <div className="lab">
                <div className="t">{t("settings.allowlistLabel")}</div>
                <div className="d">
                  <code>--allowedTools</code>
                  {t("settings.allowlistDescPrefix")}
                  {DEFAULT_CHEF_ALLOWED_TOOLS}).
                </div>
              </div>
              <div className="ctl">
                <input
                  className="field"
                  type="text"
                  placeholder={DEFAULT_CHEF_ALLOWED_TOOLS}
                  value={chefToolsValue}
                  onChange={(e) => setChefToolsDraft(e.target.value)}
                  aria-label={t("settings.allowlistAria")}
                />
                <button
                  type="button"
                  className="btn sm"
                  onClick={() =>
                    void settings.setChefAllowedTools(chefToolsValue)
                  }
                >
                  {t("common.save")}
                </button>
              </div>
            </div>

            <div className="fieldrow">
              <div className="lab">
                <div className="t">{t("settings.trustLabel")}</div>
                <div className="d">{t("settings.trustDesc")}</div>
              </div>
              <div className="ctl">
                <Seg
                  options={trustOpts}
                  value={settings.chefTrustMode}
                  onChange={(v) => void settings.setChefTrustMode(v)}
                />
              </div>
            </div>

            <div className="fieldrow">
              <div className="lab">
                <div className="t">{t("settings.thoughtLabel")}</div>
                <div className="d">{t("settings.thoughtDesc")}</div>
              </div>
              <div className="ctl">
                <Seg
                  options={[
                    { id: "hidden", label: t("settings.thoughtHidden") },
                    { id: "shown", label: t("settings.thoughtShown") },
                  ]}
                  value={settings.hidePensee ? "hidden" : "shown"}
                  onChange={(v) => void settings.setHidePensee(v === "hidden")}
                />
              </div>
            </div>
          </div>

          <div className="block" id="set-maincourante">
            <div className="bt">
              <h2>{t("settings.journalTitle")}</h2>
            </div>

            <div className="fieldrow">
              <div className="lab">
                <div className="t">{t("settings.couchUrlLabel")}</div>
                <div className="d">{t("settings.couchUrlDesc")}</div>
              </div>
              <div className="ctl">
                <input
                  className="field"
                  type="url"
                  placeholder="http://192.168.2.11:5984"
                  value={couchUrlValue}
                  onChange={(e) => setCouchUrlDraft(e.target.value)}
                  aria-label={t("settings.couchUrlAria")}
                />
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => void settings.setCouchdbUrl(couchUrlValue)}
                >
                  {t("common.save")}
                </button>
              </div>
            </div>

            <div className="fieldrow">
              <div className="lab">
                <div className="t">{t("settings.couchDbLabel")}</div>
                <div className="d">{t("settings.couchDbDesc")}</div>
              </div>
              <div className="ctl">
                <input
                  className="field"
                  type="text"
                  placeholder="conversations"
                  value={couchDbValue}
                  onChange={(e) => setCouchDbDraft(e.target.value)}
                  aria-label={t("settings.couchDbAria")}
                />
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => void settings.setCouchdbDb(couchDbValue)}
                >
                  {t("common.save")}
                </button>
              </div>
            </div>

            <div className="fieldrow">
              <div className="lab">
                <div className="t">{t("settings.couchCredsLabel")}</div>
                <div className="d">
                  {t("settings.couchCredsDescPrefix")}
                  <strong>
                    {settings.couchCredsSet
                      ? t("settings.couchCredsSet")
                      : t("settings.couchCredsUnset")}
                  </strong>
                </div>
              </div>
              <div className="ctl">
                <input
                  className="field"
                  type="text"
                  placeholder={t("settings.couchUserPlaceholder")}
                  value={couchUserDraft}
                  onChange={(e) => setCouchUserDraft(e.target.value)}
                  aria-label={t("settings.couchUserAria")}
                />
                <input
                  className="field"
                  type="password"
                  placeholder={t("settings.couchPassPlaceholder")}
                  value={couchPassDraft}
                  onChange={(e) => setCouchPassDraft(e.target.value)}
                  aria-label={t("settings.couchPassAria")}
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
                  {t("common.save")}
                </button>
              </div>
            </div>
          </div>

          <div className="block" id="set-adresse">
            <div className="bt">
              <h2>{t("settings.addressTitle")}</h2>
            </div>
            <p className="lead">{t("settings.addressLead")}</p>

            <div className="fieldrow">
              <div className="lab">
                <div className="t">{t("settings.n8nUrlLabel")}</div>
                <div className="d">{t("settings.n8nUrlDesc")}</div>
              </div>
              <div className="ctl">
                <input
                  className="field"
                  type="url"
                  placeholder="http://localhost:5678/webhook/iakacockpit-adresse"
                  value={n8nUrlValue}
                  onChange={(e) => setN8nUrlDraft(e.target.value)}
                  aria-label={t("settings.n8nUrlAria")}
                />
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => void settings.setN8nWebhookUrl(n8nUrlValue)}
                >
                  {t("common.save")}
                </button>
              </div>
            </div>

            <div className="fieldrow">
              <div className="lab">
                <div className="t">{t("settings.n8nSupportLabel")}</div>
                <div className="d">{t("settings.n8nSupportDesc")}</div>
              </div>
              <div className="ctl">
                <Seg
                  options={supportOpts}
                  value={settings.n8nActiveSupport}
                  onChange={(v) => void settings.setN8nActiveSupport(v)}
                />
              </div>
            </div>

            <div className="fieldrow">
              <div className="lab">
                <div className="t">{t("settings.n8nTokenLabel")}</div>
                <div className="d">
                  {t("settings.n8nTokenDescPrefix")}
                  <code>X-API-Key</code>
                  {t("settings.n8nTokenDescSuffix")}
                  <strong>
                    {settings.n8nTokenSet
                      ? t("settings.n8nTokenSet")
                      : t("settings.n8nTokenUnset")}
                  </strong>
                </div>
              </div>
              <div className="ctl">
                <input
                  className="field"
                  type="password"
                  placeholder={t("settings.n8nTokenPlaceholder")}
                  value={n8nTokenDraft}
                  onChange={(e) => setN8nTokenDraft(e.target.value)}
                  aria-label={t("settings.n8nTokenAria")}
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
                  {t("common.save")}
                </button>
              </div>
            </div>

            <div className="fieldrow">
              <div className="lab">
                <div className="t">{t("settings.n8nTestLabel")}</div>
                <div className="d">{t("settings.n8nTestDesc")}</div>
              </div>
              <div className="ctl">
                <input
                  className="field"
                  type="text"
                  placeholder={t("settings.n8nCiblePlaceholder")}
                  value={n8nCibleDraft}
                  onChange={(e) => setN8nCibleDraft(e.target.value)}
                  aria-label={t("settings.n8nCibleAria")}
                />
                <input
                  className="field"
                  type="text"
                  placeholder={t("settings.n8nMsgPlaceholder")}
                  value={n8nMsgDraft}
                  onChange={(e) => setN8nMsgDraft(e.target.value)}
                  aria-label={t("settings.n8nMsgAria")}
                />
                <button
                  type="button"
                  className="btn accent sm"
                  disabled={n8nTesting}
                  aria-label={t("settings.n8nTestSendAria")}
                  title={t("settings.n8nTestSendAria")}
                  onClick={() => void runNotifyTest()}
                >
                  {n8nTesting
                    ? t("settings.n8nTestSending")
                    : t("settings.n8nTestSend")}
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
              <h2>{t("settings.servicesTitle")}</h2>
            </div>
            {services.length === 0 && (
              <div className="svcrow">{t("settings.servicesEmpty")}</div>
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
                    ? t("settings.serviceLatency", { ms: s.latency_ms ?? "?" })
                    : t("settings.serviceUnreachable")}
                </span>
              </div>
            ))}
          </div>

          {/* L34 — mises à jour. Le contrôle est MANUEL ici (verbose) : contrairement
              au contrôle au démarrage, l'échec s'affiche. L'endpoint est montré en
              clair : savoir d'où vient une mise à jour fait partie du contrat. */}
          <div className="block" id="set-maj">
            <div className="bt">
              <h2>{t("settings.updateTitle")}</h2>
            </div>

            <div className="fieldrow">
              <div className="lab">
                <div className="t">{t("settings.updateCurrentLabel")}</div>
                <div className="d">{t("settings.updateCurrentDesc")}</div>
              </div>
              <div className="ctl">
                <span>{appVersion ?? t("settings.updateCurrentUnknown")}</span>
              </div>
            </div>

            <div className="fieldrow">
              <div className="lab">
                <div className="t">{t("settings.updateCheckLabel")}</div>
                <div className="d">{t("settings.updateCheckDesc")}</div>
              </div>
              <div className="ctl">
                <button
                  type="button"
                  className="btn accent sm"
                  disabled={updateState.status === "checking"}
                  onClick={() => onCheckUpdate?.()}
                >
                  {updateState.status === "checking"
                    ? t("settings.updateChecking")
                    : t("settings.updateCheckAction")}
                </button>
              </div>
            </div>

            {updateState.status === "up-to-date" && (
              <div className="svcrow" role="status" aria-live="polite">
                {t("update.upToDate")}
              </div>
            )}
            {updateState.status === "available" && (
              <div className="svcrow" role="status" aria-live="polite">
                {t("update.available", { version: updateState.version })}
              </div>
            )}
            {/* `visible: false` = échec du contrôle AU DÉMARRAGE : il ne s'affiche
                nulle part (C2). Seul un contrôle demandé par l'utilisateur parle. */}
            {updateState.status === "error" && updateState.visible && (
              <div className="svcrow" role="status" aria-live="polite">
                {t("update.error", { message: updateState.message })}
              </div>
            )}

            <div className="fieldrow">
              <div className="lab">
                <div className="t">{t("settings.updateEndpointLabel")}</div>
              </div>
              <div className="ctl">
                <span style={{ color: "var(--text-3)" }}>
                  {primaryUpdateEndpoint() ?? "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
