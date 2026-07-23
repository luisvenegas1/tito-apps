import { useState } from "react";
import { Button, FormField, Input, Select, Spinner } from "@titoapps/ui";
import { NumberInput } from "@/components/ui/NumberInput";
import type { ActivityLevel } from "@titoapps/nutrition";
import { ai } from "@/lib/ai/client";
import { errorMessage } from "@/lib/errors";
import type { ActivityAnswers } from "@/lib/ai/contracts";

export const ACTIVITY_LABEL: Record<ActivityLevel, string> = {
  sedentary: "Sedentario",
  light: "Ligero",
  moderate: "Moderado",
  active: "Activo",
  very_active: "Muy activo",
};
const ACTIVITIES = (Object.keys(ACTIVITY_LABEL) as ActivityLevel[]).map((v) => ({ value: v, label: ACTIVITY_LABEL[v] }));

export const DEFAULT_ANSWERS: ActivityAnswers = {
  trainingDays: 3,
  trainingType: "both",
  trainingMinutes: 60,
  otherSports: "",
  dailyMovement: "sitting",
};

interface Props {
  initialAnswers?: ActivityAnswers | null;
  initialActivity?: ActivityLevel | null;
  onChange: (state: { activity: ActivityLevel; answers: ActivityAnswers }) => void;
}

/**
 * Cuestionario de actividad + clasificación por IA. Reutilizable en "Tu objetivo"
 * (primera vez) y en "Editar mi actividad" (desde el perfil). Reporta al padre el
 * nivel elegido y las respuestas vía onChange.
 */
export function ActivityQuestionnaire({ initialAnswers, initialActivity, onChange }: Props) {
  const [answers, setAnswers] = useState<ActivityAnswers>(initialAnswers ?? DEFAULT_ANSWERS);
  const [activity, setActivity] = useState<ActivityLevel>(initialActivity ?? "moderate");
  const [suggested, setSuggested] = useState<ActivityLevel | null>(initialActivity ?? null);
  const [reason, setReason] = useState("");
  const [classifying, setClassifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOverride, setShowOverride] = useState(false);

  const setAns = <K extends keyof ActivityAnswers>(k: K, v: ActivityAnswers[K]) => {
    const next = { ...answers, [k]: v };
    setAnswers(next);
    onChange({ activity, answers: next });
  };

  const classify = async () => {
    setClassifying(true);
    setError(null);
    try {
      const res = await ai.classifyActivity({ answers });
      setSuggested(res.activity);
      setActivity(res.activity);
      setReason(res.reason);
      setShowOverride(false);
      onChange({ activity: res.activity, answers });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setClassifying(false);
    }
  };

  const override = (lvl: ActivityLevel) => {
    setActivity(lvl);
    onChange({ activity: lvl, answers });
  };
  const overridden = suggested != null && activity !== suggested;

  return (
    <div className="card space-y-3">
      <div>
        <div className="metric-label text-slate-600">Tu actividad</div>
        <p className="text-xs text-slate-400">
          Contanos tu semana y la IA determina tu nivel para calcular tus calorías.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Días de entreno / semana">
          <NumberInput
            min={0}
            max={7}
            value={answers.trainingDays}
            onValueChange={(n) => setAns("trainingDays", n)}
          />
        </FormField>
        <FormField label="Minutos por sesión">
          <NumberInput min={0} value={answers.trainingMinutes} onValueChange={(n) => setAns("trainingMinutes", n)} />
        </FormField>
      </div>

      <FormField label="Tipo de entrenamiento">
        <Select
          value={answers.trainingType}
          onChange={(e) => setAns("trainingType", e.target.value as ActivityAnswers["trainingType"])}
        >
          <option value="strength">Fuerza / pesas</option>
          <option value="cardio">Cardio</option>
          <option value="both">Ambos</option>
          <option value="none">Ninguno</option>
        </Select>
      </FormField>

      <FormField label="Otros deportes (fútbol, correr, ciclismo…)">
        <Input
          value={answers.otherSports}
          placeholder="Ej. fútbol 2 veces, correr 1 vez"
          onChange={(e) => setAns("otherSports", e.target.value)}
        />
      </FormField>

      <FormField label="En un día normal…">
        <Select
          value={answers.dailyMovement}
          onChange={(e) => setAns("dailyMovement", e.target.value as ActivityAnswers["dailyMovement"])}
        >
          <option value="sitting">Paso la mayoría sentado/a</option>
          <option value="mixed">Mitad sentado, mitad de pie</option>
          <option value="onfeet">Mayormente de pie / en movimiento</option>
        </Select>
      </FormField>

      <Button variant="secondary" className="w-full" onClick={classify} disabled={classifying}>
        {classifying ? (
          <span className="inline-flex items-center gap-2">
            <Spinner /> Calculando tu nivel…
          </span>
        ) : suggested ? (
          "Recalcular mi nivel"
        ) : (
          "Calcular mi nivel con IA"
        )}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {suggested && (
        <div className="rounded-xl bg-green-50 p-3">
          <div className="text-sm text-slate-600">
            Según tus respuestas, tu nivel es: <b className="text-green-700">{ACTIVITY_LABEL[suggested]}</b>
          </div>
          {reason && <p className="mt-1 text-xs text-slate-500">{reason}</p>}

          {!showOverride ? (
            <button onClick={() => setShowOverride(true)} className="mt-2 text-xs text-slate-400 underline">
              Cambiarlo manualmente
            </button>
          ) : (
            <div className="mt-3">
              <FormField label="Nivel de actividad (manual)">
                <Select value={activity} onChange={(e) => override(e.target.value as ActivityLevel)}>
                  {ACTIVITIES.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </Select>
              </FormField>
              {overridden && (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  ⚠️ El nivel sugerido es <b>{ACTIVITY_LABEL[suggested]}</b>. Cambiarlo altera el cálculo de tus
                  calorías; se recomienda dejarlo en el sugerido salvo que estés seguro.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
