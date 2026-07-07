import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { HandoffReception, HandoffBadge } from "../components/HandoffReception";
import type { UseHandoff } from "../hooks/useHandoff";
import type { HandoffProvenance } from "../handoff/receive";

function provenance(over: Partial<HandoffProvenance> = {}): HandoffProvenance {
  return {
    source: "forge",
    teamId: "iakaframe",
    teamName: "iakaframe",
    sourceVersion: "abcd1234",
    originHash: "abcd1234",
    deliveredAt: "2026-07-07T10:00:00.000Z",
    importedAt: "2026-07-07T11:00:00.000Z",
    localEdits: false,
    originTeamJson: "{}",
    ...over,
  };
}

function mockHandoff(over: Partial<UseHandoff> = {}): UseHandoff {
  return {
    deliveries: ["iakaframe"],
    loading: false,
    provenance: {},
    refresh: vi.fn().mockResolvedValue(undefined),
    importDelivery: vi.fn().mockResolvedValue({ status: "imported", teamId: "iakaframe", provenance: provenance() }),
    markLocalEdit: vi.fn().mockResolvedValue(undefined),
    provenanceFor: vi.fn().mockReturnValue(null),
    ...over,
  };
}

describe("HandoffBadge", () => {
  it("affiche « modifié localement » quand localEdits", () => {
    render(<HandoffBadge provenance={provenance({ localEdits: true })} />);
    expect(screen.getByText("modifié localement")).toBeTruthy();
  });

  it("affiche le badge forge sinon", () => {
    render(<HandoffBadge provenance={provenance()} />);
    expect(screen.getByText(/forge/)).toBeTruthy();
  });

  it("rien sans provenance", () => {
    const { container } = render(<HandoffBadge provenance={null} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("HandoffReception", () => {
  it("liste les livraisons et importe au clic", async () => {
    const handoff = mockHandoff();
    render(<HandoffReception handoff={handoff} />);
    fireEvent.click(screen.getByText("Importer"));
    await waitFor(() => expect(handoff.importDelivery).toHaveBeenCalledWith("iakaframe", undefined));
  });

  it("affiche le dialogue de conflit et permet « prendre la forge »", async () => {
    const existing = provenance({ localEdits: true, originHash: "aaaa1111" });
    const importDelivery = vi
      .fn()
      .mockResolvedValueOnce({
        status: "conflict",
        teamId: "iakaframe",
        existing,
        incoming: {
          source: "forge",
          teamId: "iakaframe",
          teamName: "iakaframe",
          version: "bbbb2222",
          timestamp: "2026-07-07T12:00:00.000Z",
          originHash: "bbbb2222",
        },
      })
      .mockResolvedValueOnce({ status: "imported", teamId: "iakaframe", provenance: provenance({ originHash: "bbbb2222" }) });
    const handoff = mockHandoff({
      importDelivery,
      provenanceFor: vi.fn().mockReturnValue(existing),
    });

    render(<HandoffReception handoff={handoff} />);
    // 1er import → conflit
    fireEvent.click(screen.getByText("Ré-importer"));
    await waitFor(() => expect(screen.getByRole("alertdialog")).toBeTruthy());
    expect(screen.getByText(/Conflit sur/)).toBeTruthy();

    // Résolution « prendre la forge »
    fireEvent.click(screen.getByText(/Prendre la version forge/));
    await waitFor(() => expect(importDelivery).toHaveBeenLastCalledWith("iakaframe", "take-forge"));
  });
});
