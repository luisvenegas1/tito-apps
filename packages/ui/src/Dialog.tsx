import { ReactNode } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

export interface DialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

/** Diálogo de confirmación centrado (sí/no). */
export function Dialog({
  open, title, description, confirmLabel = "Confirmar", cancelLabel = "Cancelar",
  onConfirm, onCancel, danger,
}: DialogProps) {
  return (
    <Modal open={open} onClose={onCancel} placement="center">
      <h3 className="text-lg font-bold text-fg">{title}</h3>
      {description && <div className="mt-1 text-sm text-muted">{description}</div>}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>{cancelLabel}</Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}
