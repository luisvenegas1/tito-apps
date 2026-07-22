import type { DashboardData } from "@/features/dashboard/useDashboard";

export interface ReminderSettings {
  enabled: boolean;
  time: string; // "HH:MM" local
  water: boolean;
  protein: boolean;
  calories: boolean;
}

const KEY = "nutricoach.reminders";

export const DEFAULT_REMINDERS: ReminderSettings = {
  enabled: false,
  time: "18:00",
  water: true,
  protein: true,
  calories: false,
};

export function loadReminders(): ReminderSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_REMINDERS, ...(JSON.parse(raw) as Partial<ReminderSettings>) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_REMINDERS };
}

export function saveReminders(s: ReminderSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

// Marca de "ya disparé hoy" para no repetir el mismo día.
export function getLastFired(): string | null {
  try {
    return localStorage.getItem(KEY + ".lastFired");
  } catch {
    return null;
  }
}
export function setLastFired(dateISO: string): void {
  try {
    localStorage.setItem(KEY + ".lastFired", dateISO);
  } catch {
    /* ignore */
  }
}

/**
 * Construye el mensaje del recordatorio según los faltantes del día.
 * Devuelve null si ya cumpliste todo lo que pediste recordar.
 */
export function buildReminderMessage(d: DashboardData, s: ReminderSettings): string | null {
  const parts: string[] = [];
  if (s.water && d.targets) {
    const rem = Math.round((d.targets.water_ml || 0) - d.waterMl);
    if (rem > 100) parts.push(`${rem} ml de agua`);
  }
  if (s.protein && d.remaining) {
    const rem = Math.round(d.remaining.protein_g);
    if (rem > 5) parts.push(`${rem} g de proteína`);
  }
  if (s.calories && d.remaining) {
    const rem = Math.round(d.remaining.kcal);
    if (rem > 50) parts.push(`${rem} kcal`);
  }
  if (parts.length === 0) return null;
  return `Te faltan ${parts.join(", ")} para tu objetivo de hoy. ¡Dale un empujón! 💪`;
}

export function showNotification(body: string): void {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  new Notification("NutriCoach", { body, icon: "/icon-192.png", badge: "/icon-192.png" });
}
