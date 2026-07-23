import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Spinner, Button } from "@titoapps/ui";
import { exchangeStravaCode, syncStrava } from "./stravaApi";

/** Pantalla a la que Strava redirige tras autorizar (/strava/callback). */
export function StravaCallback() {
  const nav = useNavigate();
  const [status, setStatus] = useState<"working" | "ok" | "error">("working");
  const [msg, setMsg] = useState("Conectando con Strava…");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    (async () => {
      if (error || !code) {
        setStatus("error");
        setMsg("No se autorizó la conexión con Strava.");
        return;
      }
      try {
        await exchangeStravaCode(code);
        setMsg("¡Conectado! Trayendo tus entrenamientos…");
        try {
          await syncStrava();
        } catch {
          /* la primera sync puede reintentarse desde la pantalla */
        }
        setStatus("ok");
        setTimeout(() => nav("/workouts/connect", { replace: true }), 1200);
      } catch (e) {
        setStatus("error");
        setMsg(e instanceof Error ? e.message : "No se pudo conectar con Strava.");
      }
    })();
  }, [nav]);

  return (
    <div className="app-shell flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      {status === "working" && <Spinner />}
      {status === "ok" && <span className="text-4xl">✅</span>}
      {status === "error" && <span className="text-4xl">⚠️</span>}
      <p className="text-slate-600">{msg}</p>
      {status === "error" && (
        <Button onClick={() => nav("/workouts/connect", { replace: true })}>Volver</Button>
      )}
    </div>
  );
}
