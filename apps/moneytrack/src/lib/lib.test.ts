import { describe, expect, it } from "vitest";
import { convert, formatByCurrency, formatMoney, parseAmount } from "./money";
import { rateFor, toBase } from "./rates";
import { monthSummary, pctChange } from "./summary";
import { balances, ledgerRows, periodTotals } from "./ledger";
import { paymentState, paymentStateLabel } from "./payments";
import { addMonths, monthLabel, monthRange } from "./dates";
import { parseCSV, toCSV } from "./csv";
import type { SharedEntry } from "./supabase/types";

describe("money", () => {
  it("formatea colones sin decimales y dólares con dos", () => {
    expect(formatMoney(185000, "CRC")).toBe("₡185.000");
    expect(formatMoney(42.5, "USD")).toBe("$42,50");
    expect(formatMoney(-1500, "CRC")).toBe("−₡1.500");
    expect(formatMoney(1500, "CRC", { sign: true })).toBe("+₡1.500");
  });

  it("interpreta montos escritos de varias formas", () => {
    expect(parseAmount("15000")).toBe(15000);
    expect(parseAmount("15.000")).toBe(15000);
    expect(parseAmount("15,000")).toBe(15000);
    expect(parseAmount("1.250.000")).toBe(1250000);
    expect(parseAmount("42,5")).toBe(42.5);
    expect(parseAmount("42.50")).toBe(42.5);
    expect(parseAmount("₡ 3.200")).toBe(3200);
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("")).toBeNull();
  });

  it("convierte con el TC", () => {
    expect(convert(10, "USD", "CRC", 505)).toBe(5050);
    expect(convert(5050, "CRC", "USD", 505)).toBe(10);
    expect(convert(7, "CRC", "CRC", 505)).toBe(7);
  });

  it("muestra saldos por moneda", () => {
    expect(formatByCurrency({ CRC: 185000, USD: 42 })).toBe("₡185.000 · $42,00");
    expect(formatByCurrency({})).toBe("₡0");
  });
});

describe("tipo de cambio", () => {
  const rates = [
    { crc_per_usd: 520, valid_from: "2026-01-01" },
    { crc_per_usd: 505, valid_from: "2026-06-01" },
  ];
  it("usa el vigente en la fecha del movimiento", () => {
    expect(rateFor("2026-03-15", rates)).toBe(520);
    expect(rateFor("2026-06-01", rates)).toBe(505);
    expect(rateFor("2025-12-01", rates)).toBe(520); // antes del primero: el más antiguo
    expect(toBase(10, "USD", "2026-07-01", "CRC", rates)).toBe(5050);
  });
});

describe("resumen del mes", () => {
  const base = { occurred_on: "2026-09-10", category_id: "c1", my_share: 0.5, scope: "personal" as const, paid_by: "me" as const };
  const rates = [{ crc_per_usd: 500, valid_from: "2026-01-01" }];

  it("la luz que paga la pareja cuenta en el hogar pero no sale de mi bolsillo", () => {
    const s = monthSummary(
      [
        { ...base, kind: "income", amount: 1_000_000, currency: "CRC" },
        { ...base, kind: "expense", amount: 30_000, currency: "CRC", scope: "household", paid_by: "partner" },
        { ...base, kind: "expense", amount: 100_000, currency: "CRC", scope: "household", paid_by: "me" },
        { ...base, kind: "expense", amount: 20, currency: "USD" }, // 10.000 ₡
        { ...base, kind: "expense", amount: 40_000, currency: "CRC", paid_by: "shared", my_share: 0.5 },
      ],
      rates,
      "CRC",
    );
    expect(s.income).toBe(1_000_000);
    expect(s.household).toBe(130_000);
    expect(s.personal).toBe(10_000 + 20_000);
    expect(s.myOutflow).toBe(100_000 + 10_000 + 20_000);
    expect(s.available).toBe(1_000_000 - 130_000);
    expect(s.outflowByCurrency).toEqual({ CRC: 120_000, USD: 20 });
  });

  it("adelantos salen y reembolsos vuelven", () => {
    const s = monthSummary(
      [
        { ...base, kind: "advance", amount: 50_000, currency: "CRC" },
        { ...base, kind: "reimbursement", amount: 50_000, currency: "CRC" },
      ],
      rates,
      "CRC",
    );
    expect(s.available).toBe(0);
    expect(s.reimbursed).toBe(50_000);
  });

  it("agrupa por categoría de mayor a menor", () => {
    const s = monthSummary(
      [
        { ...base, kind: "expense", amount: 10, currency: "CRC", category_id: "a" },
        { ...base, kind: "expense", amount: 30, currency: "CRC", category_id: "b" },
        { ...base, kind: "expense", amount: 5, currency: "CRC", category_id: "a" },
      ],
      rates,
      "CRC",
    );
    expect(s.byCategory).toEqual([
      { category_id: "b", total: 30 },
      { category_id: "a", total: 15 },
    ]);
  });

  it("variación porcentual", () => {
    expect(pctChange(110, 100)).toBeCloseTo(10);
    expect(pctChange(5, 0)).toBeNull();
  });
});

describe("libro compartido", () => {
  const e = (id: string, type: "charge" | "payment", amount: number, currency: "CRC" | "USD", occurred_on: string, deleted = false) =>
    ({ id, type, amount, currency, occurred_on, created_at: `${occurred_on}T12:00:00Z`, deleted_at: deleted ? "x" : null }) as Pick<
      SharedEntry,
      "id" | "type" | "amount" | "currency" | "occurred_on" | "created_at" | "deleted_at"
    >;

  const entries = [
    e("3", "payment", 200_000, "CRC", "2026-07-20"),
    e("1", "charge", 135_000, "CRC", "2026-07-02"),
    e("2", "charge", 52_000, "CRC", "2026-07-08"),
    e("4", "charge", 42, "USD", "2026-07-21"),
    e("5", "charge", 999_999, "CRC", "2026-07-22", true),
  ];

  it("saldo por moneda ignorando eliminados", () => {
    expect(balances(entries)).toEqual({ CRC: -13_000, USD: 42 });
  });

  it("saldo corriente cronológico por moneda", () => {
    expect(ledgerRows(entries).map((r) => [r.entry.id, r.running])).toEqual([
      ["1", 135_000],
      ["2", 187_000],
      ["3", -13_000],
      ["4", 42],
      ["5", -13_000],
    ]);
  });

  it("totales del período (cuánto gastó / cuánto recuperé)", () => {
    expect(periodTotals(entries, "2026-07-01", "2026-07-10")).toEqual({ charged: { CRC: 187_000 }, paid: {} });
    expect(periodTotals(entries, "2026-01-01", "2026-12-31").paid).toEqual({ CRC: 200_000 });
  });
});

describe("pagos programados", () => {
  it("calcula estados", () => {
    expect(paymentStateLabel(paymentState("2026-09-30", "pending", "2026-09-30"))).toBe("Vence hoy");
    expect(paymentStateLabel(paymentState("2026-10-01", "pending", "2026-09-30"))).toBe("Vence mañana");
    expect(paymentStateLabel(paymentState("2026-10-03", "pending", "2026-09-30"))).toBe("En 3 días");
    expect(paymentStateLabel(paymentState("2026-09-27", "pending", "2026-09-30"))).toBe("Atrasado 3 días");
    expect(paymentStateLabel(paymentState("2026-09-27", "paid", "2026-09-30"))).toBe("Pagado");
  });
});

describe("fechas", () => {
  it("navega meses y arma rangos", () => {
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(monthRange("2026-02")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(monthLabel("2026-09")).toBe("Setiembre 2026");
  });
});

describe("csv", () => {
  it("ida y vuelta con comillas, comas y punto y coma", () => {
    const rows = [["fecha", "nota"], ["2026-09-01", 'Súper "Más x Menos", Escazú']];
    expect(parseCSV(toCSV(rows))).toEqual(rows);
    expect(parseCSV("a;b\n1;2\n")).toEqual([["a", "b"], ["1", "2"]]);
  });
});
