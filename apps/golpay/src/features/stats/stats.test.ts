import { describe, it, expect } from "vitest";
import { playerStats, reliabilityScore, suggestLevel, PlayerMatchRow } from "./stats";

function row(o: Partial<PlayerMatchRow>): PlayerMatchRow {
  return {
    match_id: o.match_id ?? "m", date: o.date ?? "2026-01-01",
    attendance_status: o.attendance_status ?? "confirmado",
    payment_status: o.payment_status ?? "confirmado",
    team_name: o.team_name ?? null, is_champion: o.is_champion ?? false, is_mvp: o.is_mvp ?? false,
  };
}

describe("playerStats", () => {
  it("cuenta asistencia, pagos, campeonatos y MVP", () => {
    const s = playerStats([
      row({ date: "2026-01-01", attendance_status: "asistio", payment_status: "confirmado", is_champion: true, is_mvp: true }),
      row({ date: "2026-01-08", attendance_status: "confirmado", payment_status: "pendiente" }),
      row({ date: "2026-01-15", attendance_status: "no_asistio", payment_status: "pendiente" }),
      row({ date: "2026-01-22", attendance_status: "declinado", payment_status: "exonerado" }),
    ]);
    expect(s.played).toBe(2);
    expect(s.absences).toBe(2);
    expect(s.attendancePct).toBe(50);
    expect(s.paidOnTime).toBe(1);
    expect(s.pending).toBe(2);
    expect(s.championships).toBe(1);
    expect(s.mvps).toBe(1);
    expect(s.lastPlayed).toBe("2026-01-08");
  });

  it("estar en la lista (pendiente) cuenta como jugado", () => {
    // Sin RSVP, todos entran como 'pendiente'. Deben contar como participación.
    const s = playerStats([
      row({ date: "2026-01-01", attendance_status: "pendiente" }),
      row({ date: "2026-01-08", attendance_status: "pendiente" }),
      row({ date: "2026-01-15", attendance_status: "no_asistio" }),
    ]);
    expect(s.played).toBe(2);
    expect(s.absences).toBe(1);
    expect(s.attendancePct).toBe(67);
    expect(s.currentStreak).toBe(0); // la última fue ausencia
  });

  it("racha de asistencias consecutivas desde la más reciente", () => {
    const s = playerStats([
      row({ date: "2026-01-01", attendance_status: "no_asistio" }),
      row({ date: "2026-01-08", attendance_status: "asistio" }),
      row({ date: "2026-01-15", attendance_status: "confirmado" }),
    ]);
    expect(s.currentStreak).toBe(2);
  });

  it("paymentPct 100 si no debe nada", () => {
    const s = playerStats([row({ attendance_status: "asistio", payment_status: "exonerado" })]);
    expect(s.paymentPct).toBe(100);
  });
});

describe("reliabilityScore", () => {
  it("combina 50/50 y etiqueta no ofensiva", () => {
    expect(reliabilityScore(100, 100)).toMatchObject({ score: 100, label: "Muy confiable" });
    expect(reliabilityScore(60, 60).label).toBe("Confiable");
    expect(reliabilityScore(20, 30).label).toBe("Irregular");
  });
});

describe("suggestLevel", () => {
  it("no sugiere con pocas fechas", () => {
    expect(suggestLevel(2, playerStats([row({ attendance_status: "asistio", is_mvp: true })]))).toBeNull();
  });
  it("sugiere subir tras varias fechas con MVPs", () => {
    const rows = Array.from({ length: 6 }, (_, i) =>
      row({ date: `2026-02-0${i + 1}`, attendance_status: "asistio", is_mvp: i < 2 }));
    const s = playerStats(rows);
    expect(suggestLevel(2, s)).toMatchObject({ level: 3 });
    expect(suggestLevel(4, s)).toMatchObject({ level: 5 });
  });
  it("no sugiere por encima de Élite (5)", () => {
    const rows = Array.from({ length: 6 }, () => row({ attendance_status: "asistio", is_mvp: true }));
    expect(suggestLevel(5, playerStats(rows))).toBeNull();
  });
});
