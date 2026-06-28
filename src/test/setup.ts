/**
 * setup.ts — setup global vitest. Initialise i18next en **FR** (langue par défaut)
 * pour que `t("clé")` rende les chaînes FR comme en prod → les tests qui cherchent
 * des libellés FR (`getByText("Réglages")`…) passent sans réécriture massive.
 */
import "../i18n";
