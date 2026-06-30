import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ActivityTimeline } from "../components/ActivityTimeline";
import type { ProjectActivity } from "../api/backend";

afterEach(cleanup);

describe("ActivityTimeline — visu « travail passé » (L21 D)", () => {
  it("empty-state honnête si aucune activité (pas de bulle fantôme)", () => {
    const { container } = render(<ActivityTimeline activity={[]} />);
    expect(screen.getByText("Aucune activité mesurée.")).toBeTruthy();
    expect(container.querySelectorAll("circle")).toHaveLength(0);
  });

  it("un projet sans jour n'affiche aucune bulle", () => {
    const data: ProjectActivity[] = [{ project: "vide", days: [] }];
    const { container } = render(<ActivityTimeline activity={data} />);
    expect(screen.getByText("Aucune activité mesurée.")).toBeTruthy();
    expect(container.querySelectorAll("circle")).toHaveLength(0);
  });

  it("rend une bulle par jour réel, 1 ligne par projet", () => {
    const data: ProjectActivity[] = [
      {
        project: "iaka-demo",
        days: [
          { date: "2026-06-28", tokens: 18_000 },
          { date: "2026-06-30", tokens: 42_000 },
        ],
      },
    ];
    const { container } = render(<ActivityTimeline activity={data} />);
    expect(container.querySelectorAll("circle")).toHaveLength(2);
    // Label de la ligne = nom du projet.
    expect(screen.getByText("iaka-demo")).toBeTruthy();
  });
});
