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
import { backend, type Backend } from "../api/backend";

export type NavPos = "left" | "right" | "split";
export type Density = "comfort" | "standard" | "compact";
export type Shape = "round" | "square";
export type FontFamily = "system" | "serif" | "mono-ui";

export interface UiPrefs {
  navPos: NavPos;
  density: Density;
  shape: Shape;
  fontFamily: FontFamily;
  /** Échelle de police en % (ex. 100). */
  fontScale: number;
}

/** Clés de config (D4-bis) — snake_case, namespacées `ui_`. */
export const CONFIG_KEYS = {
  navPos: "ui_nav_pos",
  density: "ui_density",
  shape: "ui_shape",
  fontFamily: "ui_font_family",
  fontScale: "ui_font_scale",
  theme: "theme",
  litellmEndpoint: "litellm_endpoint",
  litellmModel: "litellm_model",
  couchdbUrl: "couchdb_url",
  couchdbDb: "couchdb_db",
} as const;

/** Défauts documentés (appliqués si la clé est absente). */
export const DEFAULT_UI: UiPrefs = {
  navPos: "split",
  density: "standard",
  shape: "round",
  fontFamily: "system",
  fontScale: 100,
};

export const DEFAULT_THEME = "naonedge-dark";

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
  theme: string;
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
  setTheme: (id: string) => Promise<void>;
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
  const [litellmEndpoint, setLitellmState] = useState<string>("");
  const [litellmModel, setLitellmModelState] = useState<string>("");
  const [aiKeySet, setAiKeySet] = useState<boolean>(false);
  const [couchdbUrl, setCouchdbUrlState] = useState<string>("");
  const [couchdbDb, setCouchdbDbState] = useState<string>("");
  const [couchCredsSet, setCouchCredsSet] = useState<boolean>(false);
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
      if (cancelled) return;
      const nextUi = parsePrefs(cfg);
      const nextTheme = cfg[CONFIG_KEYS.theme] || DEFAULT_THEME;
      setUi(nextUi);
      setThemeState(nextTheme);
      setLitellmState(cfg[CONFIG_KEYS.litellmEndpoint] ?? "");
      setLitellmModelState(cfg[CONFIG_KEYS.litellmModel] ?? "");
      setAiKeySet(keySet);
      setCouchdbUrlState(cfg[CONFIG_KEYS.couchdbUrl] ?? "");
      setCouchdbDbState(cfg[CONFIG_KEYS.couchdbDb] ?? "");
      setCouchCredsSet(couchSet);
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

  const setTheme = useCallback(
    async (id: string): Promise<void> => {
      await api.configSet(CONFIG_KEYS.theme, id);
      setThemeState(id);
      applyToDom(domRef.current, id, ui);
    },
    [api, ui],
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
      theme,
      ui,
      loaded,
      setRoot,
      setLitellmEndpoint,
      setLitellmModel,
      setAiKey,
      setCouchdbUrl,
      setCouchdbDb,
      setCouchCredentials,
      setTheme,
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
      theme,
      ui,
      loaded,
      setRoot,
      setLitellmEndpoint,
      setLitellmModel,
      setAiKey,
      setCouchdbUrl,
      setCouchdbDb,
      setCouchCredentials,
      setTheme,
      setUiPref,
    ],
  );
}
