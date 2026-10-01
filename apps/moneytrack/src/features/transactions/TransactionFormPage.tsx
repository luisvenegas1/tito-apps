import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button, Dialog, Input, Select, useToast } from "@titoapps/ui";
import { todayISO } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { parseAmount, CURRENCY_OPTIONS, CURRENCY_SYMBOL, formatMoney } from "@/lib/money";
import { hasRateNear, rateFor } from "@/lib/rates";
import { formatDay } from "@/lib/dates";
import { PageHeader } from "@/components/PageHeader";
import { Segmented } from "@/components/Segmented";
import { Loading } from "@/components/Empty";
import { useCategories, usePeople, useRates } from "@/features/data/core";
import {
  useAttachments,
  useDeleteReceipt,
  useDeleteTransaction,
  useSaveTransaction,
  useTransaction,
  useUploadReceipt,
} from "@/features/data/transactions";
import type { Currency, PaidBy, TxnKind, TxnScope } from "@/lib/supabase/types";
import { KIND_LABEL } from "./TransactionsPage";

/** Formulario completo (S4): crear, editar, duplicar, borrar, recibos. */
export function TransactionFormPage() {
  const { id } = useParams();
  const isNew = !id || id === "nuevo";
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const existing = useTransaction(isNew ? undefined : id);
  const { data: categories = [] } = useCategories();
  const { data: people = [] } = usePeople();
  const save = useSaveTransaction();
  const del = useDeleteTransaction();

  const [kind, setKind] = useState<TxnKind>((params.get("kind") as TxnKind) || "expense");
  const [amount, setAmount] = useState(params.get("amount")?.replace(".", ",") ?? "");
  const [currency, setCurrency] = useState<Currency>((params.get("currency") as Currency) || "CRC");
  const [date, setDate] = useState(todayISO());
  const [categoryId, setCategoryId] = useState(params.get("category") ?? "");
  const [paidBy, setPaidBy] = useState<PaidBy>("me");
  const [personId, setPersonId] = useState("");
  const [scope, setScope] = useState<TxnScope>("personal");
  const [myShare, setMyShare] = useState("50");
  const [note, setNote] = useState("");
  // TC del día: vacío = automático (la base congela el del historial a esa fecha).
  const [fx, setFx] = useState("");
  const [fxManual, setFxManual] = useState(false);
  const { data: rates = [] } = useRates();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = existing.data;
    if (!t) return;
    setKind(t.kind);
    setAmount(String(t.amount).replace(".", ","));
    setCurrency(t.currency);
    setDate(t.occurred_on);
    setCategoryId(t.category_id ?? "");
    setPaidBy(t.paid_by);
    setPersonId(t.payer_person_id ?? "");
    setScope(t.scope);
    setMyShare(String(Math.round(t.my_share * 100)));
    setNote(t.note ?? "");
    setFx(t.fx_rate ? String(t.fx_rate).replace(".", ",") : "");
    setFxManual(false);
  }, [existing.data]);

  if (!isNew && existing.isLoading) return <Loading />;

  const isIn = kind === "income" || kind === "reimbursement";
  const cats = categories.filter((c) => !c.is_archived || c.id === categoryId).filter((c) => (isIn ? c.kind_hint === "income" : c.kind_hint !== "income"));

  async function submit(e: FormEvent, duplicate = false) {
    e.preventDefault();
    setError(null);
    const value = parseAmount(amount);
    if (!value || value <= 0) return setError("Escribe un monto mayor que cero.");
    try {
      await save.mutateAsync({
        id: isNew || duplicate ? undefined : id,
        kind,
        amount: value,
        currency,
        occurred_on: date,
        category_id: categoryId || null,
        paid_by: isIn ? "me" : paidBy,
        payer_person_id: paidBy === "other" ? personId || null : null,
        scope: isIn ? "personal" : scope,
        my_share: Math.min(100, Math.max(0, Number(myShare) || 50)) / 100,
        fx_rate: currency === "CRC" ? null : parseAmount(fx) || null,
        shared_entry_id: duplicate ? null : existing.data?.shared_entry_id ?? null,
        recurring_template_id: duplicate ? null : existing.data?.recurring_template_id ?? null,
        linked_transaction_id: existing.data?.linked_transaction_id ?? null,
        note: note.trim() || null,
        tags: existing.data?.tags ?? [],
        client_uuid: null,
      });
      toast.show(duplicate ? "Duplicado" : isNew ? "Guardado" : "Cambios guardados", "success");
      navigate(-1);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div>
      <PageHeader title={isNew ? "Nuevo movimiento" : "Editar movimiento"} back />
      <form onSubmit={submit} className="space-y-4 px-4 pt-4">
        <Segmented
          label="Tipo"
          className="w-full"
          value={kind}
          onChange={setKind}
          options={(["expense", "income", "advance", "reimbursement"] as TxnKind[]).map((k) => ({ value: k, label: KIND_LABEL[k] }))}
        />
        {kind === "advance" && <p className="text-sm text-muted">Dinero que adelantas por alguien y te van a devolver.</p>}
        {kind === "reimbursement" && <p className="text-sm text-muted">Dinero que te devuelven por un adelanto. Cuenta como "recuperado".</p>}

        <div className="flex gap-2">
          <label className="flex-1">
            <span className="label">Monto</span>
            <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" required className="amount text-lg" />
          </label>
          <div>
            <span className="label">Moneda</span>
            <Segmented
              label="Moneda"
              value={currency}
              onChange={(c) => {
                setCurrency(c);
                if (!fxManual) setFx("");
              }}
              options={CURRENCY_OPTIONS}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="label">Fecha</span>
            <Input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                if (!fxManual) setFx(""); // otra fecha: otro TC
              }}
              required
            />
          </label>
          <label>
            <span className="label">Categoría</span>
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Sin categoría</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </Select>
          </label>
        </div>

        {currency !== "CRC" && (
          <FxField
            currency={currency}
            date={date}
            amount={parseAmount(amount) ?? 0}
            value={fx}
            suggested={rateFor(date, currency, rates, isIn ? "buy" : "sell")}
            known={hasRateNear(date, currency, rates)}
            isIn={isIn}
            onChange={(v) => {
              setFx(v);
              setFxManual(v !== "");
            }}
          />
        )}

        {!isIn && (
          <>
            <div>
              <span className="label">¿Quién lo paga?</span>
              <Segmented
                label="Pagado por"
                className="w-full"
                value={paidBy}
                onChange={(v) => {
                  setPaidBy(v);
                  if (v === "partner") setScope("household");
                }}
                options={[{ value: "me", label: "Yo" }, { value: "partner", label: "Pareja" }, { value: "shared", label: "Compartido" }, { value: "other", label: "Otra" }]}
              />
            </div>
            {paidBy === "shared" && (
              <label className="block">
                <span className="label">Mi parte (%)</span>
                <Input type="number" min={0} max={100} value={myShare} onChange={(e) => setMyShare(e.target.value)} />
              </label>
            )}
            {paidBy === "other" && (
              <label className="block">
                <span className="label">Persona</span>
                <Select value={personId} onChange={(e) => setPersonId(e.target.value)}>
                  <option value="">Elegir…</option>
                  {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
                {people.length === 0 && <span className="mt-1 block text-xs text-muted">Agrega personas en Más → Personas.</span>}
              </label>
            )}
            <div>
              <span className="label">Ámbito</span>
              <Segmented label="Ámbito" className="w-full" value={scope} onChange={setScope} options={[{ value: "personal", label: "Personal" }, { value: "household", label: "Hogar" }, { value: "shared", label: "Compartido" }]} />
              {paidBy === "partner" && <p className="mt-1 text-xs text-muted">Sigue contando como gasto del hogar con su monto real, pero no sale de tu bolsillo.</p>}
            </div>
          </>
        )}

        <label className="block">
          <span className="label">Nota</span>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" />
        </label>

        {existing.data?.shared_entry_id && (
          <p className="rounded-xl bg-mint/30 px-3 py-2 text-sm">Este gasto viene de una compra con la extensión. Si lo cambias aquí, el libro compartido no cambia.</p>
        )}

        {error && <p role="alert" className="text-sm text-deficit">{error}</p>}

        <Button type="submit" fullWidth size="lg" disabled={save.isPending}>
          {save.isPending ? "Guardando…" : isNew ? "Guardar" : "Guardar cambios"}
        </Button>

        {!isNew && (
          <div className="flex gap-2">
            <Button type="button" variant="outline" fullWidth onClick={(e) => submit(e as unknown as FormEvent, true)}>
              Duplicar
            </Button>
            <Button type="button" variant="outline" fullWidth className="text-deficit" onClick={() => setConfirmDelete(true)}>
              Borrar
            </Button>
          </div>
        )}
      </form>

      {!isNew && id && <Receipts txId={id} />}

      <Dialog
        open={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        title="¿Borrar este movimiento?"
        description="Se borra de tu historial y de tus totales. No se puede deshacer."
        confirmLabel="Borrar"
        danger
        onConfirm={async () => {
          try {
            await del.mutateAsync(id!);
            toast.show("Movimiento borrado");
            navigate(-1);
          } catch (e) {
            toast.show(errorMessage(e), "danger");
          }
        }}
      />
    </div>
  );
}

function Receipts({ txId }: { txId: string }) {
  const { data = [] } = useAttachments(txId);
  const upload = useUploadReceipt();
  const remove = useDeleteReceipt();
  const toast = useToast();

  return (
    <section className="px-4 pb-6 pt-6">
      <h2 className="font-bold">Recibos</h2>
      <div className="mt-3 flex flex-wrap gap-3">
        {data.map((a) => (
          <div key={a.id} className="relative">
            {a.url && a.mime_type?.startsWith("image/") ? (
              <a href={a.url} target="_blank" rel="noreferrer">
                <img src={a.url} alt="Recibo" className="h-24 w-24 rounded-xl border border-border object-cover" />
              </a>
            ) : (
              <a href={a.url ?? "#"} target="_blank" rel="noreferrer" className="flex h-24 w-24 items-center justify-center rounded-xl border border-border text-sm">
                Archivo
              </a>
            )}
            <button
              type="button"
              onClick={() => remove.mutate(a)}
              className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-fg text-xs text-bg"
              aria-label="Quitar recibo"
            >
              ✕
            </button>
          </div>
        ))}
        <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-xl border border-dashed border-border text-center text-sm text-muted hover:bg-surface-subtle">
          {upload.isPending ? "Subiendo…" : "+ Foto"}
          <input
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              if (file.size > 8 * 1024 * 1024) return toast.show("El archivo pesa más de 8 MB", "danger");
              try {
                await upload.mutateAsync({ txId, file });
              } catch (err) {
                toast.show(errorMessage(err), "danger");
              }
            }}
          />
        </label>
      </div>
    </section>
  );
}

/** Tipo de cambio del día del movimiento: sugerido del historial, editable (p. ej. el del estado de cuenta). */
function FxField({
  currency,
  date,
  amount,
  value,
  suggested,
  isIn,
  known,
  onChange,
}: {
  known: boolean;
  currency: Currency;
  date: string;
  amount: number;
  value: string;
  suggested: number;
  isIn: boolean;
  onChange: (v: string) => void;
}) {
  const rate = parseAmount(value) || suggested;
  return (
    <div className="rounded-2xl bg-surface-subtle p-3">
      <label className="block">
        <span className="label">
          Tipo de cambio del {formatDay(date)} (₡ por {CURRENCY_SYMBOL[currency]}, {isIn ? "compra" : "venta"})
        </span>
        <Input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} placeholder={String(suggested).replace(".", ",")} className="amount" />
      </label>
      {!known && !value ? (
        <p className="mt-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
          No tengo guardado el tipo de cambio de esa fecha. Escribe el de tu estado de cuenta o el del BCCR de ese día; si lo dejas vacío se usará{" "}
          {formatMoney(suggested, "CRC")}.
        </p>
      ) : (
        <p className="mt-1.5 text-xs text-muted">
          {amount > 0 && <>Equivale a <b className="text-fg">{formatMoney(amount * rate, "CRC")}</b>. </>}
          Queda fijo con la fecha del movimiento: aunque el dólar cambie, este gasto no cambia. Si tu estado de cuenta dice otro, escríbelo.
        </p>
      )}
    </div>
  );
}
