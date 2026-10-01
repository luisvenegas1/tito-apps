/**
 * Cuentas compartidas (spec §3.3–5). El rol se deduce de la cuenta:
 * soy acreedor si creditor_id = yo; si no, soy la persona deudora.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireUserId, supabase } from "@/lib/supabase/client";
import { check } from "@/lib/errors";
import { qk } from "@/lib/query";
import { runOrQueue } from "@/lib/offlineQueue";
import { useAuth } from "@/features/auth/AuthProvider";
import type { Currency, SharedAccount, SharedEntry, SharedEntryHistory, SharedEntryType, SharedInvite, Transaction } from "@/lib/supabase/types";

export type Role = "creditor" | "debtor";

export interface AccountView extends SharedAccount {
  role: Role;
  /** Cómo llamo a la otra persona. */
  otherLabel: string;
}

export function toView(a: SharedAccount, myId: string | undefined): AccountView {
  const role: Role = a.creditor_id === myId ? "creditor" : "debtor";
  return { ...a, role, otherLabel: role === "creditor" ? a.debtor_label : a.creditor_label };
}

/** Nombre corto de quien registró un movimiento: "Tú" o la etiqueta del otro. */
export function authorLabel(a: AccountView, userId: string | null, myId: string | undefined): string {
  if (!userId) return "Usuario eliminado";
  if (userId === myId) return "Tú";
  return a.otherLabel;
}

const numE = (e: SharedEntry): SharedEntry => ({ ...e, amount: Number(e.amount) });

export function useAccounts() {
  const { session } = useAuth();
  const myId = session?.user.id;
  return useQuery({
    queryKey: qk.accounts,
    enabled: Boolean(myId),
    queryFn: async () => {
      const rows = check(await supabase.from("shared_accounts").select("*").order("created_at")) as SharedAccount[];
      return rows.map((a) => toView(a, myId));
    },
  });
}

export function useAccount(id: string | undefined) {
  const q = useAccounts();
  return { ...q, data: q.data?.find((a) => a.id === id) };
}

/** Todos los movimientos de todas mis cuentas (para saldos y reportes). */
export function useAllEntries() {
  return useQuery({
    queryKey: qk.allEntries,
    queryFn: async () =>
      (check(await supabase.from("shared_entries").select("*").order("occurred_on")) as SharedEntry[]).map(numE),
  });
}

export function useEntries(accountId: string | undefined) {
  return useQuery({
    queryKey: qk.entries(accountId ?? ""),
    enabled: Boolean(accountId),
    queryFn: async () =>
      (check(await supabase.from("shared_entries").select("*").eq("account_id", accountId!).order("occurred_on")) as SharedEntry[]).map(numE),
  });
}

/** Mis gastos privados ligados a cargos de esta cuenta (solo la deudora los tiene). */
export function useLinkedTransactions(accountId: string | undefined, entryIds: string[]) {
  return useQuery({
    queryKey: [...qk.linkedTx(accountId ?? ""), entryIds.length],
    enabled: Boolean(accountId) && entryIds.length > 0,
    queryFn: async () =>
      (check(await supabase.from("transactions").select("*").in("shared_entry_id", entryIds)) as Transaction[]).map((t) => ({
        ...t,
        amount: Number(t.amount),
      })),
  });
}

/** Ids de cargos que ya pasé a mis gastos (para avisar los pendientes de categorizar). */
export function useMyLinkedEntryIds() {
  return useQuery({
    queryKey: ["linked-tx", "all"],
    queryFn: async () => {
      const rows = check(await supabase.from("transactions").select("shared_entry_id").not("shared_entry_id", "is", null)) as {
        shared_entry_id: string;
      }[];
      return new Set(rows.map((r) => r.shared_entry_id));
    },
  });
}

function invalidateShared(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: qk.allEntries });
  qc.invalidateQueries({ queryKey: qk.tx });
  qc.invalidateQueries({ queryKey: ["linked-tx"] });
}

export interface EntryInput {
  id?: string;
  account_id: string;
  type: SharedEntryType;
  amount: number;
  currency: Currency;
  occurred_on: string;
  concept: string;
  note: string | null;
}

/** Crea (con cola offline) o edita un movimiento del libro. Devuelve true si quedó en cola. */
export function useSaveEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (e: EntryInput): Promise<boolean> => {
      const { id, ...fields } = e;
      if (id) {
        check(await supabase.from("shared_entries").update(fields).eq("id", id));
        return false;
      }
      const client_uuid = crypto.randomUUID();
      return runOrQueue({ id: client_uuid, kind: "insert", table: "shared_entries", row: { ...fields, client_uuid } });
    },
    onSuccess: () => invalidateShared(qc),
  });
}

export function useSetEntryDeleted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, deleted }: { id: string; deleted: boolean }) =>
      check(await supabase.from("shared_entries").update({ deleted_at: deleted ? new Date().toISOString() : null }).eq("id", id)),
    onSuccess: () => invalidateShared(qc),
  });
}

/** "Compré con la extensión": cargo + gasto propio en una sola operación. */
export function useChargeAndExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: { account: string; amount: number; currency: Currency; date: string; concept: string; category: string | null; note: string | null }) => {
      const client_uuid = crypto.randomUUID();
      return runOrQueue({
        id: client_uuid,
        kind: "rpc",
        fn: "charge_and_expense",
        args: {
          p_account: a.account,
          p_amount: a.amount,
          p_currency: a.currency,
          p_date: a.date,
          p_concept: a.concept,
          p_category: a.category,
          p_note: a.note,
          p_client_uuid: client_uuid,
        },
      });
    },
    onSuccess: () => invalidateShared(qc),
  });
}

export function useAddChargeToExpenses() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: { entry: string; category: string | null }) =>
      check(await supabase.rpc("add_charge_to_expenses", { p_entry: a.entry, p_category: a.category })),
    onSuccess: () => invalidateShared(qc),
  });
}

export function useHistory(entryId: string | undefined) {
  return useQuery({
    queryKey: qk.history(entryId ?? ""),
    enabled: Boolean(entryId),
    queryFn: async () =>
      check(
        await supabase.from("shared_entry_history").select("*").eq("entry_id", entryId!).order("changed_at", { ascending: false }),
      ) as SharedEntryHistory[],
  });
}

// ---------------------------------------------------------------------
// Cuentas e invitaciones
// ---------------------------------------------------------------------
export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: { debtor_label: string; creditor_label: string; linked_card: string | null }) => {
      const uid = await requireUserId();
      const row = check(
        await supabase
          .from("shared_accounts")
          .insert({ creditor_id: uid, debtor_label: a.debtor_label.trim(), creditor_label: a.creditor_label.trim(), linked_card: a.linked_card })
          .select("id")
          .single(),
      ) as { id: string };
      return row.id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.accounts }),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<Pick<SharedAccount, "debtor_label" | "creditor_label" | "linked_card" | "notes" | "is_active">>) =>
      check(await supabase.from("shared_accounts").update(patch).eq("id", id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.accounts }),
  });
}

export function useInvites(accountId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: qk.invites(accountId ?? ""),
    enabled: Boolean(accountId) && enabled,
    queryFn: async () =>
      check(
        await supabase.from("shared_account_invites").select("id, account_id, email, expires_at, accepted_at").eq("account_id", accountId!).is("accepted_at", null),
      ) as SharedInvite[],
  });
}

/** Crea la invitación y devuelve el enlace para compartir (el token solo existe aquí). */
export function useCreateInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ accountId, email }: { accountId: string; email: string }) => {
      const token = check(await supabase.rpc("create_invite", { p_account: accountId, p_email: email })) as string;
      return `${window.location.origin}/invitacion/${token}`;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: qk.invites(v.accountId) }),
  });
}

export function useRevokeInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inv: SharedInvite) => check(await supabase.from("shared_account_invites").delete().eq("id", inv.id)),
    onSuccess: (_d, inv) => qc.invalidateQueries({ queryKey: qk.invites(inv.account_id) }),
  });
}

export async function invitePreview(token: string) {
  const rows = check(await supabase.rpc("invite_preview", { p_token: token })) as {
    creditor_label: string;
    debtor_label: string;
    email: string;
    valid: boolean;
  }[];
  return rows[0] ?? null;
}

export async function acceptInvite(token: string): Promise<string> {
  return check(await supabase.rpc("accept_invite", { p_token: token })) as string;
}

// Invitación pendiente mientras la persona se registra o entra.
const PENDING = "mt.pending-invite";
export const pendingInvite = {
  get: () => {
    try {
      return localStorage.getItem(PENDING);
    } catch {
      return null;
    }
  },
  set: (t: string) => {
    try {
      localStorage.setItem(PENDING, t);
    } catch {
      /* sin almacenamiento: se acepta en la misma sesión */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(PENDING);
    } catch {
      /* ignorar */
    }
  },
};
