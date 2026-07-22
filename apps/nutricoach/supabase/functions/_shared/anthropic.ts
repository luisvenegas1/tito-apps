// Adapter Anthropic (Claude visión + JSON). Implementa AIProvider.
import type { AIProvider, PlanDay, Per100g, VisionItem } from "./provider.ts";
import { extractJson, num, parseDataUrl } from "./parse.ts";
import {
  FOOD_SYSTEM,
  SCALE_SYSTEM,
  LABEL_SYSTEM,
  COACH_SYSTEM,
  PLAN_SYSTEM,
  coachUserBlock,
  planUserBlock,
} from "./prompts.ts";

const API = "https://api.anthropic.com/v1/messages";

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

export class AnthropicProvider implements AIProvider {
  constructor(private apiKey: string, private model = "claude-sonnet-5") {}

  private async chat(system: string, userText: string, imageDataUrl?: string): Promise<string> {
    const content: unknown[] = [];
    if (imageDataUrl) {
      const { mediaType, data } = parseDataUrl(imageDataUrl);
      content.push({ type: "image", source: { type: "base64", media_type: mediaType, data } });
    }
    content.push({ type: "text", text: userText });

    const res = await fetch(API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 900,
        temperature: 0.2,
        system,
        messages: [{ role: "user", content }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.content?.[0]?.text ?? "";
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

  async analyzeScalePhoto(imageBase64: string) {
    const txt = await this.chat(SCALE_SYSTEM, "Identificá el alimento y leé el peso de la balanza.", imageBase64);
    const p = extractJson<Record<string, unknown>>(txt);
    return {
      name: String(p.name ?? "Alimento"),
      grams: p.grams == null ? null : num(p.grams),
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
}
