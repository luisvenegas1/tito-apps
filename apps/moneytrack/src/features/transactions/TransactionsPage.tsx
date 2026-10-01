import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Input, Select, cn } from "@titoapps/ui";
import { currentMonth, formatDay, monthRange } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { monthSummary } from "@/lib/summary";
import { PageHeader } from "@/components/PageHeader";
import { MonthPicker } from "@/components/MonthPicker";
import { Empty, ErrorNote, Loading } from "@/components/Empty";
import { useBaseCurrency, useCategories, useCategoryMap, useRates } from "@/features/data/core";
import { useTransactions } from "@/features/data/transactions";
import { useOpenCapture } from "@/components/layout/AppLayout";
import type { Transaction } from "@/lib/supabase/types";

export const KIND_LABEL: Record<Transaction["kind"], string> = {
  expense: "Gasto",
  income: "Ingreso",
  advance: "Adelanto",
  reimbursement: "Reembolso",
};
export const PAID_BY_LABEL: Record<Transaction["paid_by"], string> = {
  me: "Yo",
  partner: "Pareja",
  shared: "Compartido",
  other: "Otra persona",
};

export function TransactionsPage() {
  const [month, setMonth] = useState(currentMonth());
  const { from, to } = monthRange(month);
  const q = useTransactions(from, to);
  const catMap = useCategoryMap();
  const { data: categories = [] } = useCategories();
  const { data: rates = [] } = useRates();
  const base = useBaseCurrency();
  const openCapture = useOpenCapture();

  const [text, setText] = useState("");
  const [kind, setKind] = useState("");
  const [cat, setCat] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [currency, setCurrency] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    const needle = text.trim().toLowerCase();
    return (q.data ?? []).filter(
      (t) =>
        (!kind || t.kind === kind) &&
        (!cat || t.category_id === cat) &&
        (!paidBy || t.paid_by === paidBy) &&
        (!currency || t.currency === currency) &&
        (!needle ||
          (t.note ?? "").toLowerCase().includes(needle) ||
          (t.category_id && catMap.get(t.category_id)?.name.toLowerCase().includes(needle))),
    );
  }, [q.data, text, kind, cat, paidBy, currency, catMap]);

  const days = useMemo(() => {
    const m = new Map<string, Transaction[]>();
    for (const t of filtered) m.set(t.occurred_on, [...(m.get(t.occurred_on) ?? []), t]);
    return [...m.entries()];
  }, [filtered]);

  const s = monthSummary(filtered, rates, base);
  const activeFilters = [kind, cat, paidBy, currency].filter(Boolean).length;

  return (
    <div>
      <PageHeader
        title="Movimientos"
        action={
          <Link to="/movimientos/nuevo" className="rounded-full px-3 py-1.5 text-sm font-semibold text-primary hover:bg-surface-subtle">
            Nuevo
          </Link>
        }
      />
      <div className="flex justify-center pt-3">
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      <div className="space-y-2 px-4 pt-3">
        <div className="flex gap-2">
          <Input placeholder="Buscar por nota o categoría" value={text} onChange={(e) => setText(e.target.value)} aria-label="Buscar" />
          <button type="button" className={cn("chip shrink-0", activeFilters > 0 && "chip-on")} onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
            Filtros{activeFilters > 0 ? ` (${activeFilters})` : ""}
          </button>
        </div>
        {showFilters && (
          <div className="grid grid-cols-2 gap-2">
            <Select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Tipo">
              <option value="">Todos los tipos</option>
              {Object.entries(KIND_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
            <Select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Categoría">
              <option value="">Todas las categorías</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </Select>
            <Select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} aria-label="Pagado por">
              <option value="">Pagado por cualquiera</option>
              {Object.entries(PAID_BY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)} aria-label="Moneda">
              <option value="">₡ y $</option>
              <option value="CRC">Solo colones</option>
              <option value="USD">Solo dólares</option>
            </Select>
          </div>
        )}
        {filtered.length > 0 && (
          <p className="px-1 text-sm text-muted">
            {filtered.length} movimientos · entró <span className="font-semibold text-fg">{formatMoney(s.income, base)}</span> · salió{" "}
            <span className="font-semibold text-fg">{formatMoney(s.myOutflow, base)}</span>
          </p>
        )}
      </div>

      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorNote error={q.error} onRetry={() => q.refetch()} />
      ) : days.length === 0 ? (
        <Empty
          title={activeFilters || text ? "Nada coincide con los filtros" : "Sin movimientos este mes"}
          action={!activeFilters && !text ? <button type="button" className="font-semibold text-primary" onClick={openCapture}>Registrar el primero</button> : undefined}
        />
      ) : (
        <div className="px-4">
          {days.map(([day, list]) => (
            <section key={day}>
              <h2 className="section-title">{formatDay(day)}</h2>
              <ul className="card divide-y divide-border p-0">
                {list.map((t) => {
                  const c = t.category_id ? catMap.get(t.category_id) : undefined;
                  const isIn = t.kind === "income" || t.kind === "reimbursement";
                  return (
                    <li key={t.id}>
                      <Link to={`/movimientos/${t.id}`} className="row hover:bg-surface-subtle">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-subtle text-lg" aria-hidden>
                          {c?.icon ?? (isIn ? "💰" : "•")}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{t.note || c?.name || KIND_LABEL[t.kind]}</span>
                          <span className="block truncate text-xs text-muted">
                            {[t.note ? c?.name : null, t.kind !== "expense" && !t.shared_entry_id ? KIND_LABEL[t.kind] : null, t.paid_by !== "me" ? `Paga: ${PAID_BY_LABEL[t.paid_by].toLowerCase()}` : null, t.scope === "household" ? "Hogar" : null, t.shared_entry_id ? (t.kind === "advance" ? "Por otra persona: no es gasto tuyo" : "Extensión") : null]
                              .filter(Boolean)
                              .join(" · ") || "Personal"}
                          </span>
                        </span>
                        <span className={cn("amount shrink-0", isIn && "text-emerald-700 dark:text-emerald-300", (t.paid_by === "partner" || (t.kind === "advance" && t.shared_entry_id)) && "text-muted")}>
                          {formatMoney(isIn ? t.amount : -t.amount, t.currency, { sign: true })}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
