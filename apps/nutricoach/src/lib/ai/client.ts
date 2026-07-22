import { supabase } from "@/lib/supabase/client";
import type {
  AnalyzeFoodRequest,
  AnalyzeFoodResponse,
  ParseMealTextRequest,
  ParseMealTextResponse,
  AnalyzeScaleRequest,
  AnalyzeScaleResponse,
  AnalyzeLabelRequest,
  AnalyzeLabelResponse,
  CoachRequest,
  CoachResponse,
  MealPlanRequest,
  MealPlanResponse,
} from "./contracts";

/**
 * Invoker tipado de Edge Functions de IA.
 * En Bloque 1 las funciones devuelven stubs deterministas; el cliente no cambia
 * cuando en Bloque 2 se conecte el proveedor real (la clave vive server-side).
 */
async function invoke<TReq, TRes>(name: string, body: TReq): Promise<TRes> {
  const { data, error } = await supabase.functions.invoke<TRes>(name, {
    body: body as Record<string, unknown>,
  });
  if (error) throw new Error(`[${name}] ${error.message}`);
  if (!data) throw new Error(`[${name}] respuesta vacía`);
  return data;
}

export const ai = {
  analyzeFood: (req: AnalyzeFoodRequest) =>
    invoke<AnalyzeFoodRequest, AnalyzeFoodResponse>("analyze-food", req),
  parseMealText: (req: ParseMealTextRequest) =>
    invoke<ParseMealTextRequest, ParseMealTextResponse>("parse-meal-text", req),
  analyzeScale: (req: AnalyzeScaleRequest) =>
    invoke<AnalyzeScaleRequest, AnalyzeScaleResponse>("analyze-scale", req),
  analyzeLabel: (req: AnalyzeLabelRequest) =>
    invoke<AnalyzeLabelRequest, AnalyzeLabelResponse>("analyze-label", req),
  coach: (req: CoachRequest) => invoke<CoachRequest, CoachResponse>("coach", req),
  mealPlan: (req: MealPlanRequest) => invoke<MealPlanRequest, MealPlanResponse>("meal-plan", req),
};
