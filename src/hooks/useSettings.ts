/**
 * useSettings — cockpit minimal + préférences UI PERSISTÉES (PO-2 tranché, D4-bis).
 *
 * Contrat de cycle (D4-bis) :
 *   - au montage : lecture EN UN APPEL via `configAll` (clés non sensibles) +
 *     `getRoot` ; application au DOM (attributs `data-*` sur <html> + `--fscale`) ;
 *   - défaut documenté si une clé est absente (pas d'échec) ;
 *   - à chaque changement : écriture via `configSet` PUIS application au DOM, de
 *     sorte qu'un réglage modifié survit au redémarrage (relu au montage suivant).
 *
 * Clés (D4-bis) — aucune ne matche `token|key|secret|password`, donc toutes
 * remontent par `configAll` (vérifié : ui_nav_pos, ui_density, ui_shape,
 * ui_font_family, ui_font_scale, theme, litellm_endpoint). AUCUN `invoke` direct.
 *
 * `applyDom` est injectable pour les tests (par défaut écrit sur
 * `document.documentElement`). Le rendu réel est piloté par CSS (`tokens.css`).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { backend, type Backend, type NotifySupport } from "../api/backend";
import { DEFAULT_LANG, parseLang, type Lang } from "../i18n";

export type NavPos = "left" | "right" | "split";
export type Density = "comfort" | "standard" | "compact";
export type Shape = "round" | "square";
export type FontFamily = "system" | "serif" | "mono-ui";

/**
 * Runner du chef-conversation (L10b/P3). `claude-code` = seul branché en L10 ;
 * `ollama`/`codex` = champs prévus pour l'extension (cible), NON sélectionnables.
 */
export type ChefRunnerKind = "claude-code" | "ollama" | "codex";

/**
 * Mode de trust du cwd du chef-runner (L10b/P3, miroir de `terminal::TrustMode`).
 * `inherit` = héritage parent trusté / dialogue natif ; `accept` = pré-acceptation
 * idempotente dans `~/.claude.json` (le dialogue ne bloque pas l'auto-lancement).
 */
export type ChefTrustMode = "inherit" | "accept";

export interface UiPrefs {
  navPos: NavPos;
  density: Density;
  shape: Shape;
  fontFamily: FontFamily;
  /** Échelle de police en % (ex. 100). */
  fontScale: number;
  /**
   * Taille de police du TERMINAL en px (xterm), indépendante de `fontScale`.
   *
   * Pourquoi une préférence à part et non l'échelle UI : xterm ne se met pas à l'échelle
   * par `--fscale` (il rend dans son propre canvas et calcule cols/rows à partir d'une
   * taille en px). Un facteur d'UI ne l'atteint donc pas — c'est exactement pourquoi le
   * shell restait petit alors que l'interface, elle, grossissait. Le confort de LECTURE
   * du terminal se règle aussi indépendamment de la densité de l'interface.
   */
  termFontSize: number;
}

/** Clés de config (D4-bis) — snake_case, namespacées `ui_`. */
export const CONFIG_KEYS = {
  navPos: "ui_nav_pos",
  density: "ui_density",
  shape: "ui_shape",
  fontFamily: "ui_font_family",
  fontScale: "ui_font_scale",
  /** Taille de police du terminal en px (non sensible : ne matche pas token|key|secret|password). */
  termFontSize: "ui_term_font_size",
  /** Langue de l'interface (i18n, FR défaut). */
  lang: "ui_lang",
  theme: "theme",
  /** Team de vignettes thémées (L9, façade ; `none` = pastilles texte seules). */
  team: "ui_team",
  litellmEndpoint: "litellm_endpoint",
  litellmModel: "litellm_model",
  couchdbUrl: "couchdb_url",
  couchdbDb: "couchdb_db",
  n8nWebhookUrl: "n8n_webhook_url",
  n8nActiveSupport: "n8n_active_support",
  /** Réglages GLOBAUX du chef-runner (L10b/P3) — miroir des clés `config.rs`. */
  chefRunnerKind: "chef_runner_kind",
  chefModel: "chef_model",
  chefAllowedTools: "chef_allowed_tools",
  chefTrustMode: "chef_trust_mode",
  /** Canal pensée masqué par défaut dans le chat (L10b/P3, persisté). */
  hidePensee: "ui_hide_pensee",
} as const;

/** Support de diffusion par défaut (L6, D2) si non configuré. */
export const DEFAULT_SUPPORT: NotifySupport = "slack";

/**
 * Bornes de la taille de police du terminal (px). En dessous de 8 le rendu xterm devient
 * illisible ; au-dessus de 32, un terminal de largeur usuelle tombe sous ~40 colonnes et les
 * TUI natives (Claude Code, Codex) cassent leur mise en page. Hors bornes → défaut.
 */
export const TERM_FONT_MIN = 8;
export const TERM_FONT_MAX = 32;
/** Pas des boutons de réglage rapide (Travail) et du curseur (Réglages). */
export const TERM_FONT_STEP = 1;

/** Borne une taille de terminal dans [TERM_FONT_MIN, TERM_FONT_MAX] (arrondie). */
export function clampTermFontSize(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_UI.termFontSize;
  return Math.min(TERM_FONT_MAX, Math.max(TERM_FONT_MIN, Math.round(value)));
}

/** Défauts documentés (appliqués si la clé est absente). */
export const DEFAULT_UI: UiPrefs = {
  // Direction A : rail d'icônes à GAUCHE par défaut (décision Stéphane). `right`
  // bascule le rail à droite, `split` le garde à gauche — réglables en Réglages.
  navPos: "left",
  density: "standard",
  shape: "round",
  fontFamily: "system",
  fontScale: 100,
  // Défaut INCHANGÉ (valeur historiquement codée en dur dans `PtyTerminal`) : ajouter le
  // réglage ne doit surprendre aucune configuration existante. Le confort se règle, il ne
  // se décrète pas à la place de l'utilisateur.
  termFontSize: 13,
};

// Direction A (redesign) : charte par défaut = studio-clair (clair, aéré, accent
// indigo). Les 10 chartes restent sélectionnables ; la grammaire A est
// charte-indépendante (marche sous toutes via les tokens).
export const DEFAULT_THEME = "studio-clair";

/**
 * Team de vignettes par défaut (L9). `lotr` = casting historique iakaframe
 * (homologues directs Odin/Aragorn/Gandalf/Gimli/Legolas). `none` désactive les
 * vignettes (pastilles texte seules) — zéro régression L8.
 */
export const DEFAULT_TEAM = "lotr";

// --- Défauts des réglages globaux du chef-runner (L10b/P3) ---
// Miroir des constantes Rust (`terminal.rs`) : le front les affiche comme défauts ;
// la VÉRITÉ d'exécution est côté Rust (`pty_runner_open` lit la config, fallback
// constantes). Vider un champ → le défaut Rust reprend.

/** Runner par défaut du chef (seul `claude-code` est branché/sélectionnable en L10). */
export const DEFAULT_CHEF_RUNNER_KIND: ChefRunnerKind = "claude-code";
/** Modèle par défaut du chef-runner (miroir `DEFAULT_CHEF_MODEL` Rust). */
export const DEFAULT_CHEF_MODEL = "claude-haiku-4-5";
/** Allowlist d'outils par défaut (miroir `CHEF_ALLOWED_TOOLS` Rust, arbitrage #2). */
export const DEFAULT_CHEF_ALLOWED_TOOLS = "Read,Glob,Grep,Bash";
/** Mode de trust par défaut (miroir `DEFAULT_TRUST_MODE` Rust). */
export const DEFAULT_CHEF_TRUST_MODE: ChefTrustMode = "inherit";
/** Canal pensée masqué par défaut (réduit le bruit du transcript). */
export const DEFAULT_HIDE_PENSEE = true;

export interface UseSettings {
  root: string | null;
  litellmEndpoint: string;
  /** Modèle/alias transmis tel quel à l'endpoint IA (L3, non sensible). */
  litellmModel: string;
  /** Une clé IA est-elle enregistrée au keychain ? (présence seule, jamais la valeur). */
  aiKeySet: boolean;
  /** URL CouchDB iakaboxlogs (L4, non sensible). */
  couchdbUrl: string;
  /** Base CouchDB iakaboxlogs (L4, non sensible). */
  couchdbDb: string;
  /** Des identifiants CouchDB sont-ils enregistrés au keychain ? (présence seule, L4). */
  couchCredsSet: boolean;
  /** URL du webhook n8n (canal adresse sortant, L6, non sensible). */
  n8nWebhookUrl: string;
  /** Support actif choisi côté Cockpit (L6, D2 — slack/discord/mqtt). */
  n8nActiveSupport: NotifySupport;
  /** Un token de webhook n8n est-il enregistré au keychain ? (présence seule, L6). */
  n8nTokenSet: boolean;
  theme: string;
  /** Langue de l'interface (i18n, FR défaut). App applique `changeLanguage`. */
  lang: Lang;
  /** Team de vignettes active (L9). `none` = pastilles texte seules. */
  team: string;
  /** Runner du chef-conversation (L10b/P3 ; `claude-code` seul branché en L10). */
  chefRunnerKind: ChefRunnerKind;
  /** Modèle du chef-runner (vide = défaut Rust ; non sensible, L10b/P3). */
  chefModel: string;
  /** Allowlist d'outils du chef-runner (`--allowedTools`, vide = défaut Rust). */
  chefAllowedTools: string;
  /** Mode de trust du cwd du chef-runner (L10b/P3). */
  chefTrustMode: ChefTrustMode;
  /** Le canal pensée est-il masqué dans le chat ? (L10b/P3, persisté). */
  hidePensee: boolean;
  ui: UiPrefs;
  loaded: boolean;
  setRoot: (root: string) => Promise<void>;
  setLitellmEndpoint: (url: string) => Promise<void>;
  setLitellmModel: (model: string) => Promise<void>;
  /** Écrit (vide = retire) la clé IA au keychain ; met à jour `aiKeySet`. */
  setAiKey: (value: string) => Promise<void>;
  /** Persiste l'URL CouchDB (config non sensible, L4). */
  setCouchdbUrl: (url: string) => Promise<void>;
  /** Persiste la base CouchDB (config non sensible, L4). */
  setCouchdbDb: (db: string) => Promise<void>;
  /** Écrit (password vide = retire) les identifiants CouchDB au keychain ; met à jour `couchCredsSet` (L4). */
  setCouchCredentials: (user: string, password: string) => Promise<void>;
  /** Persiste l'URL du webhook n8n (config non sensible, L6). */
  setN8nWebhookUrl: (url: string) => Promise<void>;
  /** Persiste le support actif (config non sensible, L6, D2). */
  setN8nActiveSupport: (support: NotifySupport) => Promise<void>;
  /** Écrit (vide = retire) le token du webhook n8n au keychain ; met à jour `n8nTokenSet` (L6). */
  setN8nToken: (value: string) => Promise<void>;
  setTheme: (id: string) => Promise<void>;
  /** Persiste la langue de l'interface (i18n, config non sensible ui_lang). */
  setLang: (lng: Lang) => Promise<void>;
  /** Persiste la team de vignettes (L9, config non sensible ui_team). */
  setTeam: (team: string) => Promise<void>;
  /** Persiste le runner du chef (L10b/P3, config non sensible). */
  setChefRunnerKind: (kind: ChefRunnerKind) => Promise<void>;
  /** Persiste le modèle du chef-runner (L10b/P3, config non sensible). */
  setChefModel: (model: string) => Promise<void>;
  /** Persiste l'allowlist d'outils du chef-runner (L10b/P3, config non sensible). */
  setChefAllowedTools: (tools: string) => Promise<void>;
  /** Persiste le mode de trust du cwd (L10b/P3, config non sensible). */
  setChefTrustMode: (mode: ChefTrustMode) => Promise<void>;
  /** Persiste l'état masqué/visible du canal pensée (L10b/P3). */
  setHidePensee: (hide: boolean) => Promise<void>;
  setUiPref: <K extends keyof UiPrefs>(
    key: K,
    value: UiPrefs[K],
  ) => Promise<void>;
}

/** Cible d'application des attributs (DOM réel par défaut, mockable en test). */
export interface DomTarget {
  setAttribute: (name: string, value: string) => void;
  style: { setProperty: (name: string, value: string) => void };
}

function defaultDomTarget(): DomTarget | null {
  if (typeof document === "undefined") return null;
  return document.documentElement;
}

/** Applique le thème + les préférences UI au DOM (attributs + variable CSS). */
export function applyToDom(
  target: DomTarget | null,
  theme: string,
  ui: UiPrefs,
): void {
  if (!target) return;
  target.setAttribute("data-theme", theme);
  target.setAttribute("data-navpos", ui.navPos);
  target.setAttribute("data-density", ui.density);
  target.setAttribute("data-shape", ui.shape);
  target.setAttribute("data-font", ui.fontFamily);
  target.style.setProperty("--fscale", String(ui.fontScale / 100));
}

/** Parse une valeur de config en `UiPrefs` partiel valide (ignore l'invalide). */
export function parsePrefsExport(cfg: Record<string, string>): UiPrefs {
  return parsePrefs(cfg);
}

/** Valide une valeur de support (L6) ; retombe sur le défaut si invalide/absente. */
export function parseSupport(value: string | undefined): NotifySupport {
  return value === "slack" || value === "discord" || value === "mqtt"
    ? value
    : DEFAULT_SUPPORT;
}

/** Valide le runner du chef (L10b/P3) ; défaut si invalide/absent. */
export function parseRunnerKind(value: string | undefined): ChefRunnerKind {
  return value === "claude-code" || value === "ollama" || value === "codex"
    ? value
    : DEFAULT_CHEF_RUNNER_KIND;
}

/** Valide le mode de trust (L10b/P3) ; défaut `inherit` si invalide/absent. */
export function parseTrustMode(value: string | undefined): ChefTrustMode {
  return value === "accept" ? "accept" : DEFAULT_CHEF_TRUST_MODE;
}

function parsePrefs(cfg: Record<string, string>): UiPrefs {
  const ui: UiPrefs = { ...DEFAULT_UI };
  const nav = cfg[CONFIG_KEYS.navPos];
  if (nav === "left" || nav === "right" || nav === "split") ui.navPos = nav;
  const den = cfg[CONFIG_KEYS.density];
  if (den === "comfort" || den === "standard" || den === "compact")
    ui.density = den;
  const sh = cfg[CONFIG_KEYS.shape];
  if (sh === "round" || sh === "square") ui.shape = sh;
  const ff = cfg[CONFIG_KEYS.fontFamily];
  if (ff === "system" || ff === "serif" || ff === "mono-ui") ui.fontFamily = ff;
  const fs = Number(cfg[CONFIG_KEYS.fontScale]);
  if (Number.isFinite(fs) && fs >= 50 && fs <= 200) ui.fontScale = fs;
  const tfs = Number(cfg[CONFIG_KEYS.termFontSize]);
  if (Number.isFinite(tfs) && tfs >= TERM_FONT_MIN && tfs <= TERM_FONT_MAX)
    ui.termFontSize = tfs;
  return ui;
}

export interface UseSettingsDeps {
  api?: Backend;
  dom?: DomTarget | null;
}

export function useSettings(deps: UseSettingsDeps = {}): UseSettings {
  const api = deps.api ?? backend;
  // `dom` est résolu une fois (évite de relire le DOM à chaque rendu).
  const domRef = useRef<DomTarget | null>(
    deps.dom !== undefined ? deps.dom : defaultDomTarget(),
  );

  const [root, setRootState] = useState<string | null>(null);
  const [theme, setThemeState] = useState<string>(DEFAULT_THEME);
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);
  const [team, setTeamState] = useState<string>(DEFAULT_TEAM);
  const [litellmEndpoint, setLitellmState] = useState<string>("");
  const [litellmModel, setLitellmModelState] = useState<string>("");
  const [aiKeySet, setAiKeySet] = useState<boolean>(false);
  const [couchdbUrl, setCouchdbUrlState] = useState<string>("");
  const [couchdbDb, setCouchdbDbState] = useState<string>("");
  const [couchCredsSet, setCouchCredsSet] = useState<boolean>(false);
  const [n8nWebhookUrl, setN8nWebhookUrlState] = useState<string>("");
  const [n8nActiveSupport, setN8nActiveSupportState] =
    useState<NotifySupport>(DEFAULT_SUPPORT);
  const [n8nTokenSet, setN8nTokenSet] = useState<boolean>(false);
  const [chefRunnerKind, setChefRunnerKindState] = useState<ChefRunnerKind>(
    DEFAULT_CHEF_RUNNER_KIND,
  );
  const [chefModel, setChefModelState] = useState<string>("");
  const [chefAllowedTools, setChefAllowedToolsState] = useState<string>("");
  const [chefTrustMode, setChefTrustModeState] = useState<ChefTrustMode>(
    DEFAULT_CHEF_TRUST_MODE,
  );
  const [hidePensee, setHidePenseeState] = useState<boolean>(DEFAULT_HIDE_PENSEE);
  const [ui, setUi] = useState<UiPrefs>(DEFAULT_UI);
  const [loaded, setLoaded] = useState<boolean>(false);

  // Lecture initiale + application au DOM (D4-bis).
  useEffect(() => {
    let cancelled = false;
    (async (): Promise<void> => {
      let cfg: Record<string, string> = {};
      let r: string | null = null;
      try {
        cfg = await api.configAll();
      } catch {
        cfg = {};
      }
      try {
        r = await api.getRoot();
      } catch {
        r = null;
      }
      // Présence d'une clé IA (keychain) : best-effort, jamais la valeur (D4).
      let keySet = false;
      try {
        keySet = await api.aiHasKey();
      } catch {
        keySet = false;
      }
      // Présence d'identifiants CouchDB (keychain) : best-effort, jamais la valeur (L4/D4).
      let couchSet = false;
      try {
        couchSet = await api.couchHasCredentials();
      } catch {
        couchSet = false;
      }
      // Présence d'un token webhook n8n (keychain) : best-effort, jamais la valeur (L6/D3).
      let n8nTokenPresent = false;
      try {
        n8nTokenPresent = await api.n8nHasToken();
      } catch {
        n8nTokenPresent = false;
      }
      if (cancelled) return;
      const nextUi = parsePrefs(cfg);
      const nextTheme = cfg[CONFIG_KEYS.theme] || DEFAULT_THEME;
      const nextTeam = cfg[CONFIG_KEYS.team] || DEFAULT_TEAM;
      setUi(nextUi);
      setThemeState(nextTheme);
      setLangState(parseLang(cfg[CONFIG_KEYS.lang]));
      setTeamState(nextTeam);
      setLitellmState(cfg[CONFIG_KEYS.litellmEndpoint] ?? "");
      setLitellmModelState(cfg[CONFIG_KEYS.litellmModel] ?? "");
      setAiKeySet(keySet);
      setCouchdbUrlState(cfg[CONFIG_KEYS.couchdbUrl] ?? "");
      setCouchdbDbState(cfg[CONFIG_KEYS.couchdbDb] ?? "");
      setCouchCredsSet(couchSet);
      setN8nWebhookUrlState(cfg[CONFIG_KEYS.n8nWebhookUrl] ?? "");
      setN8nActiveSupportState(parseSupport(cfg[CONFIG_KEYS.n8nActiveSupport]));
      setN8nTokenSet(n8nTokenPresent);
      // Réglages chef-runner (L10b/P3) : non sensibles, lus avec configAll.
      setChefRunnerKindState(parseRunnerKind(cfg[CONFIG_KEYS.chefRunnerKind]));
      setChefModelState(cfg[CONFIG_KEYS.chefModel] ?? "");
      setChefAllowedToolsState(cfg[CONFIG_KEYS.chefAllowedTools] ?? "");
      setChefTrustModeState(parseTrustMode(cfg[CONFIG_KEYS.chefTrustMode]));
      setHidePenseeState(
        cfg[CONFIG_KEYS.hidePensee] !== undefined
          ? cfg[CONFIG_KEYS.hidePensee] === "true"
          : DEFAULT_HIDE_PENSEE,
      );
      setRootState(r);
      applyToDom(domRef.current, nextTheme, nextUi);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  const setRoot = useCallback(
    async (next: string): Promise<void> => {
      await api.setRoot(next);
      setRootState(next);
    },
    [api],
  );

  const setLitellmEndpoint = useCallback(
    async (url: string): Promise<void> => {
      await api.configSet(CONFIG_KEYS.litellmEndpoint, url);
      setLitellmState(url);
    },
    [api],
  );

  const setLitellmModel = useCallback(
    async (model: string): Promise<void> => {
      await api.configSet(CONFIG_KEYS.litellmModel, model);
      setLitellmModelState(model);
    },
    [api],
  );

  const setAiKey = useCallback(
    async (value: string): Promise<void> => {
      // Write-only : on n'apprend jamais la valeur, seulement la présence (D4).
      await api.aiSetKey(value);
      setAiKeySet(value.trim().length > 0);
    },
    [api],
  );

  const setCouchdbUrl = useCallback(
    async (url: string): Promise<void> => {
      await api.configSet(CONFIG_KEYS.couchdbUrl, url);
      setCouchdbUrlState(url);
    },
    [api],
  );

  const setCouchdbDb = useCallback(
    async (db: string): Promise<void> => {
      await api.configSet(CONFIG_KEYS.couchdbDb, db);
      setCouchdbDbState(db);
    },
    [api],
  );

  const setCouchCredentials = useCallback(
    async (user: string, password: string): Promise<void> => {
      // Write-only (L4/D4) : présence seule, jamais la valeur. Password vide = retire.
      await api.couchSetCredentials(user, password);
      setCouchCredsSet(password.trim().length > 0);
    },
    [api],
  );

  const setN8nWebhookUrl = useCallback(
    async (url: string): Promise<void> => {
      await api.configSet(CONFIG_KEYS.n8nWebhookUrl, url);
      setN8nWebhookUrlState(url);
    },
    [api],
  );

  const setN8nActiveSupport = useCallback(
    async (support: NotifySupport): Promise<void> => {
      await api.configSet(CONFIG_KEYS.n8nActiveSupport, support);
      setN8nActiveSupportState(support);
    },
    [api],
  );

  const setN8nToken = useCallback(
    async (value: string): Promise<void> => {
      // Write-only (L6/D3) : présence seule, jamais la valeur. Vide = retire.
      await api.n8nSetToken(value);
      setN8nTokenSet(value.trim().length > 0);
    },
    [api],
  );

  const setTheme = useCallback(
    async (id: string): Promise<void> => {
      await api.configSet(CONFIG_KEYS.theme, id);
      setThemeState(id);
      applyToDom(domRef.current, id, ui);
    },
    [api, ui],
  );

  const setLang = useCallback(
    async (lng: Lang): Promise<void> => {
      // Config non sensible (ui_lang) ; App applique `i18n.changeLanguage(lang)`.
      await api.configSet(CONFIG_KEYS.lang, lng);
      setLangState(lng);
    },
    [api],
  );

  const setTeam = useCallback(
    async (next: string): Promise<void> => {
      // Config non sensible (ui_team) ; pas d'application DOM (le rendu lit `team`).
      await api.configSet(CONFIG_KEYS.team, next);
      setTeamState(next);
    },
    [api],
  );

  const setChefRunnerKind = useCallback(
    async (kind: ChefRunnerKind): Promise<void> => {
      await api.configSet(CONFIG_KEYS.chefRunnerKind, kind);
      setChefRunnerKindState(kind);
    },
    [api],
  );

  const setChefModel = useCallback(
    async (model: string): Promise<void> => {
      await api.configSet(CONFIG_KEYS.chefModel, model);
      setChefModelState(model);
    },
    [api],
  );

  const setChefAllowedTools = useCallback(
    async (tools: string): Promise<void> => {
      await api.configSet(CONFIG_KEYS.chefAllowedTools, tools);
      setChefAllowedToolsState(tools);
    },
    [api],
  );

  const setChefTrustMode = useCallback(
    async (mode: ChefTrustMode): Promise<void> => {
      await api.configSet(CONFIG_KEYS.chefTrustMode, mode);
      setChefTrustModeState(mode);
    },
    [api],
  );

  const setHidePensee = useCallback(
    async (hide: boolean): Promise<void> => {
      await api.configSet(CONFIG_KEYS.hidePensee, String(hide));
      setHidePenseeState(hide);
    },
    [api],
  );

  const setUiPref = useCallback(
    async <K extends keyof UiPrefs>(
      key: K,
      value: UiPrefs[K],
    ): Promise<void> => {
      const next: UiPrefs = { ...ui, [key]: value };
      const cfgKey =
        key === "navPos"
          ? CONFIG_KEYS.navPos
          : key === "density"
            ? CONFIG_KEYS.density
            : key === "shape"
              ? CONFIG_KEYS.shape
              : key === "fontFamily"
                ? CONFIG_KEYS.fontFamily
                : key === "termFontSize"
                  ? CONFIG_KEYS.termFontSize
                  : CONFIG_KEYS.fontScale;
      await api.configSet(cfgKey, String(value));
      setUi(next);
      applyToDom(domRef.current, theme, next);
    },
    [api, ui, theme],
  );

  return useMemo(
    () => ({
      root,
      litellmEndpoint,
      litellmModel,
      aiKeySet,
      couchdbUrl,
      couchdbDb,
      couchCredsSet,
      n8nWebhookUrl,
      n8nActiveSupport,
      n8nTokenSet,
      theme,
      lang,
      team,
      chefRunnerKind,
      chefModel,
      chefAllowedTools,
      chefTrustMode,
      hidePensee,
      ui,
      loaded,
      setRoot,
      setLitellmEndpoint,
      setLitellmModel,
      setAiKey,
      setCouchdbUrl,
      setCouchdbDb,
      setCouchCredentials,
      setN8nWebhookUrl,
      setN8nActiveSupport,
      setN8nToken,
      setTheme,
      setLang,
      setTeam,
      setChefRunnerKind,
      setChefModel,
      setChefAllowedTools,
      setChefTrustMode,
      setHidePensee,
      setUiPref,
    }),
    [
      root,
      litellmEndpoint,
      litellmModel,
      aiKeySet,
      couchdbUrl,
      couchdbDb,
      couchCredsSet,
      n8nWebhookUrl,
      n8nActiveSupport,
      n8nTokenSet,
      theme,
      lang,
      team,
      chefRunnerKind,
      chefModel,
      chefAllowedTools,
      chefTrustMode,
      hidePensee,
      ui,
      loaded,
      setRoot,
      setLitellmEndpoint,
      setLitellmModel,
      setAiKey,
      setCouchdbUrl,
      setCouchdbDb,
      setCouchCredentials,
      setN8nWebhookUrl,
      setN8nActiveSupport,
      setN8nToken,
      setTheme,
      setLang,
      setTeam,
      setChefRunnerKind,
      setChefModel,
      setChefAllowedTools,
      setChefTrustMode,
      setHidePensee,
      setUiPref,
    ],
  );
}
