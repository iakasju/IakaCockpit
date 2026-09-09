// deps-linux.test.mjs — GARDE STATIQUE NEUVE (AR-Y5(a)), CONVERGENCE-RELEASE-YML-ALIGNEMENT.
//
// Trois assertions, chacune temoin positif + contrefactuel NOMME (jamais un vert muet) :
//   (i)   le workflow ne porte AUCUN paquet apt en dur ;
//   (ii)  `.github/deps-linux.txt` existe, est non vide, une entree par ligne ;
//   (iii) `.github/deps-linux.txt` n'est PAS inscrit au registre de convergence.
//
// VERROU ANTI-TEMOIN-VIDE (R-5) : le nom de paquet utilise pour le contrefactuel (i) est
// FICTIF et absent des DEUX `deps-linux.txt` reels (Cockpit ET GUI) — un nom reel comme
// `libgtk-3-dev` figure DEJA dans les deux fichiers, et un mecanisme qui croiserait par erreur
// la detection avec le contenu de ces fichiers resterait vert quoi qu'il arrive. Meme discipline
// que le `fantome-de-vitrine` de L42-F1 : ce depot a paye ce defaut plusieurs fois, il ne le
// rejoue pas ici. Une premiere assertion verifie que ce nom n'est PAS deja detecte AVANT la
// mutation.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  estInscritAuRegistre,
  lireDeps,
  paquetsEnDurDansWorkflow,
} from "../lib/deps-linux.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CHEMIN_WORKFLOW = ".github/workflows/release.yml";
const CHEMIN_DEPS = ".github/deps-linux.txt";
const CHEMIN_REGISTRE = "fixtures/convergence.sha256";

const WORKFLOW = readFileSync(resolve(ROOT, CHEMIN_WORKFLOW), "utf8");
const DEPS_TEXTE = readFileSync(resolve(ROOT, CHEMIN_DEPS), "utf8");
const REGISTRE_TEXTE = readFileSync(resolve(ROOT, CHEMIN_REGISTRE), "utf8");

// Nom FICTIF, absent par construction des deux `deps-linux.txt` reels (Cockpit : 8 entrees,
// GUI : 5 entrees, aucune ne porte ce nom).
const PAQUET_FANTOME = "libfoo-inexistant-fantome-dev";

describe("deps-linux — (i) aucun paquet apt en dur dans le workflow", () => {
  it("TEMOIN POSITIF — le workflow reel ne porte aucun paquet apt en dur (lit .github/deps-linux.txt via xargs)", () => {
    expect(paquetsEnDurDansWorkflow(WORKFLOW)).toEqual([]);
  });

  it("VERROU ANTI-TEMOIN-VIDE — le paquet fantome n'est pas deja detecte avant mutation", () => {
    expect(paquetsEnDurDansWorkflow(WORKFLOW)).not.toContain(PAQUET_FANTOME);
    expect(lireDeps(DEPS_TEXTE)).not.toContain(PAQUET_FANTOME);
  });

  it("CONTREFACTUEL — reintroduire un paquet en dur est detecte et NOMME", () => {
    const mute = WORKFLOW.replace(
      "xargs -r -a .github/deps-linux.txt sudo apt-get install -y",
      `xargs -r -a .github/deps-linux.txt sudo apt-get install -y\n          sudo apt-get install -y ${PAQUET_FANTOME}`,
    );
    expect(mute).not.toBe(WORKFLOW);
    const paquets = paquetsEnDurDansWorkflow(mute);
    expect(paquets, `paquets detectes : ${JSON.stringify(paquets)}`).toContain(PAQUET_FANTOME);
  });
});

describe("deps-linux — (ii) .github/deps-linux.txt existe, non vide, une entree par ligne", () => {
  it("TEMOIN POSITIF — le fichier reel n'est pas vide et chaque ligne utile est un nom de paquet", () => {
    const paquets = lireDeps(DEPS_TEXTE);
    expect(paquets.length).toBeGreaterThan(0);
    for (const p of paquets) {
      expect(p, `ligne suspecte : "${p}"`).toMatch(/^[a-zA-Z0-9][a-zA-Z0-9.+-]*$/);
    }
  });

  it("CONTREFACTUEL — un fichier VIDE rend lireDeps([]) — c'est exactement la violation que AR-Y5(ii) nomme", () => {
    expect(lireDeps("")).toEqual([]);
    expect(lireDeps("\n\n   \n")).toEqual([]);
    // les commentaires seuls comptent aussi comme "vide" au sens utile (aucune dependance) :
    expect(lireDeps("# rien que des commentaires\n# ici\n")).toEqual([]);
  });
});

describe("deps-linux — (iii) .github/deps-linux.txt n'est PAS au registre de convergence", () => {
  it("TEMOIN POSITIF — le registre reel ne cite pas .github/deps-linux.txt", () => {
    expect(estInscritAuRegistre(REGISTRE_TEXTE, CHEMIN_DEPS)).toBe(false);
  });

  it("CONTREFACTUEL — si le fichier etait inscrit au registre, ce serait detecte et NOMME", () => {
    const FAUX_SHA256 = "ab".repeat(32); // 64 caracteres hex, forme valide d'une empreinte
    const faux = REGISTRE_TEXTE + `\n${FAUX_SHA256}  ${CHEMIN_DEPS}\n`;
    expect(estInscritAuRegistre(faux, CHEMIN_DEPS)).toBe(true);
  });
});
