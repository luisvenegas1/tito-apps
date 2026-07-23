import { useAddWater } from "./useHealth";

const AMOUNTS = [250, 500, 750];

/** Registro rápido de agua en un toque. */
export function QuickWater() {
  const addWater = useAddWater();
  return (
    <div className="card">
      <div className="metric-label mb-2">💧 Agregar agua</div>
      <div className="flex gap-2">
        {AMOUNTS.map((ml) => (
          <button
            key={ml}
            onClick={() => addWater.mutate(ml)}
            disabled={addWater.isPending}
            className="flex-1 rounded-xl bg-sky-100 py-3 text-base font-bold text-sky-700 active:scale-95 disabled:opacity-50"
          >
            +{ml} ml
          </button>
        ))}
      </div>
    </div>
  );
}
