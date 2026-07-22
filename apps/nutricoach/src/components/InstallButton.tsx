import { useEffect, useState } from "react";
import { Modal, Button } from "@titoapps/ui";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function detectPlatform(): "ios" | "android" | "other" {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">
        {n}
      </span>
      <span className="text-sm text-slate-700">{children}</span>
    </li>
  );
}

/** Enlace "Instalar app" que abre un modal con instrucciones por plataforma. */
export function InstallButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);
  const platform = detectPlatform();

  useEffect(() => {
    if (isStandalone()) {
      setHidden(true);
      return;
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setHidden(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (hidden) return null;

  const installNow = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={className ?? "font-medium text-green-700 underline"}
      >
        📲 Instalar app
      </button>

      <Modal open={open} onClose={() => setOpen(false)} placement="center">
        <div className="text-center">
          <div className="text-4xl">📲</div>
          <h2 className="mt-1 text-lg font-bold text-slate-900">Instalá NutriCoach</h2>
          <p className="mt-1 text-sm text-slate-500">
            Usala como una app nativa, sin abrir el navegador — y recibí recordatorios.
          </p>
        </div>

        {/* Android / desktop con prompt nativo disponible */}
        {deferred && (
          <div className="mt-4">
            <Button className="w-full" onClick={installNow}>
              Instalar ahora
            </Button>
          </div>
        )}

        {platform === "ios" && (
          <ol className="mt-4 space-y-3">
            <Step n={1}>
              Tocá el botón <strong>Compartir</strong> en Safari <span aria-hidden>􀈂</span> (el cuadrito con la flecha).
            </Step>
            <Step n={2}>
              Elegí <strong>“Agregar a inicio”</strong> (Add to Home Screen).
            </Step>
            <Step n={3}>
              Tocá <strong>“Agregar”</strong> arriba a la derecha. ¡Listo!
            </Step>
          </ol>
        )}

        {platform === "android" && !deferred && (
          <ol className="mt-4 space-y-3">
            <Step n={1}>
              Tocá el menú <strong>⋮</strong> de Chrome (arriba a la derecha).
            </Step>
            <Step n={2}>
              Elegí <strong>“Instalar app”</strong> o “Agregar a pantalla de inicio”.
            </Step>
            <Step n={3}>
              Confirmá con <strong>“Instalar”</strong>. ¡Listo!
            </Step>
          </ol>
        )}

        {platform === "other" && !deferred && (
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <p>
              <strong>iPhone/iPad:</strong> Safari → Compartir → “Agregar a inicio”.
            </p>
            <p>
              <strong>Android:</strong> Chrome → menú ⋮ → “Instalar app”.
            </p>
            <p>
              <strong>Computadora:</strong> en Chrome/Edge, ícono de instalar ⊕ en la barra de direcciones.
            </p>
          </div>
        )}

        <button onClick={() => setOpen(false)} className="mt-5 w-full text-center text-sm text-slate-400">
          Cerrar
        </button>
      </Modal>
    </>
  );
}
