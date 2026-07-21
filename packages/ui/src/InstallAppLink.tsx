import { useEffect, useState } from "react";

/**
 * Enlace "Instalar app" para PWAs.
 *
 * El navegador dispara `beforeinstallprompt` solo cuando la app es instalable
 * (hay manifest + service worker, se sirve por https y no está ya instalada).
 * Si no llega ese evento —iOS, o ya instalada— mostramos instrucciones en vez
 * de un botón que no haría nada.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function InstallAppLink({ className }: { className?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    function onPrompt(e: Event) {
      e.preventDefault(); // evitamos el mini-infobar y lo disparamos nosotros
      setDeferred(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstalled(true);
      setDeferred(null);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Ya está instalada: no tiene sentido ofrecerlo.
  if (installed) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  if (deferred) {
    return (
      <button type="button" onClick={install} className={className}>
        📲 Instalar app
      </button>
    );
  }

  // iOS no expone la API: se instala a mano desde Compartir.
  if (isIos()) {
    return (
      <>
        <button type="button" onClick={() => setShowIosHelp((v) => !v)} className={className}>
          📲 Instalar app
        </button>
        {showIosHelp && (
          <span className="mt-1 block text-[11px]">
            Tocá Compartir <span aria-hidden>􀈂</span> y elegí “Agregar a inicio”.
          </span>
        )}
      </>
    );
  }

  return null;
}
