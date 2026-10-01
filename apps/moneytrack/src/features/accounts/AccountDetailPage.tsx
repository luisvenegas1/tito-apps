import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button, Input, Modal, Select, cn, useToast } from "@titoapps/ui";
import { useAuth } from "@/features/auth/AuthProvider";
import { balances, ledgerRows } from "@/lib/ledger";
import { formatDay, todayISO, monthRange, currentMonth, addMonths } from "@/lib/dates";
import { formatMoney, parseAmount } from "@/lib/money";
import { errorMessage } from "@/lib/errors";
import { downloadText, toCSV } from "@/lib/csv";
import { PageHeader } from "@/components/PageHeader";
import { Segmented } from "@/components/Segmented";
import { MoneyByCurrency } from "@/components/Money";
import { Empty, ErrorNote, Loading } from "@/components/Empty";
import { useCategories } from "@/features/data/core";
import { useSaveTransaction, useDeleteTransaction } from "@/features/data/transactions";
import {
  authorLabel,
  useAccount,
  useAddChargeToExpenses,
  useEntries,
  useHistory,
  useLinkedTransactions,
  useSaveEntry,
  useSetEntryDeleted,
  useUpdateAccount,
  type AccountView,
} from "@/features/data/shared";
import type { Currency, SharedEntry, SharedEntryType, Transaction } from "@/lib/supabase/types";
import { InvitePanel } from "./InvitePanel";

type Period = "all" | "month" | "prev" | "year";

/** S6: el libro de la cuenta, igual para ambos miembros. */
export function AccountDetailPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { session } = useAuth();
  const myId = session?.user.id;
  const acc = useAccount(id);
  const eq = useEntries(id);
  const entries = eq.data ?? [];
  const chargeIds = entries.filter((e) => e.type === "charge").map((e) => e.id);
  const { data: linked = [] } = useLinkedTransactions(acc.data?.role === "debtor" ? id : undefined, chargeIds);
  const [editing, setEditing] = useState<{ type: SharedEntryType; entry?: SharedEntry } | null>(null);
  const [viewing, setViewing] = useState<SharedEntry | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [period, setPeriod] = useState<Period>("all");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const rows = useMemo(() => ledgerRows(entries).reverse(), [entries]);
  if (acc.isLoading || eq.isLoading) return <Loading />;
  if (!acc.data) return <ErrorNote error={new Error("No encontramos esta cuenta o ya no tienes acceso.")} />;
  const a = acc.data;
  const bal = balances(entries);
  const range = periodRange(period);
  const visible = rows.filter((r) => (showDeleted || !r.entry.deleted_at) && (!range || (r.entry.occurred_on >= range.from && r.entry.occurred_on <= range.to)));
  const linkedByEntry = new Map(linked.map((t) => [t.shared_entry_id!, t]));
  const deletedCount = entries.filter((e) => e.deleted_at).length;

  function exportStatement() {
    const header = ["Fecha", "Concepto", "Cargo", "Abono", "Moneda", "Saldo", "Registró", "Nota"];
    const lines = [...visible].reverse().filter((r) => !r.entry.deleted_at).map((r) => [
      r.entry.occurred_on,
      r.entry.concept,
      r.entry.type === "charge" ? r.entry.amount : "",
      r.entry.type === "payment" ? r.entry.amount : "",
      r.entry.currency,
      r.running,
      authorLabel(a, r.entry.created_by, myId),
      r.entry.note ?? "",
    ]);
    downloadText(`estado-cuenta-${a.otherLabel.toLowerCase()}-${todayISO()}.csv`, toCSV([header, ...lines]));
  }

  return (
    <div>
      <PageHeader
        title={a.otherLabel}
        back="/cuentas"
        action={
          a.role === "creditor" ? (
            <button type="button" onClick={() => setSettingsOpen(true)} className="rounded-full px-3 py-1.5 text-sm font-semibold text-muted hover:bg-surface-subtle">
              Ajustes
            </button>
          ) : undefined
        }
      />

      <section className="mx-4 mt-4 rounded-3xl bg-teal-deep p-5 text-white">
        <p className="text-sm text-mint/80">{a.role === "creditor" ? `${a.otherLabel} te debe` : `Le debes a ${a.otherLabel}`}</p>
        <MoneyByCurrency value={bal} className="mt-1 block text-4xl" />
        {a.linked_card && <p className="mt-2 text-sm text-white/60">{a.linked_card}</p>}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setEditing({ type: "charge" })} className="rounded-xl bg-white py-2.5 font-bold text-navy active:scale-[.98]">
            + Cargo
          </button>
          <button type="button" onClick={() => setEditing({ type: "payment" })} className="rounded-xl bg-white/10 py-2.5 font-bold text-white ring-1 ring-white/20 active:scale-[.98]">
            − Abono
          </button>
        </div>
      </section>

      {a.role === "creditor" && !a.debtor_id && a.is_active && <InvitePanel account={a} startOpen={params.get("invitar") === "1"} />}
      {!a.is_active && <p className="mx-4 mt-3 rounded-xl bg-surface-subtle px-3 py-2 text-sm text-muted">Cuenta archivada. Su historial se conserva.</p>}

      <div className="flex items-center justify-between gap-2 px-4 pt-5">
        <div className="w-36 shrink-0">
        <Select value={period} onChange={(e) => setPeriod(e.target.value as Period)} className="py-1.5 text-sm" aria-label="Período">
          <option value="all">Todo</option>
          <option value="month">Este mes</option>
          <option value="prev">Mes pasado</option>
          <option value="year">Este año</option>
        </Select>
        </div>
        <div className="flex gap-3 text-sm">
          {deletedCount > 0 && (
            <button type="button" className="font-semibold text-muted" onClick={() => setShowDeleted((v) => !v)}>
              {showDeleted ? "Ocultar eliminados" : `Ver eliminados (${deletedCount})`}
            </button>
          )}
          {entries.length > 0 && (
            <button type="button" className="font-semibold text-primary" onClick={exportStatement}>
              Exportar
            </button>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <Empty title="Sin movimientos">Registra el primer cargo o abono con los botones de arriba.</Empty>
      ) : (
        <ul className="card mx-4 mt-2 divide-y divide-border p-0">
          {visible.map(({ entry: e, running }) => {
            const tx = linkedByEntry.get(e.id);
            const changed = e.updated_by !== null;
            return (
              <li key={e.id} className={cn(e.deleted_at && "opacity-50")}>
                <button type="button" onClick={() => setViewing(e)} className="row w-full text-left hover:bg-surface-subtle">
                  <span className="w-11 shrink-0 text-xs text-muted">{formatDay(e.occurred_on)}</span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate font-medium", e.deleted_at && "line-through")}>{e.concept}</span>
                    <span className="block text-xs text-muted">
                      {authorLabel(a, e.created_by, myId)}
                      {changed && " · editado"}
                      {e.deleted_at && " · eliminado"}
                      {a.role === "debtor" && e.type === "charge" && !e.deleted_at && (tx ? " · en tus gastos ✓" : " · sin categorizar")}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className={cn("amount block", e.type === "payment" && "text-emerald-700 dark:text-emerald-300")}>
                      {e.type === "charge" ? "+" : "−"}
                      {formatMoney(e.amount, e.currency)}
                    </span>
                    <span className="text-xs tabular-nums text-muted">{formatMoney(running, e.currency)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="px-6 pb-6 pt-3 text-center text-xs text-muted">
        Los abonos no cuentan como ingreso ni como gasto: solo bajan el saldo de esta cuenta.
      </p>

      <EntrySheet account={a} state={editing} onClose={() => setEditing(null)} />
      <EntryDetailSheet
        account={a}
        entry={viewing}
        linkedTx={viewing ? linkedByEntry.get(viewing.id) : undefined}
        onClose={() => setViewing(null)}
        onEdit={(e) => {
          setViewing(null);
          setEditing({ type: e.type, entry: e });
        }}
      />
      {a.role === "creditor" && <AccountSettingsSheet account={a} open={settingsOpen} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

function periodRange(p: Period): { from: string; to: string } | null {
  if (p === "month") return monthRange(currentMonth());
  if (p === "prev") return monthRange(addMonths(currentMonth(), -1));
  if (p === "year") return { from: `${currentMonth().slice(0, 4)}-01-01`, to: `${currentMonth().slice(0, 4)}-12-31` };
  return null;
}

function EntrySheet({ account, state, onClose }: { account: AccountView; state: { type: SharedEntryType; entry?: SharedEntry } | null; onClose: () => void }) {
  const save = useSaveEntry();
  const toast = useToast();
  const [type, setType] = useState<SharedEntryType>("charge");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("CRC");
  const [date, setDate] = useState(todayISO());
  const [concept, setConcept] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!state) return;
    const e = state.entry;
    setType(state.type);
    setAmount(e ? String(e.amount).replace(".", ",") : "");
    setCurrency(e?.currency ?? "CRC");
    setDate(e?.occurred_on ?? todayISO());
    setConcept(e?.concept ?? "");
    setNote(e?.note ?? "");
  }, [state]);

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    const value = parseAmount(amount);
    if (!value || value <= 0) return toast.show("Escribe un monto mayor que cero", "danger");
    try {
      const queued = await save.mutateAsync({
        id: state?.entry?.id,
        account_id: account.id,
        type,
        amount: value,
        currency,
        occurred_on: date,
        concept: concept.trim() || (type === "charge" ? "Cargo" : "Abono"),
        note: note.trim() || null,
      });
      toast.show(queued ? "Guardado sin conexión: se enviará al reconectar" : type === "charge" ? "Cargo guardado" : "Abono guardado", "success");
      onClose();
    } catch (e) {
      toast.show(errorMessage(e), "danger");
    }
  }

  const who = account.otherLabel;
  return (
    <Modal open={Boolean(state)} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <h2 className="text-lg font-bold">{state?.entry ? "Editar movimiento" : type === "charge" ? "Nuevo cargo" : "Nuevo abono"}</h2>
        <Segmented label="Tipo" className="w-full" value={type} onChange={setType} options={[{ value: "charge", label: "Cargo" }, { value: "payment", label: "Abono" }]} />
        <p className="text-sm text-muted">
          {type === "charge"
            ? account.role === "creditor" ? `Sube lo que ${who} te debe.` : `Sube lo que le debes a ${who}.`
            : account.role === "creditor" ? `Baja lo que ${who} te debe. No cuenta como ingreso.` : `Baja lo que le debes a ${who}.`}
        </p>
        <div className="flex gap-2">
          <label className="flex-1">
            <span className="label">Monto</span>
            <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="amount text-lg" required autoFocus />
          </label>
          <div>
            <span className="label">Moneda</span>
            <Segmented label="Moneda" value={currency} onChange={setCurrency} options={[{ value: "CRC", label: "₡" }, { value: "USD", label: "$" }]} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="label">Concepto</span>
            <Input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder={type === "charge" ? "Súper" : "Depósito"} />
          </label>
          <label>
            <span className="label">Fecha</span>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
        </div>
        <label className="block">
          <span className="label">Nota</span>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" />
        </label>
        <Button type="submit" fullWidth disabled={save.isPending}>{state?.entry ? "Guardar cambios" : "Guardar"}</Button>
      </form>
    </Modal>
  );
}

function EntryDetailSheet({
  account,
  entry,
  linkedTx,
  onClose,
  onEdit,
}: {
  account: AccountView;
  entry: SharedEntry | null;
  linkedTx?: Transaction;
  onClose: () => void;
  onEdit: (e: SharedEntry) => void;
}) {
  const { session } = useAuth();
  const myId = session?.user.id;
  const { data: history = [] } = useHistory(entry?.id);
  const setDeleted = useSetEntryDeleted();
  const addToExpenses = useAddChargeToExpenses();
  const saveTx = useSaveTransaction();
  const delTx = useDeleteTransaction();
  const { data: categories = [] } = useCategories();
  const toast = useToast();
  const [categoryId, setCategoryId] = useState("");

  if (!entry) return null;
  const isDebtorCharge = account.role === "debtor" && entry.type === "charge";
  const mismatch =
    linkedTx && (entry.deleted_at || linkedTx.amount !== entry.amount || linkedTx.currency !== entry.currency || linkedTx.occurred_on !== entry.occurred_on);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.show(ok, "success");
      onClose();
    } catch (e) {
      toast.show(errorMessage(e), "danger");
    }
  };

  return (
    <Modal open onClose={onClose} className="max-h-[90vh] overflow-y-auto">
      <p className="text-sm text-muted">{entry.type === "charge" ? "Cargo" : "Abono"} · {formatDay(entry.occurred_on)}</p>
      <h2 className="mt-1 text-xl font-bold">{entry.concept}</h2>
      <p className="amount mt-1 text-3xl">{formatMoney(entry.amount, entry.currency)}</p>
      {entry.note && <p className="mt-2 text-sm">{entry.note}</p>}
      <p className="mt-2 text-sm text-muted">Registró: {authorLabel(account, entry.created_by, myId)}</p>

      {isDebtorCharge && !entry.deleted_at && !linkedTx && (
        <div className="mt-4 rounded-2xl bg-mint/25 p-3">
          <p className="text-sm font-semibold">Esta compra es un gasto tuyo</p>
          <p className="text-xs text-muted">Pásala a tus gastos para que cuente en tu mes.</p>
          <div className="mt-2 flex gap-2">
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Categoría">
              <option value="">Sin categoría</option>
              {categories.filter((c) => !c.is_archived && c.kind_hint === "expense").map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </Select>
            <Button onClick={() => run(() => addToExpenses.mutateAsync({ entry: entry.id, category: categoryId || null }), "Agregado a tus gastos")}>Agregar</Button>
          </div>
        </div>
      )}

      {mismatch && linkedTx && (
        <div className="mt-4 rounded-2xl border border-warning/50 bg-warning/10 p-3 text-sm">
          <p className="font-semibold">{entry.deleted_at ? "Este cargo fue eliminado del libro" : "El cargo cambió en el libro"}</p>
          <p className="text-muted">Tu gasto tiene {formatMoney(linkedTx.amount, linkedTx.currency)} del {formatDay(linkedTx.occurred_on)}.</p>
          <div className="mt-2 flex gap-2">
            {entry.deleted_at ? (
              <Button size="sm" variant="danger" onClick={() => run(() => delTx.mutateAsync(linkedTx.id), "Gasto borrado")}>Borrar mi gasto</Button>
            ) : (
              <Button
                size="sm"
                onClick={() =>
                  run(
                    () => saveTx.mutateAsync({ ...linkedTx, amount: entry.amount, currency: entry.currency, occurred_on: entry.occurred_on }),
                    "Gasto actualizado",
                  )
                }
              >
                Actualizar mi gasto
              </Button>
            )}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <section className="mt-5">
          <h3 className="text-sm font-semibold text-muted">Historial de cambios</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {history.map((h) => (
              <li key={h.id} className="rounded-xl bg-surface-subtle px-3 py-2">
                <span className="font-semibold">{authorLabel(account, h.changed_by, myId)}</span>{" "}
                {h.action === "delete" ? "lo eliminó" : h.action === "restore" ? "lo restauró" : "lo editó"} el {formatDay(h.changed_at.slice(0, 10))}
                {h.action === "update" && (
                  <span className="block text-xs text-muted">
                    Antes: {h.old_row.concept} · {formatMoney(Number(h.old_row.amount), h.old_row.currency)} · {formatDay(h.old_row.occurred_on)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6 flex gap-2">
        {entry.deleted_at ? (
          <Button fullWidth variant="outline" onClick={() => run(() => setDeleted.mutateAsync({ id: entry.id, deleted: false }), "Movimiento restaurado")}>Restaurar</Button>
        ) : (
          <>
            <Button fullWidth variant="outline" onClick={() => onEdit(entry)}>Editar</Button>
            <Button fullWidth variant="outline" className="text-deficit" onClick={() => run(() => setDeleted.mutateAsync({ id: entry.id, deleted: true }), "Movimiento eliminado")}>
              Eliminar
            </Button>
          </>
        )}
      </div>
      <p className="mt-3 text-center text-xs text-muted">Eliminar no borra el registro: queda en el historial y se puede restaurar.</p>
    </Modal>
  );
}

function AccountSettingsSheet({ account, open, onClose }: { account: AccountView; open: boolean; onClose: () => void }) {
  const update = useUpdateAccount();
  const toast = useToast();
  const [debtor, setDebtor] = useState(account.debtor_label);
  const [creditor, setCreditor] = useState(account.creditor_label);
  const [card, setCard] = useState(account.linked_card ?? "");

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      await update.mutateAsync({ id: account.id, debtor_label: debtor.trim(), creditor_label: creditor.trim(), linked_card: card.trim() || null });
      toast.show("Cuenta actualizada", "success");
      onClose();
    } catch (err) {
      toast.show(errorMessage(err), "danger");
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <h2 className="text-lg font-bold">Ajustes de la cuenta</h2>
        <label className="block">
          <span className="label">Nombre de la otra persona</span>
          <Input value={debtor} onChange={(e) => setDebtor(e.target.value)} required />
        </label>
        <label className="block">
          <span className="label">Cómo te ve esa persona</span>
          <Input value={creditor} onChange={(e) => setCreditor(e.target.value)} required />
        </label>
        <label className="block">
          <span className="label">Tarjeta asociada</span>
          <Input value={card} onChange={(e) => setCard(e.target.value)} />
        </label>
        <Button type="submit" fullWidth>Guardar</Button>
        <Button
          type="button"
          variant="outline"
          fullWidth
          onClick={async () => {
            await update.mutateAsync({ id: account.id, is_active: !account.is_active });
            toast.show(account.is_active ? "Cuenta archivada" : "Cuenta reactivada");
            onClose();
          }}
        >
          {account.is_active ? "Archivar cuenta" : "Reactivar cuenta"}
        </Button>
      </form>
    </Modal>
  );
}
