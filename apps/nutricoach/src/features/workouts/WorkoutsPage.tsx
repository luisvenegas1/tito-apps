import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, PageHeader, Input, FormField, Select, EmptyState } from "@titoapps/ui";
import { NumberInput } from "@/components/ui/NumberInput";
import { estimateCalories, WORKOUT_LABELS, type WorkoutType } from "@titoapps/health";
import { useAddWorkout, useWorkouts, useDeleteWorkout, useLatestWeight } from "@/features/health/useHealth";
import { todayISO, dayLabel, timestampForDay } from "@/lib/date";

const TYPES = Object.keys(WORKOUT_LABELS) as WorkoutType[];

export function WorkoutsPage() {
  const { data: weight } = useLatestWeight();
  const { data: workouts = [] } = useWorkouts();

  // Día al que se registra (permite anotar entrenamientos de días pasados).
  const [date, setDate] = useState(todayISO());
  const isToday = date === todayISO();
  const add = useAddWorkout(date);
  const del = useDeleteWorkout();

  const shiftDay = (days: number) => {
    const d = new Date(`${date}T00:00:00`);
    d.setDate(d.getDate() + days);
    const iso = todayISO(d);
    if (iso <= todayISO()) setDate(iso);
  };

  const [type, setType] = useState<WorkoutType>("running");
  const [minutes, setMinutes] = useState(30);
  const [name, setName] = useState("");
  // Estimación automática de kcal por MET + peso; editable.
  const estimated = estimateCalories(type, minutes, weight ?? 70);
  const [kcal, setKcal] = useState<number | null>(null);
  const kcalValue = kcal ?? estimated;

  const submit = () => {
    add.mutate(
      {
        type,
        name: name.trim() || WORKOUT_LABELS[type],
        duration_min: minutes,
        kcal_burned: kcalValue,
        source: "manual",
        performed_at: timestampForDay(date), // hoy → ahora; días pasados → mediodía de esa fecha
      },
      {
        onSuccess: () => {
          setName("");
          setKcal(null);
        },
      },
    );
  };

  return (
    <div className="p-4">
      <PageHeader title="Entrenamientos" subtitle="Registrá tu actividad" />

      {/* Selector de día: registrá hoy o un entrenamiento de días pasados */}
      <div className="mt-3 flex items-center justify-between rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
        <button onClick={() => shiftDay(-1)} className="px-2 text-lg text-slate-500 active:scale-90" aria-label="Día anterior">‹</button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">{dayLabel(date)}</span>
          <input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500"
          />
        </div>
        <button
          onClick={() => shiftDay(1)}
          disabled={isToday}
          className="px-2 text-lg text-slate-500 active:scale-90 disabled:opacity-30"
          aria-label="Día siguiente"
        >
          ›
        </button>
      </div>
      {!isToday && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-700">
          Estás registrando para <b>{dayLabel(date)}</b>, no para hoy.
        </p>
      )}

      <div className="mt-4 space-y-3">
        <FormField label="Actividad">
          <Select
            value={type}
            onChange={(e) => {
              setType(e.target.value as WorkoutType);
              setKcal(null);
            }}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {WORKOUT_LABELS[t]}
              </option>
            ))}
          </Select>
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Duración (min)">
            <NumberInput
              value={minutes}
              onValueChange={(n) => {
                setMinutes(n);
                setKcal(null);
              }}
            />
          </FormField>
          <FormField label="Calorías quemadas">
            <NumberInput value={kcalValue} onValueChange={setKcal} />
          </FormField>
        </div>
        <FormField label="Nombre (opcional)">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={WORKOUT_LABELS[type]} />
        </FormField>
        <p className="text-xs text-slate-400">
          Estimado por MET y tu peso ({weight ?? 70} kg): {estimated} kcal. Podés ajustarlo.
        </p>
        <Button className="w-full" onClick={submit} disabled={add.isPending || minutes <= 0}>
          {add.isPending ? "Guardando…" : "Registrar entrenamiento"}
        </Button>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-500">Recientes</h3>
        <Link to="/workouts/connect" className="text-sm font-medium text-green-600">
          Conectar dispositivo →
        </Link>
      </div>

      {workouts.length === 0 ? (
        <div className="mt-2">
          <EmptyState title="Sin entrenamientos" description="Registrá tu primera actividad arriba." />
        </div>
      ) : (
        <ul className="mt-2 space-y-2">
          {workouts.map((w) => (
            <li key={w.id} className="card flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-800">
                  {w.name || WORKOUT_LABELS[(w.type as WorkoutType) ?? "other"] || w.type}
                  {w.source !== "manual" && (
                    <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500">
                      {w.source.replace("_", " ")}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400">
                  {w.duration_min ? `${w.duration_min} min · ` : ""}
                  {w.kcal_burned} kcal · {new Date(w.performed_at).toLocaleDateString()}
                </div>
              </div>
              <button onClick={() => del.mutate(w.id)} className="text-sm text-red-500" aria-label={`Eliminar ${w.name}`}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
