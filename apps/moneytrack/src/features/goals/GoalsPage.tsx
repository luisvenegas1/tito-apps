import { useState, type FormEvent } from "react";
import { Button, Input, Modal, Select, useToast } from "@titoapps/ui";
import { currentMonth, daysBetween, monthRange, parseISODate, todayISO } from "@/lib/dates";
import { formatMoney, parseAmount } from "@/lib/money";
import { myPortion } from "@/lib/summary";
import { toBase } from "@/lib/rates";
import { errorMessage } from "@/lib/errors";
import { PageHeader } from "@/components/PageHeader";
import { Segmented } from "@/components/Segmented";
import { Progress } from "@/components/Charts";
import { Empty, Loading } from "@/components/Empty";
import { useCategories, useCategoryMap, useRates } from "@/features/data/core";
import { useTransactions } from "@/features/data/transactions";
import { useDeleteGoal, useGoals, useSaveGoal } from "@/features/data/planning";
import type { Currency, Goal, GoalType } from "@/lib/supabase/types";

/** S10: metas de ahorro y de reducción de gasto por categoría. */
export function GoalsPage() {
  const q = useGoals();
  const { data: rates = [] } = useRates();
  const catMap = useCategoryMap();
  const { from, to } = monthRange(currentMonth());
  const { data: monthTx = [] } = useTransactions(from, to);
  const [editing, setEditing] = useState<Partial<Goal> | null>(null);
  const [contributing, setContributing] = useState<Goal | null>(null);
  const today = todayISO();
  const dayOfMonth = parseISODate(today).getDate();
  const daysInMonth = Number(to.slice(8));

  return (
    <div>
      <PageHeader title="Metas" back action={<button type="button" className="px-3 text-sm font-semibold text-primary" onClick={() => setEditing({})}>Nueva</button>} />
      {q.isLoading ? (
        <Loading />
      ) : (q.data ?? []).length === 0 ? (
        <Empty title="Sin metas todavía" action={<Button onClick={() => setEditing({})}>Crear una meta</Button>}>
          Ahorra para algo concreto o ponle un tope mensual a una categoría (por ejemplo, restaurantes).
        </Empty>
      ) : (
        <div className="space-y-3 px-4 pb-8 pt-4">
          {q.data!.map((g) => {
            if (g.type === "savings") {
              const pct = g.saved_amount / g.target_amount;
              const left = g.target_amount - g.saved_amount;
              const monthsLeft = g.target_date ? Math.max(1, Math.ceil(daysBetween(today, g.target_date) / 30)) : null;
              return (
                <article key={g.id} className="card">
                  <div className="flex items-start justify-between gap-2">
                    <button type="button" className="text-left" onClick={() => setEditing(g)}>
                      <h2 className="font-bold">{g.name}</h2>
                      <p className="text-sm text-muted">Ahorro · meta {formatMoney(g.target_amount, g.currency)}</p>
                    </button>
                    <Button size="sm" onClick={() => setContributing(g)}>Apartar</Button>
                  </div>
                  <p className="amount mt-3 text-2xl">{formatMoney(g.saved_amount, g.currency)}</p>
                  <div className="mt-2"><Progress value={pct} /></div>
                  <p className="mt-2 text-sm text-muted">
                    {left <= 0
                      ? "¡Meta cumplida!"
                      : monthsLeft
                        ? `Faltan ${formatMoney(left, g.currency)}: unos ${formatMoney(left / monthsLeft, g.currency)} por mes para llegar a tiempo.`
                        : `Faltan ${formatMoney(left, g.currency)}.`}
                  </p>
                </article>
              );
            }
            const cat = g.category_id ? catMap.get(g.category_id) : undefined;
            const spent = monthTx
              .filter((t) => t.kind === "expense" && t.category_id === g.category_id)
              .reduce((a, t) => a + toBase(myPortion(t), t.currency, t.occurred_on, g.currency, rates), 0);
            const projected = (spent / Math.max(1, dayOfMonth)) * daysInMonth;
            const pct = spent / g.target_amount;
            const tone = pct >= 1 ? "over" : projected > g.target_amount ? "warn" : "ok";
            return (
              <article key={g.id} className="card">
                <button type="button" className="text-left" onClick={() => setEditing(g)}>
                  <h2 className="font-bold">{g.name}</h2>
                  <p className="text-sm text-muted">Tope mensual en {cat?.icon} {cat?.name ?? "categoría"}</p>
                </button>
                <p className="mt-3">
                  <span className="amount text-2xl">{formatMoney(spent, g.currency)}</span>
                  <span className="text-muted"> de {formatMoney(g.target_amount, g.currency)}</span>
                </p>
                <div className="mt-2"><Progress value={pct} tone={tone} /></div>
                <p className={`mt-2 text-sm ${tone === "ok" ? "text-muted" : "font-semibold text-deficit"}`}>
                  {tone === "over"
                    ? "Ya pasaste el tope de este mes."
                    : tone === "warn"
                      ? `A este ritmo cerrarías el mes en ${formatMoney(projected, g.currency)}.`
                      : `Vas bien: al ritmo actual cerrarías en ${formatMoney(projected, g.currency)}.`}
                </p>
              </article>
            );
          })}
        </div>
      )}
      <GoalSheet goal={editing} onClose={() => setEditing(null)} />
      <ContributeSheet goal={contributing} onClose={() => setContributing(null)} />
    </div>
  );
}

function GoalSheet({ goal, onClose }: { goal: Partial<Goal> | null; onClose: () => void }) {
  const { data: categories = [] } = useCategories();
  const save = useSaveGoal();
  const del = useDeleteGoal();
  const toast = useToast();
  const [type, setType] = useState<GoalType>("savings");
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [currency, setCurrency] = useState<Currency>("CRC");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState("");
  const [ref, setRef] = useState<Partial<Goal> | null>(null);
  if (goal !== ref) {
    setRef(goal);
    if (goal) {
      setType(goal.type ?? "savings");
      setName(goal.name ?? "");
      setTarget(goal.target_amount ? String(goal.target_amount).replace(".", ",") : "");
      setCurrency(goal.currency ?? "CRC");
      setCategoryId(goal.category_id ?? "");
      setDate(goal.target_date ?? "");
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const value = parseAmount(target);
    if (!value) return toast.show("Escribe un monto", "danger");
    if (type === "spend_reduction" && !categoryId) return toast.show("Elige la categoría", "danger");
    try {
      await save.mutateAsync({
        id: goal?.id,
        type,
        name: name.trim() || (type === "spend_reduction" ? `Tope en ${categories.find((c) => c.id === categoryId)?.name}` : "Ahorro"),
        target_amount: value,
        currency,
        category_id: type === "spend_reduction" ? categoryId : null,
        target_date: type === "savings" ? date || null : null,
      });
      toast.show("Meta guardada", "success");
      onClose();
    } catch (err) {
      toast.show(errorMessage(err), "danger");
    }
  }

  return (
    <Modal open={Boolean(goal)} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <h2 className="text-lg font-bold">{goal?.id ? "Editar meta" : "Nueva meta"}</h2>
        {!goal?.id && (
          <Segmented label="Tipo de meta" className="w-full" value={type} onChange={setType} options={[{ value: "savings", label: "Ahorrar" }, { value: "spend_reduction", label: "Gastar menos" }]} />
        )}
        <label className="block">
          <span className="label">Nombre</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={type === "savings" ? "Fondo de emergencia" : "Menos restaurantes"} />
        </label>
        {type === "spend_reduction" && (
          <label className="block">
            <span className="label">Categoría</span>
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
              <option value="">Elegir…</option>
              {categories.filter((c) => c.kind_hint === "expense" && !c.is_archived).map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </Select>
          </label>
        )}
        <div className="flex gap-2">
          <label className="flex-1">
            <span className="label">{type === "savings" ? "Meta" : "Tope por mes"}</span>
            <Input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} className="amount" required />
          </label>
          <div>
            <span className="label">Moneda</span>
            <Segmented label="Moneda" value={currency} onChange={setCurrency} options={[{ value: "CRC", label: "₡" }, { value: "USD", label: "$" }]} />
          </div>
        </div>
        {type === "savings" && (
          <label className="block">
            <span className="label">Para cuándo (opcional)</span>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        )}
        <Button type="submit" fullWidth>Guardar</Button>
        {goal?.id && (
          <Button type="button" variant="outline" fullWidth className="text-deficit" onClick={async () => { await del.mutateAsync(goal.id!); onClose(); }}>
            Borrar meta
          </Button>
        )}
      </form>
    </Modal>
  );
}

function ContributeSheet({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const save = useSaveGoal();
  const toast = useToast();
  const [amount, setAmount] = useState("");
  const [sign, setSign] = useState<"add" | "remove">("add");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const v = parseAmount(amount);
    if (!goal || !v) return;
    const next = Math.max(0, goal.saved_amount + (sign === "add" ? v : -v));
    await save.mutateAsync({ id: goal.id, saved_amount: next });
    toast.show(sign === "add" ? "Apartado" : "Retirado", "success");
    setAmount("");
    onClose();
  }

  return (
    <Modal open={Boolean(goal)} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <h2 className="text-lg font-bold">{goal?.name}</h2>
        <Segmented label="Movimiento" className="w-full" value={sign} onChange={setSign} options={[{ value: "add", label: "Apartar" }, { value: "remove", label: "Retirar" }]} />
        <label className="block">
          <span className="label">Monto ({goal?.currency === "USD" ? "$" : "₡"})</span>
          <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="amount text-lg" required autoFocus />
        </label>
        <Button type="submit" fullWidth>Guardar</Button>
      </form>
    </Modal>
  );
}
