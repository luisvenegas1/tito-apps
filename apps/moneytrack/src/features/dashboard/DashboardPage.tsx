import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@titoapps/ui";
import { addMonths, currentMonth, monthLabel, monthOf, monthRange, todayISO } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { monthSummary, pctChange } from "@/lib/summary";
import { balances } from "@/lib/ledger";
import { paymentState, paymentStateLabel } from "@/lib/payments";
import { MonthPicker } from "@/components/MonthPicker";
import { BarList, MonthBars } from "@/components/Charts";
import { MoneyByCurrency } from "@/components/Money";
import { ErrorNote } from "@/components/Empty";
import { useBaseCurrency, useCategoryMap, useProfile, useRates } from "@/features/data/core";
import { useTransactions } from "@/features/data/transactions";
import { useAccounts, useAllEntries, useMyLinkedEntryIds } from "@/features/data/shared";
import { useNotifications, useScheduledPayments, useTemplates } from "@/features/data/planning";
import { useOpenCapture } from "@/components/layout/AppLayout";

export function DashboardPage() {
  const [month, setMonth] = useState(currentMonth());
  const base = useBaseCurrency();
  const { data: profile } = useProfile();
  const { data: rates = [] } = useRates();
  const catMap = useCategoryMap();
  const from = monthRange(addMonths(month, -5)).from;
  const to = monthRange(month).to;
  const txq = useTransactions(from, to);
  const { data: accounts = [] } = useAccounts();
  const { data: entries = [] } = useAllEntries();
  const { data: linked } = useMyLinkedEntryIds();
  const { data: payments = [] } = useScheduledPayments();
  const { data: templates = [] } = useTemplates();
  const { data: notifications = [] } = useNotifications();
  const openCapture = useOpenCapture();

  const txns = txq.data ?? [];
  const byMonth = useMemo(() => {
    const map = new Map<string, typeof txns>();
    for (const t of txns) {
      const k = monthOf(t.occurred_on);
      map.set(k, [...(map.get(k) ?? []), t]);
    }
    return map;
  }, [txns]);

  const s = monthSummary(byMonth.get(month) ?? [], rates, base);
  const prev = monthSummary(byMonth.get(addMonths(month, -1)) ?? [], rates, base);
  const outflowChange = pctChange(s.myOutflow, prev.myOutflow);
  const trend = Array.from({ length: 6 }, (_, i) => {
    const k = addMonths(month, i - 5);
    const m = monthSummary(byMonth.get(k) ?? [], rates, base);
    return { key: k, label: monthLabel(k, true).split(" ")[0], income: m.income, outflow: m.myOutflow };
  });

  // Cuentas compartidas: lo que me deben y lo que debo.
  const owedToMe = accounts.filter((a) => a.role === "creditor" && a.is_active);
  const iOwe = accounts.filter((a) => a.role === "debtor" && a.is_active);
  const debtorIds = new Set(iOwe.map((a) => a.id));
  const uncategorized = entries.filter((e) => debtorIds.has(e.account_id) && e.type === "charge" && !e.deleted_at && linked && !linked.has(e.id));

  const today = todayISO();
  const tplName = new Map(templates.map((t) => [t.id, t.name]));
  const upcoming = payments
    .filter((p) => p.status === "pending")
    .map((p) => ({ p, st: paymentState(p.due_date, p.status, today) }))
    .filter(({ st }) => st.kind === "overdue" || st.kind === "today" || st.kind === "tomorrow" || (st.kind === "upcoming" && st.days <= 14))
    .slice(0, 5);
  const unread = notifications.filter((n) => !n.read_at).length;
  const firstName = profile?.display_name?.split(" ")[0];

  return (
    <div>
      {/* El elemento distintivo: el panel del mes con el mismo degradado del ícono. */}
      <section className="hero rounded-b-[2rem] px-5 pb-7 pt-5 text-white">
        <div className="flex items-center justify-between">
          <p className="text-sm text-white/70">{firstName ? `Hola, ${firstName}` : "Money Track"}</p>
          <Link to="/avisos" className="relative rounded-full p-2 text-white/80 hover:bg-white/10" aria-label={`Avisos${unread ? `: ${unread} sin leer` : ""}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" />
            </svg>
            {unread > 0 && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-emerald-300 ring-2 ring-navy" />}
          </Link>
        </div>
        <div className="mt-2 flex justify-center text-white">
          <MonthPicker value={month} onChange={setMonth} light />
        </div>

        <p className="mt-5 text-center text-sm text-white/70">{s.available >= 0 ? "Disponible" : "Déficit del mes"}</p>
        <p className={cn("amount mt-1 text-center text-5xl", s.available < 0 && "text-rose-300")}>{formatMoney(s.available, base)}</p>

        <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-white/[0.07] p-3">
            <p className="text-white/60">Entró</p>
            <p className="amount mt-0.5 text-lg text-emerald-300">{formatMoney(s.income + s.reimbursed, base)}</p>
          </div>
          <div className="rounded-2xl bg-white/[0.07] p-3">
            <p className="text-white/60">Salió de tu bolsillo</p>
            <p className="amount mt-0.5 text-lg">{formatMoney(s.myOutflow, base)}</p>
            {outflowChange !== null && (
              <p className="mt-0.5 text-xs text-white/60">
                {outflowChange > 0 ? "▲" : "▼"} {Math.abs(Math.round(outflowChange))}% vs. mes anterior
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="space-y-3 px-4 pt-4">
        {txq.error && <ErrorNote error={txq.error} onRetry={() => txq.refetch()} />}

        <div className="grid grid-cols-2 gap-3">
          <div className="card">
            <p className="text-sm text-muted">Gastos personales</p>
            <p className="amount mt-1 text-xl">{formatMoney(s.personal, base)}</p>
          </div>
          <div className="card">
            <p className="text-sm text-muted">Gastos del hogar</p>
            <p className="amount mt-1 text-xl">{formatMoney(s.household, base)}</p>
            <p className="mt-0.5 text-xs text-muted">Incluye lo que pagan otros en casa</p>
          </div>
        </div>

        {(owedToMe.length > 0 || iOwe.length > 0) && (
          <section className="card divide-y divide-border p-0">
            {owedToMe.map((a) => (
              <Link key={a.id} to={`/cuentas/${a.id}`} className="row hover:bg-surface-subtle">
                <span className="flex-1">
                  <span className="block text-sm text-muted">Pendiente por cobrar</span>
                  <span className="font-semibold">{a.otherLabel}</span>
                </span>
                <MoneyByCurrency value={balances(entries.filter((e) => e.account_id === a.id))} className="text-lg text-teal" />
              </Link>
            ))}
            {iOwe.map((a) => (
              <Link key={a.id} to={`/cuentas/${a.id}`} className="row hover:bg-surface-subtle">
                <span className="flex-1">
                  <span className="block text-sm text-muted">Pendiente por pagar</span>
                  <span className="font-semibold">{a.otherLabel}</span>
                </span>
                <MoneyByCurrency value={balances(entries.filter((e) => e.account_id === a.id))} className="text-lg" />
              </Link>
            ))}
          </section>
        )}

        {uncategorized.length > 0 && (
          <Link to={`/cuentas/${uncategorized[0].account_id}`} className="card block border-teal/40 bg-mint/20">
            <p className="font-semibold">
              {uncategorized.length === 1 ? "1 compra con la extensión sin categorizar" : `${uncategorized.length} compras con la extensión sin categorizar`}
            </p>
            <p className="mt-0.5 text-sm text-muted">Pásalas a tus gastos para que cuenten en tu mes.</p>
          </Link>
        )}

        <section className="card">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Próximos pagos</h2>
            <Link to="/pagos" className="text-sm font-semibold text-primary">Ver todos</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              Nada pendiente en las próximas dos semanas.{" "}
              {templates.length === 0 && <Link to="/recurrentes" className="font-semibold text-primary">Agrega tus pagos fijos</Link>}
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-border">
              {upcoming.map(({ p, st }) => (
                <li key={p.id} className="flex items-center justify-between py-2.5">
                  <span>
                    <span className="block font-medium">{tplName.get(p.template_id)}</span>
                    <span className={cn("text-sm", st.kind === "overdue" ? "font-semibold text-deficit" : st.kind === "today" || st.kind === "tomorrow" ? "font-semibold text-amber-600" : "text-muted")}>
                      {paymentStateLabel(st)}
                    </span>
                  </span>
                  {p.amount_est !== null && <span className="amount">{formatMoney(p.amount_est, p.currency)}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="font-bold">En qué se fue</h2>
          {s.byCategory.length === 0 ? (
            <div className="py-4 text-sm text-muted">
              Aún no hay gastos en {monthLabel(month).toLowerCase()}.{" "}
              <button type="button" className="font-semibold text-primary" onClick={openCapture}>Registrar uno</button>
            </div>
          ) : (
            <div className="mt-3">
              <BarList
                currency={base}
                items={s.byCategory.map((c) => {
                  const cat = c.category_id ? catMap.get(c.category_id) : undefined;
                  return { label: cat?.name ?? "Sin categoría", icon: cat?.icon, value: c.total };
                })}
              />
              {Object.keys(s.outflowByCurrency).length > 1 && (
                <p className="mt-3 text-xs text-muted">
                  Por moneda: <MoneyByCurrency value={s.outflowByCurrency} className="font-semibold" /> (convertido al TC vigente)
                </p>
              )}
            </div>
          )}
        </section>

        <section className="card">
          <h2 className="font-bold">Últimos 6 meses</h2>
          <div className="mt-3">
            <MonthBars data={trend} currency={base} highlight={month} />
          </div>
        </section>
      </div>
    </div>
  );
}
