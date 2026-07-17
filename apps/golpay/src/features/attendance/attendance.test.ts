import { describe, it, expect } from "vitest";
import { attendanceCounts, spotsLeft, willGoToWaitlist } from "./attendance";
import type { AttendanceStatus } from "@/lib/supabase/types";

const p = (s: AttendanceStatus) => ({ attendance_status: s });

describe("attendanceCounts", () => {
  it("cuenta por estado", () => {
    const c = attendanceCounts([
      p("confirmado"), p("confirmado"), p("lista_espera"), p("tal_vez"),
      p("declinado"), p("pendiente"), p("asistio"), p("no_asistio"),
    ]);
    expect(c.confirmed).toBe(2);
    expect(c.waitlist).toBe(1);
    expect(c.maybe).toBe(1);
    expect(c.declined).toBe(1);
    expect(c.pending).toBe(1);
    expect(c.attended).toBe(1);
    expect(c.noShow).toBe(1);
  });
});

describe("cupo y lista de espera", () => {
  it("spotsLeft respeta el máximo", () => {
    expect(spotsLeft(10, 12)).toBe(2);
    expect(spotsLeft(12, 12)).toBe(0);
    expect(spotsLeft(14, 12)).toBe(0);
    expect(spotsLeft(5, null)).toBeNull();
  });
  it("willGoToWaitlist cuando está lleno", () => {
    expect(willGoToWaitlist(12, 12)).toBe(true);
    expect(willGoToWaitlist(11, 12)).toBe(false);
    expect(willGoToWaitlist(5, null)).toBe(false);
  });
});
