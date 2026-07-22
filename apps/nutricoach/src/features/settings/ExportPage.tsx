import { useState } from "react";
import { Button, PageHeader, Spinner } from "@titoapps/ui";
import { useAuth } from "@/features/auth/AuthProvider";
import { toCsv, downloadFile } from "@/lib/csv";
import { fetchExportBundle } from "./exportApi";
import { todayISO } from "@/lib/date";

/** Exportación de datos del usuario (portabilidad): CSV por tabla o JSON completo. */
export function ExportPage() {
  const { session } = useAuth();
  const [loading, setLoading] = useState<null | "csv" | "json">(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const run = async (kind: "csv" | "json") => {
    setError(null);
    setMsg(null);
    setLoading(kind);
    try {
      const bundle = await fetchExportBundle(session!.user.id);
      const stamp = todayISO();
      if (kind === "json") {
        downloadFile(`nutricoach-${stamp}.json`, JSON.stringify(bundle, null, 2), "application/json");
      } else {
        downloadFile(`nutricoach-comidas-${stamp}.csv`, toCsv(bundle.logItems), "text/csv");
        downloadFile(`nutricoach-pesos-${stamp}.csv`, toCsv(bundle.weights), "text/csv");
        downloadFile(`nutricoach-entrenamientos-${stamp}.csv`, toCsv(bundle.workouts), "text/csv");
      }
      setMsg(
        `Exportado: ${bundle.logItems.length} registros de comida, ${bundle.weights.length} pesos, ${bundle.workouts.length} entrenamientos.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo exportar.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-4">
      <PageHeader title="Exportar mis datos" subtitle="Tus datos son tuyos" />
      <p className="mt-4 text-sm text-slate-500">
        Descargá todo tu historial. El CSV genera un archivo por tabla; el JSON incluye todo en un solo archivo.
      </p>
      <div className="mt-4 space-y-3">
        <Button className="w-full" onClick={() => run("csv")} disabled={loading !== null}>
          {loading === "csv" ? <Spinner /> : "Exportar CSV"}
        </Button>
        <Button variant="secondary" className="w-full" onClick={() => run("json")} disabled={loading !== null}>
          {loading === "json" ? <Spinner /> : "Exportar JSON"}
        </Button>
        {msg && <p className="text-sm text-green-700">{msg}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
