import { ReactNode } from "react";
import { cn } from "./utils/cn";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** "sheet" = hoja inferior (mobile), "center" = diálogo centrado. */
  placement?: "sheet" | "center";
  className?: string;
}

/** Contenedor modal genérico con overlay. Cierra al tocar el fondo. */
export function Modal({ open, onClose, children, placement = "sheet", className }: ModalProps) {
  if (!open) return null;
  return (
    <div
      className={cn(
        "fixed inset-0 z-40 flex bg-black/40",
        placement === "sheet" ? "items-end justify-center" : "items-center justify-center p-4",
      )}
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full max-w-md bg-surface p-5",
          placement === "sheet" ? "rounded-t-3xl" : "rounded-token",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {placement === "sheet" && <div className="mx-auto mb-3 h-1 w-10 rounded bg-border" />}
        {children}
      </div>
    </div>
  );
}
