import { useState } from "react";
import { Button, useToast } from "@titoapps/ui";
import { useQueryClient } from "@tanstack/react-query";
import { requireUserId, supabase } from "@/lib/supabase/client";
import { check, errorMessage } from "@/lib/errors";
import { downloadText, parseCSV, toCSV } from "@/lib/csv";
import { formatMoney, parseAmount } from "@/lib/money";
import { todayISO } from "@/lib/dates";
import { PageHeader } from "@/components/PageHeader";
import { useCategories, useCategoryMap } from "@/features/data/core";
import { useAccounts } from "@/features/data/shared";
import type { Currency, SharedEntry, Transaction, TxnKind } from "@/lib/supabase/types";

const TX_HEADER = ["fecha", "tipo", "monto", "moneda", "categoria", "pagado_por", "ambito", "nota"];

/** F-70/F-104/F-105: exportar respaldo e importar movimientos desde CSV (Excel → Guardar como CSV). */
export function DataPage() {
  const toast = useToast();
  const catMap = useCategoryMap();
  const { data: accounts = [] } = useAccounts();
  const [busy, setBusy] = useState(false);

  async function exportAll() {
    setBusy(true);
    try {
      const txs = check(await supabase.from("transactions").select("*").order("occurred_on")) as Transaction[];
      const rows = txs.map((t) => [t.occurred_on, t.kind, Number(t.amount), t.currency, t.category_id ? catMap.get(t.category_id)?.name : "", t.paid_by, t.scope, t.note ?? ""]);
      downloadText(`moneytrack-movimientos-${todayISO()}.csv`, toCSV([TX_HEADER, ...rows]));

      const entries = check(await supabase.from("shared_entries").select("*").order("occurred_on")) as SharedEntry[];
      if (entries.length) {
        const label = new Map(accounts.map((a) => [a.id, a.otherLabel]));
        const er = entries.map((e) => [label.get(e.account_id) ?? "", e.occurred_on, e.type === "charge" ? "cargo" : "abono", Number(e.amount), e.currency, e.concept, e.note ?? "", e.deleted_at ? "eliminado" : ""]);
        downloadText(`moneytrack-cuentas-${todayISO()}.csv`, toCSV([["cuenta", "fecha", "tipo", "monto", "moneda", "concepto", "nota", "estado"], ...er]));
      }
      toast.show("Exportado", "success");
    } catch (e) {
      toast.show(errorMessage(e), "danger");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Exportar e importar" back />
      <div className="space-y-3 px-4 pb-10 pt-4">
        <section className="card">
          <h2 className="font-bold">Exportar todo</h2>
          <p className="mt-1 text-sm text-muted">Descarga tus movimientos y tus cuentas compartidas en CSV (se abren en Excel o Google Sheets).</p>
          <Button className="mt-3" onClick={exportAll} disabled={busy}>Descargar CSV</Button>
        </section>
        <ImportCard />
      </div>
    </div>
  );
}

interface ParsedRow {
  line: number;
  occurred_on: string;
  kind: TxnKind;
  amount: number;
  currency: Currency;
  category: string;
  note: string;
  error?: string;
}

/** Acepta fechas 2026-09-01, 01/09/2026 o 1/9/26. */
function parseDate(s: string): string | null {
  const t = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!m) return null;
  const y = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

function ImportCard() {
  const { data: categories = [] } = useCategories();
  const qc = useQueryClient();
  const toast = useToast();
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    const data = parseCSV(await file.text());
    const [header, ...body] = data;
    const idx = (names: string[]) => header.findIndex((h) => names.includes(h.trim().toLowerCase()));
    const iDate = idx(["fecha", "date"]);
    const iAmount = idx(["monto", "amount", "valor"]);
    const iCur = idx(["moneda", "currency"]);
    const iKind = idx(["tipo", "kind"]);
    const iCat = idx(["categoria", "categoría", "category"]);
    const iNote = idx(["nota", "descripcion", "descripción", "concepto", "detalle"]);
    if (iDate < 0 || iAmount < 0) {
      toast.show("El CSV necesita al menos las columnas fecha y monto", "danger");
      return;
    }
    setRows(
      body.map((r, i) => {
        const date = parseDate(r[iDate] ?? "");
        const rawAmount = (r[iAmount] ?? "").trim();
        const amount = parseAmount(rawAmount.replace("-", ""));
        const kindRaw = (r[iKind] ?? "").toLowerCase();
        const kind: TxnKind = /ingreso|income/.test(kindRaw) ? "income" : "expense";
        const curRaw = (r[iCur] ?? "").toUpperCase();
        const currency: Currency =
          /EUR|€/.test(curRaw) || rawAmount.includes("€") ? "EUR" : /USD|\$|DOL/.test(curRaw) || rawAmount.includes("$") ? "USD" : "CRC";
        return {
          line: i + 2,
          occurred_on: date ?? "",
          kind,
          amount: amount ?? 0,
          currency,
          category: (r[iCat] ?? "").trim(),
          note: (r[iNote] ?? "").trim(),
          error: !date ? "Fecha no válida" : !amount ? "Monto no válido" : undefined,
        };
      }),
    );
  }

  const valid = (rows ?? []).filter((r) => !r.error);
  const totals = valid.reduce<Record<string, number>>((a, r) => {
    const k = `${r.kind}-${r.currency}`;
    a[k] = (a[k] ?? 0) + r.amount;
    return a;
  }, {});

  async function confirm() {
    setBusy(true);
    try {
      const uid = await requireUserId();
      const byName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
      const payload = valid.map((r) => ({
        user_id: uid,
        kind: r.kind,
        amount: r.amount,
        currency: r.currency,
        occurred_on: r.occurred_on,
        category_id: byName.get(r.category.toLowerCase()) ?? null,
        note: r.note || (r.category && !byName.has(r.category.toLowerCase()) ? r.category : null),
      }));
      for (let i = 0; i < payload.length; i += 500) check(await supabase.from("transactions").insert(payload.slice(i, i + 500)));
      await qc.invalidateQueries();
      toast.show(`Importados ${payload.length} movimientos`, "success");
      setRows(null);
    } catch (e) {
      toast.show(errorMessage(e), "danger");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2 className="font-bold">Importar desde Excel</h2>
      <p className="mt-1 text-sm text-muted">
        En Excel o Sheets: Archivo → Descargar/Guardar como CSV. Columnas reconocidas: fecha, monto, moneda, tipo (gasto/ingreso), categoría, nota. Antes de guardar
        verás un resumen para revisar que los totales coinciden.
      </p>
      {!rows ? (
        <label className="mt-3 inline-flex cursor-pointer rounded-token border border-border px-4 py-2.5 font-semibold hover:bg-surface-subtle">
          Elegir archivo CSV
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
      ) : (
        <div className="mt-3">
          <p className="text-sm">
            <b>{valid.length}</b> filas listas{rows.length !== valid.length && <>, <b className="text-deficit">{rows.length - valid.length}</b> con errores (se omiten)</>}.
          </p>
          <ul className="mt-2 text-sm text-muted">
            {Object.entries(totals).map(([k, v]) => {
              const [kind, cur] = k.split("-");
              return (
                <li key={k}>
                  {kind === "income" ? "Ingresos" : "Gastos"}: <b className="text-fg">{formatMoney(v, cur as Currency)}</b>
                </li>
              );
            })}
          </ul>
          {rows.some((r) => r.error) && (
            <ul className="mt-2 max-h-28 overflow-y-auto text-xs text-deficit">
              {rows.filter((r) => r.error).slice(0, 20).map((r) => <li key={r.line}>Fila {r.line}: {r.error}</li>)}
            </ul>
          )}
          <div className="mt-3 flex gap-2">
            <Button onClick={confirm} disabled={busy || valid.length === 0}>{busy ? "Importando…" : `Importar ${valid.length}`}</Button>
            <Button variant="ghost" onClick={() => setRows(null)}>Cancelar</Button>
          </div>
        </div>
      )}
    </section>
  );
}
