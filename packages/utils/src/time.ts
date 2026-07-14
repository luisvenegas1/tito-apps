/**
 * Formatea una hora a 12 horas con "a. m." / "p. m." (estilo es-CR).
 * Acepta "HH:MM" o "HH:MM:SS" (24h, como lo guarda Postgres `time`).
 *
 *   formatTime("20:00")    -> "8:00 p. m."
 *   formatTime("08:05:00") -> "8:05 a. m."
 *   formatTime("00:30")    -> "12:30 a. m."
 *   formatTime("12:00")    -> "12:00 p. m."
 *
 * Determinista: no depende del ICU del entorno.
 */
export function formatTime(time: string | null | undefined): string {
  if (!time) return "";
  const parts = time.split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const period = h < 12 ? "a. m." : "p. m.";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const mm = String(m).padStart(2, "0");
  return `${hour12}:${mm} ${period}`;
}
