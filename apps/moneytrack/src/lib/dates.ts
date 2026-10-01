/** Fechas como 'YYYY-MM-DD' en la zona local (nunca UTC: en CR el día cambia 6 h antes). */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Mes como 'YYYY-MM'. */
export type MonthKey = string;

export function monthOf(dateISO: string): MonthKey {
  return dateISO.slice(0, 7);
}

export function currentMonth(): MonthKey {
  return monthOf(todayISO());
}

export function addMonths(month: MonthKey, n: number): MonthKey {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return toISODate(d).slice(0, 7);
}

export function monthRange(month: MonthKey): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"];

export function monthLabel(month: MonthKey, short = false): string {
  const [y, m] = month.split("-").map(Number);
  const name = MONTHS[m - 1];
  if (short) return `${name.slice(0, 3)} ${String(y).slice(2)}`;
  return `${name[0].toUpperCase()}${name.slice(1)} ${y}`;
}

export function formatDay(dateISO: string): string {
  const d = parseISODate(dateISO);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((parseISODate(toISO).getTime() - parseISODate(fromISO).getTime()) / 86_400_000);
}
