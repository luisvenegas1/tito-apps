import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Button } from "@titoapps/ui";

/**
 * Reemplazo de window.confirm / alert / prompt con la estética de la app.
 *
 *   const dialog = useDialog();
 *   if (await dialog.confirm({ title: "…", message: "…", danger: true })) { … }
 *   await dialog.alert({ title: "No se pudo guardar", message: err.message });
 *   const nota = await dialog.prompt({ title: "Motivo", placeholder: "opcional" });
 *
 * Devuelven promesas, así que se usan igual que los nativos pero sin bloquear
 * el hilo ni mostrar el "localhost dice" del navegador.
 */

type Kind = "confirm" | "alert" | "prompt";

interface Spec {
  kind: Kind;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Pinta la acción en rojo: borrar, fusionar, algo irreversible. */
  danger?: boolean;
  placeholder?: string;
  defaultValue?: string;
}

type Resolver = (value: any) => void;

interface DialogApi {
  confirm: (spec: Omit<Spec, "kind">) => Promise<boolean>;
  alert: (spec: Omit<Spec, "kind">) => Promise<void>;
  prompt: (spec: Omit<Spec, "kind">) => Promise<string | null>;
}

const Ctx = createContext<DialogApi | null>(null);

export function useDialog(): DialogApi {
  const api = useContext(Ctx);
  if (!api) throw new Error("useDialog necesita <DialogProvider> arriba en el árbol");
  return api;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [spec, setSpec] = useState<Spec | null>(null);
  const [value, setValue] = useState("");
  const resolver = useRef<Resolver | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const open = useCallback((s: Spec) => {
    setSpec(s);
    setValue(s.defaultValue ?? "");
    return new Promise<any>((resolve) => { resolver.current = resolve; });
  }, []);

  const close = useCallback((result: any) => {
    resolver.current?.(result);
    resolver.current = null;
    setSpec(null);
  }, []);

  const api: DialogApi = {
    confirm: (s) => open({ ...s, kind: "confirm" }),
    alert: (s) => open({ ...s, kind: "alert" }),
    prompt: (s) => open({ ...s, kind: "prompt" }),
  };

  // Escape cancela; Enter confirma (menos en el textarea del prompt).
  useEffect(() => {
    if (!spec) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close(spec!.kind === "confirm" ? false : spec!.kind === "prompt" ? null : undefined);
      if (e.key === "Enter" && spec!.kind !== "prompt") {
        close(spec!.kind === "confirm" ? true : undefined);
      }
    }
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => { window.removeEventListener("keydown", onKey); clearTimeout(t); };
  }, [spec, close]);

  const cancelValue = spec?.kind === "confirm" ? false : spec?.kind === "prompt" ? null : undefined;

  return (
    <Ctx.Provider value={api}>
      {children}
      {spec && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
          onClick={() => close(cancelValue)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-gray-900">{spec.title}</h3>
            {spec.message && (
              <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-gray-500">
                {spec.message}
              </p>
            )}

            {spec.kind === "prompt" && (
              <input
                ref={inputRef}
                className="input mt-3"
                placeholder={spec.placeholder}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") close(value); }}
              />
            )}

            <div className="mt-4 flex gap-2">
              {spec.kind !== "alert" && (
                <button
                  className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-600"
                  onClick={() => close(cancelValue)}
                >
                  {spec.cancelLabel ?? "Cancelar"}
                </button>
              )}
              {spec.danger ? (
                <button
                  className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white"
                  onClick={() => close(spec.kind === "prompt" ? value : true)}
                >
                  {spec.confirmLabel ?? "Confirmar"}
                </button>
              ) : (
                <Button
                  className="flex-1"
                  onClick={() => close(spec.kind === "confirm" ? true : spec.kind === "prompt" ? value : undefined)}
                >
                  {spec.confirmLabel ?? (spec.kind === "alert" ? "Entendido" : "Confirmar")}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
