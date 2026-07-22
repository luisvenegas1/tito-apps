import { Link } from "react-router-dom";
import { useProactiveTip } from "./useCoach";

/** Recomendación proactiva del coach, mostrada en el dashboard. */
export function CoachTip() {
  const { data, isLoading } = useProactiveTip();
  if (isLoading) return null;
  if (!data?.reply) return null;

  return (
    <Link to="/coach" className="block">
      <div className="card border-l-4 border-l-green-500 bg-green-50/60">
        <div className="flex items-start gap-3">
          <span className="text-xl" aria-hidden>💬</span>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-green-700">Coach</div>
            <p className="mt-0.5 text-sm text-slate-700">{data.reply}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
