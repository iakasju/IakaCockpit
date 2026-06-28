/**
 * i18n — initialisation react-i18next (FR défaut + EN). MVP : un seul namespace
 * `translation`, ressources BUNDLÉES (`fr`/`en`), AUCUNE ressource distante (CSP
 * `'self'` intacte). La langue active est pilotée par la config `ui_lang` via
 * `useSettings` (App applique `i18n.changeLanguage`). Initialisé en `fr` au boot ;
 * importé une fois dans `main.tsx` AVANT le rendu (et dans le setup de test).
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { fr } from "./locales/fr";
import { en } from "./locales/en";

/** Langues supportées (MVP). */
export const SUPPORTED_LANGS = ["fr", "en"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

/** Langue par défaut (décision Stéphane). */
export const DEFAULT_LANG: Lang = "fr";

/** Valide une valeur de langue ; retombe sur le défaut si invalide/absente. */
export function parseLang(value: string | undefined): Lang {
  return value === "en" ? "en" : DEFAULT_LANG;
}

// Init synchrone (idempotent : `init` n'est appelé qu'une fois par module).
if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
    },
    lng: DEFAULT_LANG,
    fallbackLng: DEFAULT_LANG,
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}

export default i18n;
