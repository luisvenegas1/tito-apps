import { describe, it, expect } from "vitest";
import { playerBalance, BalanceRow } from "./balances";
import { playerDebtMessage, groupDebtMessage } from "./collection";

const row = (o: Partial<BalanceRow>): BalanceRow => ({
  match_id: o.match_id ?? "m", label: o.label ?? "Mejenga",
  amount_due: o.amount_due ?? 2200, amount_paid: o.amount_paid ?? 0,
  payment_status: o.payment_status ?? "pendiente",
});

describe("playerBalance", () => {
  it("arrastra deuda de varias fechas sin duplicar", () => {
    const b = playerBalance([
      row({ label: "F1", payment_status: "confirmado", amount_paid: 2200 }),
      row({ label: "F2", payment_status: "pendiente" }),
      row({ label: "F3", payment_status: "parcial", amount_paid: 1000 }),
      row({ label: "F4", payment_status: "exonerado" }), // no debe
    ]);
    expect(b.totalDue).toBe(2200 * 3); // F1, F2, F3 (F4 exonerado no cuenta)
    expect(b.debt).toBe(2200 + 1200); // F2 completo + F3 parcial (2200-1000)
    expect(b.unpaid.map((u) => u.label)).toEqual(["F2", "F3"]);
    expect(b.paid).toBe(3200);
  });

  it("sin deuda si todo confirmado", () => {
    const b = playerBalance([row({ payment_status: "confirmado", amount_paid: 2200 })]);
    expect(b.debt).toBe(0);
    expect(b.unpaid).toHaveLength(0);
  });
});

describe("mensajes de cobranza", () => {
  const money = (n: number) => `₡${n}`;
  it("mensaje individual con fechas, total y SINPE", () => {
    const msg = playerDebtMessage(
      "Carlos", [{ label: "Lunes", amount: 2200 }], 2200, money, { number: "8888-8888", name: "Tito" },
    );
    expect(msg).toContain("Carlos");
    expect(msg).toContain("₡2200");
    expect(msg).toContain("SINPE: 8888-8888 (Tito)");
  });
  it("mensaje grupal", () => {
    const msg = groupDebtMessage([{ name: "Ana", amount: 2200 }, { name: "Beto", amount: 4400 }], money);
    expect(msg).toContain("Ana: ₡2200");
    expect(msg).toContain("Beto: ₡4400");
  });
});
