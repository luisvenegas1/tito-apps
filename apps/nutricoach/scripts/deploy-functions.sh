#!/usr/bin/env bash
# Despliega todas las Edge Functions de NutriCoach.
#
# Requisitos:
#   - Supabase CLI instalado.
#   - Clave de IA ya configurada como secreto (ANTHROPIC_API_KEY).
#
# Uso (sin cambiar tu login del CLI): usá un ACCESS TOKEN de la cuenta correcta.
#   export SUPABASE_ACCESS_TOKEN=sbp_xxx        # token de la cuenta de NutriCoach
#   bash apps/nutricoach/scripts/deploy-functions.sh dpdisvjtsgbwxkorwnpu
#
# Si ya tenés el proyecto enlazado (supabase link), podés omitir el ref:
#   bash apps/nutricoach/scripts/deploy-functions.sh
set -euo pipefail

cd "$(dirname "$0")/.."

PROJECT_REF="${1:-}"
REF_ARG=()
[ -n "$PROJECT_REF" ] && REF_ARG=(--project-ref "$PROJECT_REF")

FUNCTIONS=(login analyze-food analyze-scale analyze-label coach meal-plan parse-meal-text send-reminders strava-exchange strava-sync)

for fn in "${FUNCTIONS[@]}"; do
  echo "→ Desplegando $fn"
  supabase functions deploy "$fn" "${REF_ARG[@]}"
done

echo "✔ Funciones desplegadas: ${FUNCTIONS[*]}"
