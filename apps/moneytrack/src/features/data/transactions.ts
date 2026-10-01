import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireUserId, supabase } from "@/lib/supabase/client";
import { check } from "@/lib/errors";
import { qk } from "@/lib/query";
import { runOrQueue } from "@/lib/offlineQueue";
import type { Attachment, Transaction, TransactionInput } from "@/lib/supabase/types";

const num = (t: Transaction): Transaction => ({ ...t, amount: Number(t.amount), my_share: Number(t.my_share) });

/** Movimientos privados en un rango de fechas (incluidas). */
export function useTransactions(from: string, to: string) {
  return useQuery({
    queryKey: qk.txRange(from, to),
    queryFn: async () =>
      (
        check(
          await supabase
            .from("transactions")
            .select("*")
            .gte("occurred_on", from)
            .lte("occurred_on", to)
            .order("occurred_on", { ascending: false })
            .order("created_at", { ascending: false }),
        ) as Transaction[]
      ).map(num),
  });
}

export function useTransaction(id: string | undefined) {
  return useQuery({
    queryKey: qk.txOne(id ?? ""),
    enabled: Boolean(id),
    queryFn: async () => num(check(await supabase.from("transactions").select("*").eq("id", id!).single()) as Transaction),
  });
}

function invalidateMoney(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: qk.tx });
  qc.invalidateQueries({ queryKey: qk.payments });
  qc.invalidateQueries({ queryKey: ["linked-tx"] });
}

/** Crea (con cola offline) o actualiza un movimiento. Devuelve true si quedó en cola. */
export function useSaveTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TransactionInput): Promise<boolean> => {
      const uid = await requireUserId();
      // Quitamos columnas que no se escriben desde el cliente (por si llega una fila completa).
      const { id, user_id: _u, created_at: _c, updated_at: _up, ...fields } = input as TransactionInput & Partial<Transaction>;
      if (id) {
        check(await supabase.from("transactions").update(fields).eq("id", id));
        return false;
      }
      const row = { ...fields, user_id: uid, client_uuid: fields.client_uuid ?? crypto.randomUUID() };
      return runOrQueue({ id: row.client_uuid, kind: "insert", table: "transactions", row });
    },
    onSuccess: () => invalidateMoney(qc),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => check(await supabase.from("transactions").delete().eq("id", id)),
    onSuccess: () => invalidateMoney(qc),
  });
}

// ---------------------------------------------------------------------
// Recibos (bucket privado, URL firmada de corta duración)
// ---------------------------------------------------------------------
export function useAttachments(txId: string | undefined) {
  return useQuery({
    queryKey: qk.attachments(txId ?? ""),
    enabled: Boolean(txId),
    queryFn: async () => {
      const rows = check(await supabase.from("attachments").select("*").eq("transaction_id", txId!)) as Attachment[];
      return Promise.all(
        rows.map(async (a) => {
          const { data } = await supabase.storage.from("receipts").createSignedUrl(a.storage_path, 300);
          return { ...a, url: data?.signedUrl ?? null };
        }),
      );
    },
  });
}

export function useUploadReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ txId, file }: { txId: string; file: File }) => {
      const uid = await requireUserId();
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${uid}/${txId}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("receipts").upload(path, file, { contentType: file.type });
      if (up.error) throw up.error;
      check(await supabase.from("attachments").insert({ user_id: uid, transaction_id: txId, storage_path: path, mime_type: file.type }));
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: qk.attachments(v.txId) }),
  });
}

export function useDeleteReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: Attachment) => {
      await supabase.storage.from("receipts").remove([a.storage_path]);
      check(await supabase.from("attachments").delete().eq("id", a.id));
    },
    onSuccess: (_d, a) => qc.invalidateQueries({ queryKey: qk.attachments(a.transaction_id) }),
  });
}
