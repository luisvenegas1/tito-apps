import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Modal, cn, useToast } from "@titoapps/ui";
import { formatMoney, parseAmount } from "@/lib/money";
import { todayISO } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { Segmented } from "@/components/Segmented";
import { useCategories } from "@/features/data/core";
import { useSaveTransaction } from "@/features/data/transactions";
import { useAccounts, useChargeAndExpense, useSaveEntry, type AccountView } from "@/features/data/shared";
import type { Category, Currency, PaidBy, TxnScope } from "@/lib/supabase/types";

/** A dónde va el movimiento (spec §5.3). */
type Dest =
  | { id: string; kind: "expense" | "income"; label: string }
  | { id: string; kind: "charge" | "payment"; label: string; account: AccountView }
  | { id: string; kind: "extension"; label: string; account: AccountView };

function destinations(accounts: AccountView[]): Dest[] {
  const out: Dest[] = [
    { id: "expense", kind: "expense", label: "Mis gastos" },
    { id: "income", kind: "income", label: "Ingreso" },
  ];
  for (const a of accounts.filter((x) => x.is_active)) {
    if (a.role === "creditor") {
      out.push({ id: `charge:${a.id}`, kind: "charge", label: `Cargo a ${a.otherLabel}`, account: a });
      out.push({ id: `payment:${a.id}`, kind: "payment", label: `Abono de ${a.otherLabel}`, account: a });
    } else {
      out.push({ id: `ext:${a.id}`, kind: "extension", label: `Compré con la extensión de ${a.otherLabel}`, account: a });
      out.push({ id: `payment:${a.id}`, kind: "payment", label: `Le pagué a ${a.otherLabel}`, account: a });
    }
  }
  return out;
}

const LS = { currency: "mt.last-currency", dest: "mt.last-dest", usage: "mt.cat-usage" };
const ls = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* preferencias opcionales */
    }
  },
};

function usage(): Record<string, number> {
  try {
    return JSON.parse(ls.get(LS.usage) ?? "{}");
  } catch {
    return {};
  }
}

/** Categorías más usadas primero (memoria local del dispositivo). */
function byUsage(cats: Category[]): Category[] {
  const u = usage();
  return [...cats].sort((a, b) => (u[b.id] ?? 0) - (u[a.id] ?? 0) || a.sort_order - b.sort_order);
}

export function CaptureSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const navigate = useNavigate();
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const saveTx = useSaveTransaction();
  const saveEntry = useSaveEntry();
  const chargeAndExpense = useChargeAndExpense();

  const dests = useMemo(() => destinations(accounts), [accounts]);
  const [destId, setDestId] = useState("expense");
  const [raw, setRaw] = useState("");
  const [currency, setCurrency] = useState<Currency>("CRC");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [concept, setConcept] = useState("");
  const [paidBy, setPaidBy] = useState<PaidBy>("me");
  const [scope, setScope] = useState<TxnScope>("personal");
  const [moreOpen, setMoreOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Al abrir: limpiar, recordar moneda y destino.
  useEffect(() => {
    if (!open) return;
    setRaw("");
    setCategoryId(null);
    setConcept("");
    setPaidBy("me");
    setScope("personal");
    setMoreOpen(false);
    setCurrency((ls.get(LS.currency) as Currency) || "CRC");
    const last = ls.get(LS.dest);
    setDestId(last && dests.some((d) => d.id === last) ? last : "expense");
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const dest = dests.find((d) => d.id === destId) ?? dests[0];
  const amount = parseAmount(raw) ?? 0;
  const needsCategory = dest.kind === "expense" || dest.kind === "income" || dest.kind === "extension";
  const catList = byUsage(
    categories.filter((c) => !c.is_archived && (dest.kind === "income" ? c.kind_hint === "income" : c.kind_hint === "expense")),
  );

  function press(k: string) {
    if (k === "⌫") return setRaw((r) => r.slice(0, -1));
    if (k === ",") return setRaw((r) => (r.includes(",") ? r : (r || "0") + ","));
    setRaw((r) => {
      const [, dec] = r.split(",");
      if (dec !== undefined && dec.length >= 2) return r;
      if (r === "0") return k;
      return (r + k).slice(0, 12);
    });
  }

  async function save() {
    if (amount <= 0) return;
    setBusy(true);
    try {
      const date = todayISO();
      const cat = categories.find((c) => c.id === categoryId);
      let queued = false;
      if (dest.kind === "expense" || dest.kind === "income") {
        queued = await saveTx.mutateAsync({
          kind: dest.kind,
          amount,
          currency,
          occurred_on: date,
          category_id: categoryId,
          paid_by: dest.kind === "income" ? "me" : paidBy,
          payer_person_id: null,
          scope: dest.kind === "income" ? "personal" : scope,
          my_share: 0.5,
          shared_entry_id: null,
          recurring_template_id: null,
          linked_transaction_id: null,
          note: concept.trim() || null,
          tags: [],
          client_uuid: null,
        });
      } else if (dest.kind === "extension") {
        queued = await chargeAndExpense.mutateAsync({
          account: dest.account.id,
          amount,
          currency,
          date,
          concept: concept.trim() || cat?.name || "Compra",
          category: categoryId,
          note: null,
        });
      } else if (dest.kind === "charge" || dest.kind === "payment") {
        queued = await saveEntry.mutateAsync({
          account_id: dest.account.id,
          type: dest.kind,
          amount,
          currency,
          occurred_on: date,
          concept: concept.trim() || (dest.kind === "charge" ? "Cargo" : "Abono"),
          note: null,
        });
      }
      if (categoryId) {
        const u = usage();
        u[categoryId] = (u[categoryId] ?? 0) + 1;
        ls.set(LS.usage, JSON.stringify(u));
      }
      ls.set(LS.currency, currency);
      ls.set(LS.dest, dest.id);
      toast.show(queued ? "Guardado sin conexión: se enviará al reconectar" : `Guardado: ${formatMoney(amount, currency)}`, "success");
      onClose();
    } catch (e) {
      toast.show(errorMessage(e), "danger");
    } finally {
      setBusy(false);
    }
  }

  function openDetailed() {
    const p = new URLSearchParams();
    if (amount) p.set("amount", String(amount));
    p.set("currency", currency);
    if (categoryId) p.set("category", categoryId);
    if (dest.kind === "income") p.set("kind", "income");
    onClose();
    navigate(`/movimientos/nuevo?${p}`);
  }

  let hint: string | null = null;
  if (dest.kind === "payment") {
    hint =
      dest.account.role === "creditor"
        ? `Baja lo que ${dest.account.otherLabel} te debe. No cuenta como ingreso.`
        : "Pago de deuda: no cuenta como gasto (el gasto ya se contó en cada compra).";
  } else if (dest.kind === "charge") {
    hint = `Sube lo que ${dest.account.otherLabel} te debe. No cuenta como gasto tuyo.`;
  } else if (dest.kind === "extension") {
    hint = `Se anota en la cuenta con ${dest.account.otherLabel} y en tus gastos.`;
  }

  return (
    <Modal open={open} onClose={onClose} className="max-h-[94vh] overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Nuevo movimiento</h2>
        <button type="button" onClick={onClose} className="rounded-full p-2 text-muted hover:bg-surface-subtle" aria-label="Cerrar">
          ✕
        </button>
      </div>

      {/* ¿Dónde va? */}
      <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1" role="radiogroup" aria-label="¿Dónde va?">
        {dests.map((d) => (
          <button
            key={d.id}
            type="button"
            role="radio"
            aria-checked={d.id === destId}
            className={cn("chip", d.id === destId && "chip-on")}
            onClick={() => {
              setDestId(d.id);
              setCategoryId(null);
            }}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Monto */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <p className={cn("amount truncate text-4xl", !raw && "text-muted")} aria-live="polite">
          {raw ? `${currency === "CRC" ? "₡" : "$"}${formatRaw(raw)}` : formatMoney(0, currency)}
        </p>
        <Segmented
          label="Moneda"
          value={currency}
          onChange={setCurrency}
          options={[
            { value: "CRC", label: "₡" },
            { value: "USD", label: "$" },
          ]}
        />
      </div>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}

      {/* Categorías o concepto */}
      {needsCategory && (
        <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1">
          {catList.map((c) => (
            <button key={c.id} type="button" className={cn("chip", categoryId === c.id && "chip-on")} onClick={() => setCategoryId(categoryId === c.id ? null : c.id)}>
              <span aria-hidden>{c.icon}</span>
              {c.name}
            </button>
          ))}
        </div>
      )}
      {(!needsCategory || moreOpen || dest.kind === "extension") && (
        <Input
          className="mt-3"
          placeholder={needsCategory ? "Nota (opcional)" : "Concepto (ej. Súper, Farmacia, Depósito)"}
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
        />
      )}

      {dest.kind === "expense" && (
        <div className="mt-3">
          {!moreOpen ? (
            <button type="button" className="text-sm font-semibold text-muted" onClick={() => setMoreOpen(true)}>
              Pagado por: {paidBy === "me" ? "yo" : paidBy === "partner" ? "mi pareja" : paidBy === "shared" ? "compartido" : "otra persona"} · {scope === "household" ? "hogar" : "personal"} ▾
            </button>
          ) : (
            <div className="space-y-2">
              <Segmented
                label="Pagado por"
                className="w-full"
                value={paidBy}
                onChange={(v) => {
                  setPaidBy(v);
                  if (v === "partner") setScope("household");
                }}
                options={[
                  { value: "me", label: "Yo" },
                  { value: "partner", label: "Pareja" },
                  { value: "shared", label: "Mitad" },
                ]}
              />
              <Segmented
                label="Ámbito"
                className="w-full"
                value={scope === "household" ? "household" : "personal"}
                onChange={(v) => setScope(v as TxnScope)}
                options={[
                  { value: "personal", label: "Personal" },
                  { value: "household", label: "Hogar" },
                ]}
              />
              {paidBy === "partner" && <p className="text-xs text-muted">Sigue contando como gasto del hogar, pero no sale de tu bolsillo.</p>}
            </div>
          )}
        </div>
      )}

      {/* Teclado */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "⌫"].map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => press(k)}
            className="rounded-2xl bg-surface-subtle py-3.5 text-xl font-semibold active:scale-95"
            aria-label={k === "⌫" ? "Borrar" : k === "," ? "Decimales" : k}
          >
            {k}
          </button>
        ))}
      </div>

      <Button fullWidth size="lg" className="mt-4" onClick={save} disabled={busy || amount <= 0}>
        {busy ? "Guardando…" : "Guardar"}
      </Button>
      {(dest.kind === "expense" || dest.kind === "income") && (
        <button type="button" onClick={openDetailed} className="mt-3 w-full text-center text-sm font-semibold text-muted">
          Más detalles (fecha, recibo, persona…)
        </button>
      )}
    </Modal>
  );
}

/** "1234567,5" → "1.234.567,5" mientras se escribe. */
function formatRaw(raw: string): string {
  const [int, dec] = raw.split(",");
  const grouped = (int || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return dec !== undefined ? `${grouped},${dec}` : grouped;
}
