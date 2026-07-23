// Abstracción de proveedor de IA. Las funciones dependen de esta interfaz,
// no de un SDK concreto (OpenAI/Anthropic/Google). Ver docs/ai.md.
//
// BLOQUE 1: implementación STUB determinista para probar el flujo end-to-end
// sin claves. BLOQUE 2: implementar OpenAIProvider / AnthropicProvider leyendo
// Deno.env.get("AI_API_KEY") y seleccionando por AI_PROVIDER.

export interface VisionItem {
  name: string;
  grams: number;
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  confidence: number;
}

export interface Per100g {
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
}

export interface AIProvider {
  analyzeFoodPhoto(imageBase64: string, hint?: string): Promise<VisionItem[]>;
  parseMealText(text: string, knownProducts?: string[]): Promise<VisionItem[]>;
  analyzeScalePhoto(imageBase64: string): Promise<{
    name: string;
    grams: number | null;
    gramsConfidence: number;
    per100g: Per100g;
  }>;
  analyzeLabelPhoto(imageBase64: string): Promise<{ per100g: Per100g; servingSize_g?: number }>;
  coachReply(
    messages: Array<{ role: string; content: string }>,
    dayContext: Record<string, unknown>,
    proactive?: boolean,
  ): Promise<{ reply: string; suggestions?: { label: string }[] }>;
  mealPlan(input: {
    goalType: string;
    targets: { calorie_target: number; protein_g: number; carb_g: number; fat_g: number };
    days?: number;
    preferences?: string;
  }): Promise<{ plan: PlanDay[] }>;
  classifyActivity(answers: Record<string, unknown>): Promise<{ activity: string; reason: string; confidence: number }>;
}

export interface PlanMeal {
  meal: "breakfast" | "lunch" | "dinner" | "snack";
  title: string;
  kcal: number;
  protein_g: number;
}
export interface PlanDay {
  label: string;
  meals: PlanMeal[];
}

// ---------- STUB ----------
const CHICKEN: Per100g = { kcal: 165, protein_g: 31, carb_g: 0, fat_g: 3.6, fiber_g: 0, sugar_g: 0, sodium_mg: 74 };
const RICE: Per100g = { kcal: 130, protein_g: 2.7, carb_g: 28, fat_g: 0.3, fiber_g: 0.4, sugar_g: 0.1, sodium_mg: 1 };

export const stubProvider: AIProvider = {
  async analyzeFoodPhoto() {
    return [
      { name: "Pechuga de pollo", grams: 150, kcal: 248, protein_g: 46.5, carb_g: 0, fat_g: 5.4, confidence: 0.82 },
      { name: "Arroz blanco", grams: 180, kcal: 234, protein_g: 4.9, carb_g: 50.4, fat_g: 0.5, confidence: 0.71 },
    ];
  },
  async parseMealText() {
    return [
      { name: "Huevo", grams: 100, kcal: 155, protein_g: 13, carb_g: 1.1, fat_g: 11, confidence: 0.7 },
      { name: "Tortilla de maíz", grams: 50, kcal: 109, protein_g: 2.9, carb_g: 22, fat_g: 1.4, confidence: 0.6 },
    ];
  },
  async analyzeScalePhoto() {
    return { name: "Pechuga de pollo", grams: 156, gramsConfidence: 0.68, per100g: CHICKEN };
  },
  async analyzeLabelPhoto() {
    return { per100g: RICE, servingSize_g: 50 };
  },
  async coachReply(_messages, dayContext, proactive) {
    const remaining = (dayContext.remaining ?? {}) as Record<string, number>;
    const kcal = Math.round(remaining.kcal ?? 0);
    const protein = Math.round(remaining.protein_g ?? 0);
    if (proactive) {
      return {
        reply:
          protein > 20
            ? `Vas bien. Te faltan ~${protein} g de proteína y ${kcal} kcal. Una buena cena con pollo o huevo cierra el día perfecto.`
            : `Buen trabajo hoy, vas muy alineado a tu meta. Mantené la hidratación.`,
      };
    }
    return {
      reply: `Según tu día, te faltan ~${kcal} kcal y ${protein} g de proteína. Sí podés darte un gusto si lo balanceás con algo de proteína. (Respuesta de ejemplo — el proveedor real se conecta en el Bloque 2.)`,
      suggestions: [{ label: "¿Qué ceno?" }, { label: "Opciones altas en proteína" }],
    };
  },
  async mealPlan(input) {
    const t = input.targets;
    // Reparto estándar por comida: desayuno 25%, almuerzo 35%, cena 30%, snack 10%.
    const split: Array<[PlanMeal["meal"], string, number]> = [
      ["breakfast", "Avena con yogur griego y fruta", 0.25],
      ["lunch", "Pollo, arroz integral y ensalada", 0.35],
      ["dinner", "Salmón al horno con vegetales", 0.3],
      ["snack", "Puñado de almendras", 0.1],
    ];
    const mkDay = (label: string): PlanDay => ({
      label,
      meals: split.map(([meal, title, frac]) => ({
        meal,
        title,
        kcal: Math.round(t.calorie_target * frac),
        protein_g: Math.round(t.protein_g * frac),
      })),
    });
    const days = Math.max(1, Math.min(input.days ?? 1, 7));
    const names = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    const plan = days === 1 ? [mkDay("Hoy")] : names.slice(0, days).map((n) => mkDay(n));
    return { plan };
  },
  async classifyActivity(answers) {
    // Heurística determinista de respaldo (sin clave de IA).
    const days = Number(answers.trainingDays ?? 0);
    const move = String(answers.dailyMovement ?? "mixed");
    const order = ["sedentary", "light", "moderate", "active", "very_active"];
    let idx = days >= 6 ? 3 : days >= 3 ? 2 : days >= 1 ? 1 : 0;
    if (move === "onfeet") idx = Math.min(idx + 1, order.length - 1);
    return {
      activity: order[idx],
      reason: `Estimación local: ${days} día(s) de entrenamiento por semana${move === "onfeet" ? " y trabajo mayormente de pie" : ""}.`,
      confidence: 0.6,
    };
  },
};

/**
 * Selector de proveedor por variables de entorno (secretos de la función):
 *   AI_PROVIDER = "openai" | "anthropic"  (por defecto "anthropic" si hay clave)
 *   AI_API_KEY  = clave del proveedor
 *   AI_MODEL    = modelo opcional (override)
 * Si no hay clave, cae al stub determinista (útil en local/demo).
 */
export async function getProvider(overrideModel?: string): Promise<AIProvider> {
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  // AI_API_KEY es el nombre genérico; ANTHROPIC_API_KEY / OPENAI_API_KEY también
  // se aceptan directo (igual que SplitPay: basta setear ANTHROPIC_API_KEY).
  const key = Deno.env.get("AI_API_KEY") ?? anthropicKey ?? openaiKey;
  if (!key) return stubProvider;

  // Proveedor: AI_PROVIDER si está; si no, se infiere por la clave presente.
  let name = (Deno.env.get("AI_PROVIDER") ?? "").toLowerCase();
  if (!name) name = openaiKey && !anthropicKey ? "openai" : "anthropic";

  const envModel = Deno.env.get("AI_MODEL") ?? undefined;
  if (name === "openai") {
    // overrideModel apunta a un modelo Claude; no aplica a OpenAI.
    const { OpenAIProvider } = await import("./openai.ts");
    return envModel ? new OpenAIProvider(key, envModel) : new OpenAIProvider(key);
  }
  // Anthropic: permitimos un modelo por-función (ej. Sonnet solo para comidas).
  const model = overrideModel ?? envModel;
  const { AnthropicProvider } = await import("./anthropic.ts");
  return model ? new AnthropicProvider(key, model) : new AnthropicProvider(key);
}
