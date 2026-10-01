import { useMemo, useState } from "react";
import { Select } from "@titoapps/ui";
import { addMonths, currentMonth, monthLabel, monthOf } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { monthSummary, myPortion, pctChange } from "@/lib/summary";
import { balances, periodTotals } from "@/lib/ledger";
import { toBase } from "@/lib/rates";
import { PageHeader } from "@/components/PageHeader";
import { MonthBars } from "@/components/Charts";
import { MoneyByCurrency } from "@/components/Money";
import { Loading } from "@/components/Empty";
import { useBaseCurrency, useCategories, useCategoryMap, useRates } from "@/features/data/core";
import { useTransactions } from "@/features/data/transactions";
import { useAccounts, useAllEntries } from "@/features/data/shared";

/** S9: reportes que responden preguntas concretas. */
export function ReportsPage() {
  const year = Number(currentMonth().slice(0, 4));
  const [y, setY] = useState(year);
  const base = useBaseCurrency();
  const { data: rates = [] } = useRates();
  const { data: categories = [] } = useCategories();
  const catMap = useCategoryMap();
  // Año elegido + año anterior (para comparar meses entre años).
  const q = useTransactions(`${y - 1}-01-01`, `${y}-12-31`);
  const { data: accounts = [] } = useAccounts();
  const { data: entries = [] } = useAllEntries();
  const txns = q.data ?? [];

  const findCat = (re: RegExp) => categories.find((c) => re.test(c.name))?.id ?? "";
  const [catId, setCatId] = useState<string>("");
  const selectedCat = catId || findCat(/tarjeta/i) || categories[0]?.id || "";

  const yearTx = txns.filter((t) => t.occurred_on.startsWith(String(y)));
  const months = Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, "0")}`);

  const byMonth = useMemo(() => {
    const m = new Map<string, typeof txns>();
    for (const t of txns) m.set(monthOf(t.occurred_on), [...(m.get(monthOf(t.occurred_on)) ?? []), t]);
    return m;
  }, [txns]);

  // ¿Cuánto gasté en X este año?
  const catSpend = (id: string, list = yearTx) =>
    list
      .filter((t) => t.kind === "expense" && t.category_id === id)
      .reduce((a, t) => a + toBase(t.scope === "household" ? t.amount : myPortion(t), t.currency, t.occurred_on, base, rates), 0);
  const catByMonth = months.map((m) => ({
    key: m,
    label: monthLabel(m, true).split(" ")[0].slice(0, 1).toUpperCase(),
    income: 0,
    outflow: catSpend(selectedCat, byMonth.get(m) ?? []),
  }));

  const yearSummary = monthSummary(yearTx, rates, base);
  const trend = months.map((m) => {
    const s = monthSummary(byMonth.get(m) ?? [], rates, base);
    return { key: m, label: monthLabel(m, true).split(" ")[0].slice(0, 1).toUpperCase(), income: s.income, outflow: s.myOutflow };
  });

  // Comparar dos meses por categoría.
  const [mA, setMA] = useState(currentMonth());
  const [mB, setMB] = useState(addMonths(currentMonth(), -1));
  const sA = monthSummary(byMonth.get(mA) ?? [], rates, base);
  const sB = monthSummary(byMonth.get(mB) ?? [], rates, base);
  const compareCats = [...new Set([...sA.byCategory, ...sB.byCategory].map((c) => c.category_id))].map((id) => ({
    id,
    a: sA.byCategory.find((c) => c.category_id === id)?.total ?? 0,
    b: sB.byCategory.find((c) => c.category_id === id)?.total ?? 0,
  }));
  const monthOptions = Array.from({ length: 24 }, (_, i) => addMonths(`${y}-12`, -i)).filter((m) => m <= currentMonth());

  // Recuperado por adelantos/reembolsos en el año.
  const reimbursed = yearTx.filter((t) => t.kind === "reimbursement").reduce((a, t) => a + toBase(t.amount, t.currency, t.occurred_on, base, rates, "buy"), 0);

  if (q.isLoading) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Reportes"
        back
        action={
          <div className="w-24 shrink-0">
            <Select value={y} onChange={(e) => setY(Number(e.target.value))} className="py-1.5 text-sm" aria-label="Año">
              {[year, year - 1, year - 2].map((v) => <option key={v} value={v}>{v}</option>)}
            </Select>
          </div>
        }
      />
      <div className="space-y-3 px-4 pb-8 pt-4">
        <section className="card">
          <h2 className="font-bold">Tu {y} en una línea</h2>
          <p className="mt-2 text-sm text-muted">
            Entró <b className="text-fg">{formatMoney(yearSummary.income, base)}</b>, salió de tu bolsillo{" "}
            <b className="text-fg">{formatMoney(yearSummary.myOutflow, base)}</b> y{" "}
            {yearSummary.available >= 0 ? "te quedaron" : "te faltaron"} <b className="text-fg">{formatMoney(Math.abs(yearSummary.available), base)}</b>.
          </p>
          <div className="mt-3">
            <MonthBars data={trend} currency={base} highlight={currentMonth()} />
          </div>
        </section>

        <section className="card">
          <h2 className="font-bold">¿Cuánto gasté en…?</h2>
          <Select value={selectedCat} onChange={(e) => setCatId(e.target.value)} className="mt-3" aria-label="Categoría">
            {categories.filter((c) => c.kind_hint === "expense").map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </Select>
          <p className="amount mt-3 text-3xl">{formatMoney(catSpend(selectedCat), base)}</p>
          <p className="text-sm text-muted">en {y}, mes a mes:</p>
          <div className="mt-2">
            <MonthBars data={catByMonth} currency={base} highlight={currentMonth()} outflowOnly />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {[/préstamo/i, /tarjeta/i, /carro/i, /seguro/i].map((re) => {
              const id = findCat(re);
              const c = id ? catMap.get(id) : undefined;
              return c ? (
                <button key={c.id} type="button" className="chip" onClick={() => setCatId(c.id)}>
                  {c.icon} {c.name}
                </button>
              ) : null;
            })}
          </div>
        </section>

        {accounts.map((a) => {
          const mine = entries.filter((e) => e.account_id === a.id);
          const t = periodTotals(mine, `${y}-01-01`, `${y}-12-31`);
          return (
            <section key={a.id} className="card">
              <h2 className="font-bold">Cuenta con {a.otherLabel}</h2>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="text-muted">{a.role === "creditor" ? `Gastó ${a.otherLabel.toLowerCase()} en ${y}` : `Cargos en ${y}`}</dt>
                  <dd><MoneyByCurrency value={t.charged} className="text-base" /></dd>
                </div>
                <div>
                  <dt className="text-muted">{a.role === "creditor" ? `Recuperaste en ${y}` : `Pagaste en ${y}`}</dt>
                  <dd><MoneyByCurrency value={t.paid} className="text-base text-emerald-700 dark:text-emerald-300" /></dd>
                </div>
                <div>
                  <dt className="text-muted">{a.role === "creditor" ? "Te debe hoy" : "Debes hoy"}</dt>
                  <dd><MoneyByCurrency value={balances(mine)} className="text-base" /></dd>
                </div>
              </dl>
            </section>
          );
        })}

        {reimbursed > 0 && (
          <section className="card">
            <h2 className="font-bold">Adelantos recuperados en {y}</h2>
            <p className="amount mt-2 text-2xl">{formatMoney(reimbursed, base)}</p>
          </section>
        )}

        <section className="card">
          <h2 className="font-bold">Comparar meses</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Select value={mA} onChange={(e) => setMA(e.target.value)} aria-label="Mes A">
              {monthOptions.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </Select>
            <Select value={mB} onChange={(e) => setMB(e.target.value)} aria-label="Mes B">
              {monthOptions.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </Select>
          </div>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="py-1 font-medium">Categoría</th>
                <th className="py-1 text-right font-medium">{monthLabel(mA, true)}</th>
                <th className="py-1 text-right font-medium">{monthLabel(mB, true)}</th>
                <th className="py-1 text-right font-medium">Cambio</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {compareCats.map((c) => {
                const ch = pctChange(c.a, c.b);
                const cat = c.id ? catMap.get(c.id) : undefined;
                return (
                  <tr key={c.id ?? "none"} className="border-t border-border">
                    <td className="py-1.5">{cat ? `${cat.icon ?? ""} ${cat.name}` : "Sin categoría"}</td>
                    <td className="py-1.5 text-right">{formatMoney(c.a, base)}</td>
                    <td className="py-1.5 text-right">{formatMoney(c.b, base)}</td>
                    <td className={`py-1.5 text-right ${ch !== null && ch > 0 ? "text-deficit" : "text-emerald-700 dark:text-emerald-300"}`}>
                      {ch === null ? "—" : `${ch > 0 ? "+" : ""}${Math.round(ch)}%`}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-border font-bold">
                <td className="py-1.5">Total de tu bolsillo</td>
                <td className="py-1.5 text-right">{formatMoney(sA.myOutflow, base)}</td>
                <td className="py-1.5 text-right">{formatMoney(sB.myOutflow, base)}</td>
                <td className="py-1.5 text-right">{(() => { const ch = pctChange(sA.myOutflow, sB.myOutflow); return ch === null ? "—" : `${ch > 0 ? "+" : ""}${Math.round(ch)}%`; })()}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
