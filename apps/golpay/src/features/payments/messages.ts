import type { Match, MatchPlayer } from "@/lib/supabase/types";
import { crc } from "@/lib/utils/format";

/** Totales calculados de un partido. */
export function computeTotals(players: MatchPlayer[]) {
  const active = players.filter((p) => p.payment_status !== "exonerado" && p.payment_status !== "no_asistio");
  const expected = active.reduce((s, p) => s + p.amount_due, 0);
  const confirmed = players
    .filter((p) => p.payment_status === "confirmado")
    .reduce((s, p) => s + p.amount_due, 0);
  const partial = players
    .filter((p) => p.payment_status === "parcial")
    .reduce((s, p) => s + p.amount_paid, 0);
  const collected = confirmed + partial;
  return {
    total: players.length,
    pending: players.filter((p) => p.payment_status === "pendiente").length,
    reported: players.filter((p) => p.payment_status === "reportado").length,
    confirmed: players.filter((p) => p.payment_status === "confirmado").length,
    expected,
    collected,
    remaining: Math.max(0, expected - collected),
  };
}

/** Mensaje de pendientes para pegar en WhatsApp. */
export function pendingMessage(match: Match, players: MatchPlayer[]): string {
  const pend = players.filter(
    (p) => p.payment_status === "pendiente" || p.payment_status === "reportado",
  );
  const lines = pend.map((p) => `• ${p.display_name}`).join("\n");
  return `Pendientes de pago – ${match.title}:\n${lines}\n\nMonto: ${crc(match.cost_per_player)} por persona.`;
}

/** Resumen de recaudación. */
export function summaryMessage(players: MatchPlayer[]): string {
  const t = computeTotals(players);
  return `Pagos confirmados: ${t.confirmed} de ${t.total}\nTotal recibido: ${crc(
    t.collected,
  )}\nPendiente: ${crc(t.remaining)}`;
}

/** Mensaje con el enlace + PIN para compartir. */
export function inviteMessage(match: Match, url: string, pin: string): string {
  return `⚽ ${match.title}\n${match.location ?? ""}\nMonto: ${crc(
    match.cost_per_player,
  )}\n\nReportá tu pago acá 👇\n${url}\nPIN: ${pin}`;
}
