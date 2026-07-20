import { describe, it, expect } from "vitest";
import { computeTotals } from "./messages";
import type { MatchPlayer } from "@/lib/supabase/types";

function mp(over: Partial<MatchPlayer>): MatchPlayer {
  return {
    id: over.id ?? "x", match_id: "m", frequent_player_id: null,
    display_name: over.display_name ?? "P", amount_due: over.amount_due ?? 2200,
    amount_paid: over.amount_paid ?? 0, is_goalkeeper: false,
    payment_status: over.payment_status ?? "pendiente",
    attendance_status: "pendiente", confirmed_attendance_at: null,
    payment_method: null, note: null,
    reported_at: null, confirmed_at: null, paid_by_player_id: null, payment_proof_path: null, created_at: "",
  };
}

describe("computeTotals", () => {
  it("suma esperado, recaudado y pendiente correctamente", () => {
    const players = [
      mp({ payment_status: "confirmado" }),
      mp({ payment_status: "confirmado" }),
      mp({ payment_status: "reportado" }),
      mp({ payment_status: "pendiente" }),
      mp({ payment_status: "exonerado" }), // no cuenta al esperado
    ];
    const t = computeTotals(players);
    expect(t.total).toBe(5);
    expect(t.confirmed).toBe(2);
    expect(t.reported).toBe(1);
    expect(t.pending).toBe(1);
    expect(t.expected).toBe(2200 * 4); // 4 activos (exonerado no cuenta)
    expect(t.collected).toBe(2200 * 2); // 2 confirmados
    expect(t.remaining).toBe(2200 * 2);
  });

  it("pago parcial suma lo pagado", () => {
    const t = computeTotals([mp({ payment_status: "parcial", amount_paid: 1000 })]);
    expect(t.collected).toBe(1000);
    expect(t.remaining).toBe(1200);
  });
});
