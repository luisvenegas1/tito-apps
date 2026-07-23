// Adapter OpenAI (gpt-4o visión + JSON). Implementa AIProvider.
import type { AIProvider, PlanDay, Per100g, VisionItem } from "./provider.ts";
import { extractJson, num } from "./parse.ts";
import {
  FOOD_SYSTEM,
  MEAL_TEXT_SYSTEM,
  SCALE_SYSTEM,
  LABEL_SYSTEM,
  COACH_SYSTEM,
  PLAN_SYSTEM,
  ACTIVITY_SYSTEM,
  coachUserBlock,
  planUserBlock,
  activityUserBlock,
} from "./prompts.ts";

const API = "https://api.openai.com/v1/chat/completions";

function per100(o: Record<string, unknown> = {}): Per100g {
  return {
    kcal: num(o.kcal),
    protein_g: num(o.protein_g),
    carb_g: num(o.carb_g),
    fat_g: num(o.fat_g),
    fiber_g: num(o.fiber_g),
    sugar_g: num(o.sugar_g),
    sodium_mg: num(o.sodium_mg),
  };
}

export class OpenAIProvider implements AIProvider {
  constructor(private apiKey: string, private model = "gpt-4o") {}

  private async chat(system: string, userText: string, imageDataUrl?: string): Promise<string> {
    const content: unknown[] = [{ type: "text", text: userText }];
    if (imageDataUrl) content.push({ type: "image_url", image_url: { url: imageDataUrl } });

    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 900,
        messages: [
          { role: "system", content: system },
          { role: "user", content },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  }

  async analyzeFoodPhoto(imageBase64: string, hint?: string): Promise<VisionItem[]> {
    const txt = await this.chat(FOOD_SYSTEM, hint ? `Pista del usuario: ${hint}` : "Analizá el plato.", imageBase64);
    const parsed = extractJson<{ items?: Record<string, unknown>[] }>(txt);
    return (parsed.items ?? []).map((it) => ({
      name: String(it.name ?? "Alimento"),
      grams: num(it.grams),
      kcal: num(it.kcal),
      protein_g: num(it.protein_g),
      carb_g: num(it.carb_g),
      fat_g: num(it.fat_g),
      fiber_g: num(it.fiber_g),
      sugar_g: num(it.sugar_g),
      sodium_mg: num(it.sodium_mg),
      confidence: Math.min(1, num(it.confidence)),
    }));
  }

  async parseMealText(text: string): Promise<VisionItem[]> {
    const txt = await this.chat(MEAL_TEXT_SYSTEM, `Comida descrita: ${text}`);
    const parsed = extractJson<{ items?: Record<string, unknown>[] }>(txt);
    return (parsed.items ?? []).map((it) => ({
      name: String(it.name ?? "Alimento"),
      grams: num(it.grams),
      kcal: num(it.kcal),
      protein_g: num(it.protein_g),
      carb_g: num(it.carb_g),
      fat_g: num(it.fat_g),
      fiber_g: num(it.fiber_g),
      sugar_g: num(it.sugar_g),
      sodium_mg: num(it.sodium_mg),
      confidence: Math.min(1, num(it.confidence)),
    }));
  }

  async analyzeScalePhoto(imageBase64: string) {
    const txt = await this.chat(SCALE_SYSTEM, "Identificá el alimento y leé el peso de la balanza.", imageBase64);
    const p = extractJson<Record<string, unknown>>(txt);
    const gramsRaw = p.grams;
    return {
      name: String(p.name ?? "Alimento"),
      grams: gramsRaw == null ? null : num(gramsRaw),
      gramsConfidence: Math.min(1, num(p.gramsConfidence)),
      per100g: per100(p.per100g as Record<string, unknown>),
    };
  }

  async analyzeLabelPhoto(imageBase64: string) {
    const txt = await this.chat(LABEL_SYSTEM, "Leé la tabla nutricional.", imageBase64);
    const p = extractJson<Record<string, unknown>>(txt);
    return {
      per100g: per100(p.per100g as Record<string, unknown>),
      servingSize_g: p.servingSize_g == null ? undefined : num(p.servingSize_g),
    };
  }

  async coachReply(
    messages: Array<{ role: string; content: string }>,
    dayContext: Record<string, unknown>,
    proactive?: boolean,
  ) {
    const history = messages.map((m) => `${m.role}: ${m.content}`).join("\n");
    const user = `${coachUserBlock(dayContext, proactive)}\n${history}`;
    const txt = await this.chat(COACH_SYSTEM, user);
    const p = extractJson<{ reply?: string; suggestions?: { label: string }[] }>(txt);
    return { reply: String(p.reply ?? ""), suggestions: p.suggestions ?? [] };
  }

  async mealPlan(input: Parameters<AIProvider["mealPlan"]>[0]) {
    const txt = await this.chat(PLAN_SYSTEM, planUserBlock(input));
    const p = extractJson<{ plan?: PlanDay[] }>(txt);
    return { plan: p.plan ?? [] };
  }

  async classifyActivity(answers: Record<string, unknown>) {
    const txt = await this.chat(ACTIVITY_SYSTEM, activityUserBlock(answers));
    const p = extractJson<{ activity?: string; reason?: string; confidence?: number }>(txt);
    return {
      activity: String(p.activity ?? "moderate"),
      reason: String(p.reason ?? ""),
      confidence: Math.min(1, num(p.confidence)),
    };
  }
}
