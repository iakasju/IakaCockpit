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
