import type { Meal } from "@/lib/supabase/types";

/** Lee un File como data URL base64 (para enviar a las Edge Functions de IA). */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Sugiere la comida según la hora del día. */
export function mealByHour(d = new Date()): Meal {
  const h = d.getHours();
  if (h < 11) return "breakfast";
  if (h < 16) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

/**
 * Próximo momento de comida según la hora local, para los textos del dashboard
 * y del coach (así no te habla de "cerrar el día / cena" a las 9 de la mañana).
 */
export function nextMealMoment(d = new Date()): { ideasTitle: string; focus: string } {
  const h = d.getHours();
  if (h < 10) return { ideasTitle: "Ideas para tu media mañana", focus: "una merienda de media mañana" };
  if (h < 14) return { ideasTitle: "Ideas para tu almuerzo", focus: "el almuerzo" };
  if (h < 17) return { ideasTitle: "Ideas para tu merienda", focus: "una merienda de la tarde" };
  if (h < 21) return { ideasTitle: "Ideas para tu cena", focus: "la cena" };
  return { ideasTitle: "Ideas para cerrar tu día", focus: "cerrar bien tu día" };
}

export const MEALS: { value: Meal; label: string }[] = [
  { value: "breakfast", label: "Desayuno" },
  { value: "lunch", label: "Almuerzo" },
  { value: "dinner", label: "Cena" },
  { value: "snack", label: "Snack" },
];
