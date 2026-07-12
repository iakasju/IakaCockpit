import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ProjectCard, type AvatarMember } from "../components/ProjectCard";
import type { Project } from "../api/backend";

afterEach(cleanup);

const project = (over: Partial<Project> = {}): Project =>
  ({
    id: "iaka-demo",
    path: "~/work/iaka-demo",
    is_git: true,
    branch: "main",
    dirty: false,
    ahead: 0,
    behind: 0,
    last_commit_date: null,
    last_commit_subject: "feat: refonte de l'Étagère",
    version: null,
    description: null,
    backlog_remaining: null,
    backlog_next: null,
    work_status: "stable",
    ...over,
  }) as Project;

const avatars: AvatarMember[] = [
  { name: "Aragorn", royaume: "coordination", url: "/a.webp" },
  { name: "Gandalf", royaume: "architecture", url: null },
];

function renderCard(over: Partial<Parameters<typeof ProjectCard>[0]> = {}) {
  return render(
    <ProjectCard
      project={project()}
      live={false}
      avatars={avatars}
      tokens={148_200}
      ringPct={71}
      ringColor="hsl(35 60% 55%)"
      onRemove={vi.fn()}
      {...over}
    />,
  );
}

describe("ProjectCard — carte riche de la table (L21/A)", () => {
  it("rend nom, chemin et description = sujet du dernier commit", () => {
    renderCard();
    expect(screen.getByRole("heading", { name: "iaka-demo" })).toBeTruthy();
    expect(screen.getByText("~/work/iaka-demo")).toBeTruthy();
    expect(screen.getByText("feat: refonte de l'Étagère")).toBeTruthy();
  });

  it("chip statut : « au repos » si pas de conversation, « ● en cours » si vivante (AR-2)", () => {
    const { rerender } = renderCard({ live: false });
    expect(screen.getByText("au repos")).toBeTruthy();
    rerender(
      <ProjectCard
        project={project()}
        live={true}
        avatars={avatars}
        tokens={1000}
        ringPct={50}
        ringColor="x"
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByText("● en cours")).toBeTruthy();
  });

  it("description « — » si aucun commit (jamais inventée)", () => {
    renderCard({ project: project({ last_commit_subject: null }) });
    // desc + ring (sans tokens) peuvent tous deux afficher « — » : on vérifie ≥ 1.
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
  });

  it("anneau % + total tokens formatés (148,2k)", () => {
    renderCard({ tokens: 148_200, ringPct: 71 });
    expect(screen.getByText("71%")).toBeTruthy();
    expect(screen.getByText("148,2k")).toBeTruthy();
  });

  it("token absent → anneau neutre « — » et « — tokens » (zéro fausse donnée)", () => {
    renderCard({ tokens: null, ringPct: null });
    // Deux « — » attendus : anneau + total tokens.
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/%$/)).toBeNull();
  });

  it("avatars : image si URL, pastille (initiale) si URL absente", () => {
    renderCard();
    expect(screen.getByAltText("Aragorn")).toBeTruthy(); // url
    expect(screen.getByText("G")).toBeTruthy(); // pastille de repli (Gandalf)
  });

  it("plafonne les avatars et affiche +N", () => {
    const many: AvatarMember[] = Array.from({ length: 6 }, (_, i) => ({
      name: `Agent${i}`,
      royaume: "r",
      url: null,
    }));
    renderCard({ avatars: many });
    expect(screen.getByText("+2")).toBeTruthy(); // 6 - cap(4)
  });

  it("bouton « ranger » retire le projet de la table", () => {
    const onRemove = vi.fn();
    renderCard({ onRemove });
    fireEvent.click(screen.getByLabelText(/Ranger iaka-demo/));
    expect(onRemove).toHaveBeenCalledWith("iaka-demo");
  });
});

describe("ProjectCard — contenu enrichi F3 (description / next / méta)", () => {
  it("description dédiée rendue en gras (prioritaire sur le sujet de commit)", () => {
    renderCard({ project: project({ description: "Cockpit chapeau-rooted iakaProject" }) });
    const subject = screen.getByText("Cockpit chapeau-rooted iakaProject");
    expect(subject).toBeTruthy();
    expect(subject.tagName.toLowerCase()).toBe("b");
    // le sujet de commit n'est plus affiché quand la description existe
    expect(screen.queryByText("feat: refonte de l'Étagère")).toBeNull();
  });

  it("fallback : sujet de commit si description = null", () => {
    renderCard({ project: project({ description: null }) });
    expect(screen.getByText("feat: refonte de l'Étagère")).toBeTruthy();
  });

  it("ligne « next : » présente si backlog_next, absente sinon", () => {
    const { rerender } = renderCard({
      project: project({ backlog_next: "Câbler le runner ollama" }),
    });
    expect(screen.getByText(/next\s*:\s*Câbler le runner ollama/)).toBeTruthy();
    rerender(
      <ProjectCard
        project={project({ backlog_next: null })}
        live={false}
        avatars={avatars}
        tokens={1000}
        ringPct={50}
        ringColor="x"
        onRemove={vi.fn()}
      />,
    );
    expect(screen.queryByText(/^next\s*:/)).toBeNull();
  });

  it("méta version / retard / étapes affichée seulement si la donnée existe", () => {
    renderCard({
      project: project({ version: "v0.16.0", behind: 3, backlog_remaining: 2 }),
    });
    expect(screen.getByText("v0.16.0")).toBeTruthy();
    expect(screen.getByText("3 en retard")).toBeTruthy();
    expect(screen.getByText("2 étape(s) restante(s)")).toBeTruthy();
  });

  it("méta masquée quand la donnée est absente / nulle (zéro fausse donnée)", () => {
    renderCard({
      project: project({ version: null, behind: 0, backlog_remaining: null }),
    });
    expect(screen.queryByText(/v0\./)).toBeNull();
    expect(screen.queryByText(/en retard/)).toBeNull();
    expect(screen.queryByText(/restante/)).toBeNull();
  });
});

describe("ProjectCard — pastille d'urgence F4 (AR-7)", () => {
  /** Récupère la pastille d'urgence via sa classe (le rôle img est partagé avec
   *  les avatars → on cible le slot `.ic.urg` sans ambiguïté). */
  const urg = (container: HTMLElement): HTMLElement =>
    container.querySelector<HTMLElement>(".ic.urg")!;

  it("backlog absent (null) → niveau gris/neutre + libellé « pas de backlog »", () => {
    const { container } = renderCard({ project: project({ backlog_remaining: null }) });
    const dot = urg(container);
    expect(dot.className).toContain("urg-none");
    expect(dot.getAttribute("aria-label")).toMatch(/[Pp]as de backlog/);
    expect(dot.getAttribute("title")).toMatch(/[Pp]as de backlog/);
  });

  it("backlog tout coché (0) → niveau vert « done »", () => {
    const { container } = renderCard({ project: project({ backlog_remaining: 0 }) });
    const dot = urg(container);
    expect(dot.className).toContain("urg-done");
    expect(dot.getAttribute("aria-label")).toMatch(/rien en attente/);
  });

  it("1..4 étapes restantes → niveau ambre « mid »", () => {
    const { container } = renderCard({ project: project({ backlog_remaining: 3 }) });
    const dot = urg(container);
    expect(dot.className).toContain("urg-mid");
    expect(dot.getAttribute("aria-label")).toMatch(/3 étape\(s\) restante\(s\)/);
  });

  it(">= 5 étapes restantes → niveau rouge « high »", () => {
    const { container } = renderCard({ project: project({ backlog_remaining: 7 }) });
    const dot = urg(container);
    expect(dot.className).toContain("urg-high");
    expect(dot.getAttribute("aria-label")).toMatch(/Urgent/);
    expect(dot.getAttribute("aria-label")).toMatch(/7 étape\(s\) restante\(s\)/);
  });

  it("seuil : 4 → ambre, 5 → rouge", () => {
    const { container } = renderCard({ project: project({ backlog_remaining: 4 }) });
    expect(urg(container).className).toContain("urg-mid");
    cleanup();
    const r2 = renderCard({ project: project({ backlog_remaining: 5 }) });
    expect(urg(r2.container).className).toContain("urg-high");
  });

  it("Some(0) : pastille verte MAIS méta « N étapes restantes » masquée (non-régression F3)", () => {
    const { container } = renderCard({ project: project({ backlog_remaining: 0 }) });
    expect(urg(container).className).toContain("urg-done");
    // la méta reste masquée pour 0 (seule la pastille distingue 0 vs absent)
    expect(screen.queryByText(/restante/)).toBeNull();
  });

  it("vaut pour la variante atelier (shelf) comme pour la table", () => {
    const { container } = renderCard({
      project: project({ backlog_remaining: 7 }),
      variant: "shelf",
    });
    expect(urg(container).className).toContain("urg-high");
  });
});
