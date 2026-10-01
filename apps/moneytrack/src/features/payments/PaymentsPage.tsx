import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button, Input, Modal, cn, useToast } from "@titoapps/ui";
import { formatDay, parseISODate, todayISO } from "@/lib/dates";
import { formatMoney, parseAmount } from "@/lib/money";
import { errorMessage } from "@/lib/errors";
import { paymentGroup, paymentState, paymentStateLabel } from "@/lib/payments";
import { PageHeader } from "@/components/PageHeader";
import { Empty, Loading } from "@/components/Empty";
import { usePayScheduled, useScheduledPayments, useTemplates, useUpdateScheduled } from "@/features/data/planning";
import type { ScheduledPayment } from "@/lib/supabase/types";

const GROUPS = [
  { key: "overdue", title: "Atrasados" },
  { key: "week", title: "Esta semana" },
  { key: "later", title: "Más adelante" },
  { key: "done", title: "Pagados u omitidos" },
] as const;

/** S7: próximos pagos con estados y acciones. */
export function PaymentsPage() {
  const q = useScheduledPayments();
  const { data: templates = [] } = useTemplates();
  const update = useUpdateScheduled();
  const toast = useToast();
  const [paying, setPaying] = useState<ScheduledPayment | null>(null);
  const today = todayISO();
  const daysToSunday = 7 - (parseISODate(today).getDay() || 7);
  const name = new Map(templates.map((t) => [t.id, t.name]));

  const withState = (q.data ?? []).map((p) => ({ p, st: paymentState(p.due_date, p.status, today) }));
  const grouped = GROUPS.map((g) => ({
    ...g,
    items: withState.filter(({ st }) => paymentGroup(st, daysToSunday) === g.key),
  })).map((g) => (g.key === "done" ? { ...g, items: g.items.slice(-8).reverse() } : g));

  async function postpone(p: ScheduledPayment, days: number) {
    const d = parseISODate(p.due_date);
    d.setDate(d.getDate() + days);
    const due = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    try {
      await update.mutateAsync({ id: p.id, due_date: due });
      toast.show(`Pospuesto al ${formatDay(due)}`);
    } catch (e) {
      toast.show(errorMessage(e), "danger");
    }
  }

  return (
    <div>
      <PageHeader title="Próximos pagos" back action={<Link to="/recurrentes" className="px-3 text-sm font-semibold text-primary">Pagos fijos</Link>} />
      {q.isLoading ? (
        <Loading />
      ) : withState.length === 0 ? (
        <Empty title="No hay pagos programados" action={<Link to="/recurrentes" className="font-semibold text-primary">Agregar pagos fijos</Link>}>
          Agrega tus pagos que se repiten (préstamo, condominio, seguros) y aparecerán aquí cada mes.
        </Empty>
      ) : (
        <div className="px-4 pb-6">
          {grouped
            .filter((g) => g.items.length > 0)
            .map((g) => (
              <section key={g.key}>
                <h2 className="section-title">{g.title}</h2>
                <ul className="card divide-y divide-border p-0">
                  {g.items.map(({ p, st }) => (
                    <li key={p.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span>
                          <span className="block font-semibold">{name.get(p.template_id) ?? "Pago"}</span>
                          <span
                            className={cn(
                              "text-sm",
                              st.kind === "overdue" ? "font-semibold text-deficit" : st.kind === "today" || st.kind === "tomorrow" ? "font-semibold text-amber-600" : "text-muted",
                            )}
                          >
                            {paymentStateLabel(st)} · {formatDay(p.due_date)}
                          </span>
                        </span>
                        {p.amount_est !== null && <span className="amount">{formatMoney(p.amount_est, p.currency)}</span>}
                      </div>
                      {p.status === "pending" && (
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" onClick={() => setPaying(p)}>Marcar pagado</Button>
                          <Button size="sm" variant="ghost" onClick={() => postpone(p, 3)}>Posponer 3 días</Button>
                          <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: p.id, status: "skipped" })}>Omitir</Button>
                        </div>
                      )}
                      {p.status === "skipped" && (
                        <button type="button" className="mt-1 text-sm font-semibold text-primary" onClick={() => update.mutate({ id: p.id, status: "pending" })}>
                          Volver a pendiente
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
        </div>
      )}
      <PaySheet payment={paying} name={paying ? name.get(paying.template_id) ?? "" : ""} onClose={() => setPaying(null)} />
    </div>
  );
}

function PaySheet({ payment, name, onClose }: { payment: ScheduledPayment | null; name: string; onClose: () => void }) {
  const pay = usePayScheduled();
  const toast = useToast();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [lastId, setLastId] = useState<string | null>(null);
  if (payment && payment.id !== lastId) {
    setLastId(payment.id);
    setAmount(payment.amount_est !== null ? String(payment.amount_est).replace(".", ",") : "");
    setDate(todayISO());
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const value = parseAmount(amount);
    if (!payment || !value) return;
    try {
      await pay.mutateAsync({ id: payment.id, amount: value, date });
      toast.show("Pago registrado en tus movimientos", "success");
      onClose();
    } catch (err) {
      toast.show(errorMessage(err), "danger");
    }
  }

  return (
    <Modal open={Boolean(payment)} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <h2 className="text-lg font-bold">Pagar {name}</h2>
        <p className="text-sm text-muted">Se crea el movimiento con el monto real. Puedes ajustarlo si cambió este mes.</p>
        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="label">Monto ({payment?.currency === "USD" ? "$" : "₡"})</span>
            <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="amount" required />
          </label>
          <label>
            <span className="label">Fecha de pago</span>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
        </div>
        <Button type="submit" fullWidth disabled={pay.isPending}>Marcar pagado</Button>
      </form>
    </Modal>
  );
}
