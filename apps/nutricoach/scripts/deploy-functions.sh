#!/usr/bin/env bash
# Despliega todas las Edge Functions de NutriCoach.
# Requisitos: Supabase CLI instalado y proyecto enlazado (supabase link).
# Configurá los secretos ANTES de desplegar:
#   supabase secrets set AI_PROVIDER=anthropic AI_API_KEY=sk-...   # o openai
set -euo pipefail

cd "$(dirname "$0")/.."

FUNCTIONS=(analyze-food analyze-scale analyze-label coach meal-plan)

for fn in "${FUNCTIONS[@]}"; do
  echo "→ Desplegando $fn"
  supabase functions deploy "$fn"
done

echo "✔ Funciones desplegadas: ${FUNCTIONS[*]}"
