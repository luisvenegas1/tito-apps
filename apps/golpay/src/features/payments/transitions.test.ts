import { describe, it, expect } from "vitest";
import { paymentPatch } from "./transitions";

const player = { amount_due: 2200 };

describe("paymentPatch (transiciones de pago)", () => {
  it("aprobar (confirmado): paga todo y marca confirmado", () => {
    const p = paymentPatch(player, "confirmado");
    expect(p.confirmed).toBe(true);
    expect(p.amount_paid).toBe(2200);
    expect(p.payment_status).toBe("confirmado");
  });
  it("rechazar (pendiente): vuelve a 0 y no confirmado", () => {
    const p = paymentPatch(player, "pendiente");
    expect(p.confirmed).toBe(false);
    expect(p.amount_paid).toBe(0);
  });
  it("reportado: no confirmado, sin tocar el monto", () => {
    const p = paymentPatch(player, "reportado");
    expect(p.confirmed).toBe(false);
    expect(p.amount_paid).toBeUndefined();
  });
  it("parcial con monto explícito", () => {
    const p = paymentPatch(player, "parcial", 1000);
    expect(p.confirmed).toBe(false);
    expect(p.amount_paid).toBe(1000);
  });
});
