/**
 * Estadísticas del jugador y del grupo. Lógica PURA (testeable) sobre los datos
 * ya persistidos (asistencia, pagos, resultados, equipos).
 */

export interface PlayerMatchRow {
  match_id: string;
  date: string; // ISO YYYY-MM-DD
  attendance_status: string;
  payment_status: string;
  team_name: string | null;
  is_champion: boolean;
  is_mvp: boolean;
}

export interface PlayerStats {
  invited: number;
  played: number; // participó (confirmado o asistió)
  absences: number; // no_asistio o declinado
  attendancePct: number; // 0..100
  paidOnTime: number; // pagos confirmados
  pending: number; // pendiente/reportado/parcial
  paymentPct: number; // 0..100
  championships: number;
  mvps: number;
  currentStreak: number; // asistencias consecutivas (desde la más reciente)
  lastPlayed: string | null;
}

const PARTICIPATED = new Set(["confirmado", "asistio"]);
const ABSENT = new Set(["no_asistio", "declinado"]);
const PENDING_PAY = new Set(["pendiente", "reportado", "parcial"]);

export function playerStats(rows: PlayerMatchRow[]): PlayerStats {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  let played = 0, absences = 0, paidOnTime = 0, pending = 0, championships = 0, mvps = 0;
  let lastPlayed: string | null = null;

  for (const r of sorted) {
    if (PARTICIPATED.has(r.attendance_status)) {
      played++;
      lastPlayed = r.date;
    }
    if (ABSENT.has(r.attendance_status)) absences++;
    if (r.payment_status === "confirmado") paidOnTime++;
    else if (PENDING_PAY.has(r.payment_status)) pending++;
    if (r.is_champion) championships++;
    if (r.is_mvp) mvps++;
  }

  const invited = rows.length;
  const attBase = played + absences;
  const attendancePct = attBase === 0 ? 0 : Math.round((played / attBase) * 100);
  const payBase = paidOnTime + pending;
  const paymentPct = payBase === 0 ? 100 : Math.round((paidOnTime / payBase) * 100);

  // Racha: asistencias consecutivas desde la fecha más reciente hacia atrás.
  let currentStreak = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const s = sorted[i].attendance_status;
    if (PARTICIPATED.has(s)) currentStreak++;
    else if (ABSENT.has(s)) break;
    // estados neutros (pendiente/tal_vez) no cortan ni suman
  }

  return { invited, played, absences, attendancePct, paidOnTime, pending, paymentPct, championships, mvps, currentStreak, lastPlayed };
}

export interface RankedPlayer {
  id: string;
  name: string;
  stats: PlayerStats;
}

/** Rankings del grupo (top asistentes, campeones, MVPs, mejor pago, morosidad). */
export function groupRankings(players: RankedPlayer[]) {
  const byAttendance = [...players].sort(
    (a, b) => b.stats.attendancePct - a.stats.attendancePct || b.stats.played - a.stats.played,
  );
  const byChampionships = [...players].filter((p) => p.stats.championships > 0)
    .sort((a, b) => b.stats.championships - a.stats.championships);
  const byMvps = [...players].filter((p) => p.stats.mvps > 0).sort((a, b) => b.stats.mvps - a.stats.mvps);
  const byPayment = [...players].sort((a, b) => b.stats.paymentPct - a.stats.paymentPct);
  const byDebt = [...players].filter((p) => p.stats.pending > 0).sort((a, b) => b.stats.pending - a.stats.pending);
  return { byAttendance, byChampionships, byMvps, byPayment, byDebt };
}

export interface Reliability {
  score: number; // 0..100
  label: string; // no ofensivo
  explanation: string;
}

/** Rating PRIVADO del organizador: mezcla asistencia y puntualidad de pago. */
export function reliabilityScore(attendancePct: number, paymentPct: number): Reliability {
  const score = Math.round(0.5 * attendancePct + 0.5 * paymentPct);
  const label = score >= 80 ? "Muy confiable" : score >= 55 ? "Confiable" : "Irregular";
  return {
    score,
    label,
    explanation: "Promedio de asistencia y puntualidad de pago (50% cada uno).",
  };
}

export interface LevelSuggestion {
  level: number;
  reason: string;
}

/**
 * Sugerencia de nivel asistida (NUNCA automática). Solo tras varias fechas.
 * Heurística conservadora basada en MVPs/campeonatos; el organizador decide.
 */
export function suggestLevel(currentLevel: number | null, s: PlayerStats): LevelSuggestion | null {
  if (s.played < 5) return null;
  const cur = currentLevel ?? 2; // sin evaluar se asume Casual
  if (cur < 5 && (s.mvps >= 2 || s.championships >= 3)) {
    return { level: cur + 1, reason: `${s.mvps} MVP(s) y ${s.championships} campeonato(s) en ${s.played} partidos.` };
  }
  return null;
}
