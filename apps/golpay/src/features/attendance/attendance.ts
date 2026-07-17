import type { MatchPlayer, AttendanceStatus } from "@/lib/supabase/types";

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  pendiente: "Sin responder",
  tal_vez: "Tal vez",
  confirmado: "Confirmado",
  lista_espera: "Lista de espera",
  declinado: "No va",
  asistio: "Asistió",
  no_asistio: "No asistió",
};

export interface AttendanceCounts {
  confirmed: number;
  waitlist: number;
  maybe: number;
  declined: number;
  pending: number;
  attended: number;
  noShow: number;
}

export function attendanceCounts(players: Pick<MatchPlayer, "attendance_status">[]): AttendanceCounts {
  const c: AttendanceCounts = { confirmed: 0, waitlist: 0, maybe: 0, declined: 0, pending: 0, attended: 0, noShow: 0 };
  for (const p of players) {
    switch (p.attendance_status) {
      case "confirmado": c.confirmed++; break;
      case "lista_espera": c.waitlist++; break;
      case "tal_vez": c.maybe++; break;
      case "declinado": c.declined++; break;
      case "asistio": c.attended++; break;
      case "no_asistio": c.noShow++; break;
      default: c.pending++;
    }
  }
  return c;
}

/** Lugares libres; null si el partido no tiene cupo. */
export function spotsLeft(confirmedCount: number, max: number | null): number | null {
  if (max == null) return null;
  return Math.max(0, max - confirmedCount);
}

/** ¿Un nuevo "confirmado" iría a lista de espera? */
export function willGoToWaitlist(confirmedCount: number, max: number | null): boolean {
  if (max == null) return false;
  return confirmedCount >= max;
}
