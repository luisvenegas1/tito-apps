-- =====================================================================
-- NutriCoach — cuestionario de actividad + revisión periódica.
-- activity_answers: respuestas del cuestionario (para recalcular/mostrar).
-- activity_reviewed_at: última vez que el usuario confirmó/recalculó su nivel;
--   el dashboard muestra el pop-up de revisión cuando pasan ~30 días.
-- =====================================================================

alter table public.profiles add column if not exists activity_answers jsonb;
alter table public.profiles add column if not exists activity_reviewed_at timestamptz;
