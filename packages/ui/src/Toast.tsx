import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import { cn } from "./utils/cn";

type ToastTone = "neutral" | "success" | "danger";
interface ToastItem { id: number; message: string; tone: ToastTone; }

interface ToastCtx {
  show: (message: string, tone?: ToastTone) => void;
}

const Ctx = createContext<ToastCtx>({ show: () => {} });

/** Envolvé la app con <ToastProvider> y usá useToast().show("..."). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, tone: ToastTone = "neutral") => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs, { id, message, tone }]);
    setTimeout(() => setItems((xs) => xs.filter((t) => t.id !== id)), 2000);
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "rounded-full px-4 py-2 text-sm text-white shadow-lg",
              t.tone === "success" ? "bg-success" : t.tone === "danger" ? "bg-danger" : "bg-gray-900",
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  return useContext(Ctx);
}
