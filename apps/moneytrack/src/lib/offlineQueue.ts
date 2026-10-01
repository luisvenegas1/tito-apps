import { supabase } from "./supabase/client";
import { isDuplicate } from "./errors";

/**
 * Cola offline para la captura rápida (doc 07 §7.6). Cada operación lleva un
 * client_uuid; si un reintento llega dos veces, la base responde unique_violation
 * y lo tratamos como éxito (idempotente).
 */
export type QueuedOp =
  | { id: string; kind: "insert"; table: "transactions" | "shared_entries"; row: Record<string, unknown> }
  | { id: string; kind: "rpc"; fn: "charge_and_expense"; args: Record<string, unknown> };

const KEY = "mt.offline-queue";
const listeners = new Set<() => void>();

function read(): QueuedOp[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as QueuedOp[];
  } catch {
    return [];
  }
}

function write(ops: QueuedOp[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(ops));
  } catch {
    /* almacenamiento lleno o bloqueado: la operación se pierde al recargar */
  }
  listeners.forEach((l) => l());
}

export function pendingCount(): number {
  return read().length;
}

export function onQueueChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function enqueue(op: QueuedOp): void {
  write([...read(), op]);
}

async function runOp(op: QueuedOp): Promise<void> {
  const res =
    op.kind === "insert"
      ? await supabase.from(op.table).insert(op.row)
      : await supabase.rpc(op.fn, op.args);
  if (res.error && !isDuplicate(res.error)) throw res.error;
}

let flushing = false;

/** Envía lo pendiente en orden. Se detiene en el primer fallo de red. Devuelve cuántas se enviaron. */
export async function flushQueue(): Promise<number> {
  if (flushing || !navigator.onLine) return 0;
  flushing = true;
  let sent = 0;
  try {
    for (const op of read()) {
      try {
        await runOp(op);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
        if (/fetch|network|load failed/i.test(msg)) break; // seguimos sin red
        console.error("[MoneyTrack] operación offline descartada", op, e); // error de datos: no bloquear la cola
      }
      write(read().filter((x) => x.id !== op.id));
      sent++;
    }
  } finally {
    flushing = false;
  }
  return sent;
}

/** Ejecuta en línea o encola si no hay red. Devuelve true si quedó en cola. */
export async function runOrQueue(op: QueuedOp): Promise<boolean> {
  if (!navigator.onLine) {
    enqueue(op);
    return true;
  }
  try {
    await runOp(op);
    return false;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? "");
    if (/fetch|network|load failed/i.test(msg)) {
      enqueue(op);
      return true;
    }
    throw e;
  }
}
