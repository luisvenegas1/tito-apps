import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Spinner, Button } from "@titoapps/ui";
import { exchangeDeviceCode, syncDevice } from "./deviceApi";
import type { DeviceProvider } from "@/lib/supabase/types";

/** Callback de OAuth para Fitbit/Oura. El proveedor viene en el parámetro `state`. */
export function DeviceCallback() {
  const nav = useNavigate();
  const [status, setStatus] = useState<"working" | "ok" | "error">("working");
  const [msg, setMsg] = useState("Conectando…");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const provider = params.get("state") as DeviceProvider | null;
    const error = params.get("error");

    (async () => {
      if (error || !code || (provider !== "fitbit" && provider !== "oura")) {
        setStatus("error");
        setMsg("No se autorizó la conexión.");
        return;
      }
      try {
        await exchangeDeviceCode(provider, code);
        setMsg("¡Conectado! Trayendo tus entrenamientos…");
        try {
          await syncDevice(provider);
        } catch {
          /* se puede reintentar desde la pantalla */
        }
        setStatus("ok");
        setTimeout(() => nav("/workouts/connect", { replace: true }), 1200);
      } catch (e) {
        setStatus("error");
        setMsg(e instanceof Error ? e.message : "No se pudo conectar.");
      }
    })();
  }, [nav]);

  return (
    <div className="app-shell flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      {status === "working" && <Spinner />}
      {status === "ok" && <span className="text-4xl">✅</span>}
      {status === "error" && <span className="text-4xl">⚠️</span>}
      <p className="text-slate-600">{msg}</p>
      {status === "error" && <Button onClick={() => nav("/workouts/connect", { replace: true })}>Volver</Button>}
    </div>
  );
}
