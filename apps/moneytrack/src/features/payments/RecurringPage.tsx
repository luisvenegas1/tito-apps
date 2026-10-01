import { useState, type FormEvent } from "react";
import { Button, Input, Modal, Select, useToast } from "@titoapps/ui";
import { formatMoney, parseAmount, CURRENCY_OPTIONS } from "@/lib/money";
import { todayISO } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { PageHeader } from "@/components/PageHeader";
import { Segmented } from "@/components/Segmented";
import { Empty, Loading } from "@/components/Empty";
import { useCategories, useCategoryMap } from "@/features/data/core";
import { useDeleteTemplate, useSaveTemplate, useTemplates } from "@/features/data/planning";
import type { Currency, PaidBy, RecurrenceFreq, RecurringTemplate, TxnScope } from "@/lib/supabase/types";

const FREQ: Record<RecurrenceFreq, string> = { monthly: "Mensual", biweekly: "Quincenal", weekly: "Semanal", yearly: "Anual" };

/** S8: plantillas de pagos fijos. */
export function RecurringPage() {
  const q = useTemplates();
  const catMap = useCategoryMap();
  const [editing, setEditing] = useState<Partial<RecurringTemplate> | null>(null);

  return (
    <div>
      <PageHeader title="Pagos fijos" back action={<button type="button" className="px-3 text-sm font-semibold text-primary" onClick={() => setEditing({})}>Agregar</button>} />
      {q.isLoading ? (
        <Loading />
      ) : (q.data ?? []).length === 0 ? (
        <Empty title="Sin pagos fijos" action={<Button onClick={() => setEditing({})}>Agregar el primero</Button>}>
          Préstamo de la casa, condominio, seguros, teléfono… Se generan solos cada período y te avisamos antes de que venzan.
        </Empty>
      ) : (
        <ul className="card mx-4 mt-4 divide-y divide-border p-0">
          {q.data!.map((t) => {
            const c = t.category_id ? catMap.get(t.category_id) : undefined;
            return (
              <li key={t.id}>
                <button type="button" className="row w-full text-left hover:bg-surface-subtle" onClick={() => setEditing(t)}>
                  <span className="text-xl" aria-hidden>{c?.icon ?? "🔁"}</span>
                  <span className="flex-1">
                    <span className="block font-semibold">{t.name}</span>
                    <span className="text-xs text-muted">
                      {FREQ[t.frequency]}
                      {t.due_day && (t.frequency === "monthly" || t.frequency === "yearly") ? ` · día ${t.due_day}` : ""}
                      {!t.is_active && " · pausado"}
                    </span>
                  </span>
                  {t.amount_est !== null && <span className="amount">{formatMoney(t.amount_est, t.currency)}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <TemplateSheet template={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function TemplateSheet({ template, onClose }: { template: Partial<RecurringTemplate> | null; onClose: () => void }) {
  const { data: categories = [] } = useCategories();
  const save = useSaveTemplate();
  const del = useDeleteTemplate();
  const toast = useToast();
  const [form, setForm] = useState<Partial<RecurringTemplate>>({});
  const [amount, setAmount] = useState("");
  const [lastRef, setLastRef] = useState<Partial<RecurringTemplate> | null>(null);
  if (template !== lastRef) {
    setLastRef(template);
    if (template) {
      setForm({ frequency: "monthly", currency: "CRC", paid_by: "me", scope: "personal", kind: "expense", is_active: true, start_on: todayISO(), due_day: new Date().getDate(), ...template });
      setAmount(template.amount_est != null ? String(template.amount_est).replace(".", ",") : "");
    }
  }
  const set = <K extends keyof RecurringTemplate>(k: K, v: RecurringTemplate[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      await save.mutateAsync({
        id: form.id,
        kind: form.kind ?? "expense",
        name: (form.name ?? "").trim(),
        category_id: form.category_id || null,
        amount_est: amount ? parseAmount(amount) : null,
        currency: form.currency as Currency,
        paid_by: form.paid_by as PaidBy,
        scope: form.scope as TxnScope,
        frequency: form.frequency as RecurrenceFreq,
        due_day: form.frequency === "monthly" || form.frequency === "yearly" ? Number(form.due_day) || null : null,
        start_on: form.start_on ?? todayISO(),
        end_on: form.end_on || null,
        is_active: form.is_active ?? true,
      });
      toast.show("Pago fijo guardado", "success");
      onClose();
    } catch (err) {
      toast.show(errorMessage(err), "danger");
    }
  }

  const monthly = form.frequency === "monthly" || form.frequency === "yearly";
  return (
    <Modal open={Boolean(template)} onClose={onClose} className="max-h-[92vh] overflow-y-auto">
      <form onSubmit={submit} className="space-y-4">
        <h2 className="text-lg font-bold">{form.id ? "Editar pago fijo" : "Nuevo pago fijo"}</h2>
        <label className="block">
          <span className="label">Nombre</span>
          <Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} placeholder="Préstamo casa" required />
        </label>
        <div className="flex gap-2">
          <label className="flex-1">
            <span className="label">Monto estimado</span>
            <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="amount" />
          </label>
          <div>
            <span className="label">Moneda</span>
            <Segmented label="Moneda" value={(form.currency ?? "CRC") as Currency} onChange={(v) => set("currency", v)} options={CURRENCY_OPTIONS} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="label">Frecuencia</span>
            <Select value={form.frequency} onChange={(e) => set("frequency", e.target.value as RecurrenceFreq)}>
              {Object.entries(FREQ).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </label>
          {monthly ? (
            <label>
              <span className="label">Día de vencimiento</span>
              <Input type="number" min={1} max={31} value={form.due_day ?? ""} onChange={(e) => set("due_day", Number(e.target.value))} />
            </label>
          ) : (
            <label>
              <span className="label">Primer pago</span>
              <Input type="date" value={form.start_on ?? ""} onChange={(e) => set("start_on", e.target.value)} />
            </label>
          )}
        </div>
        <label className="block">
          <span className="label">Categoría</span>
          <Select value={form.category_id ?? ""} onChange={(e) => set("category_id", e.target.value || null)}>
            <option value="">Sin categoría</option>
            {categories.filter((c) => !c.is_archived).map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </Select>
        </label>
        <div>
          <span className="label">¿Quién lo paga?</span>
          <Segmented
            label="Pagado por"
            className="w-full"
            value={(form.paid_by ?? "me") as PaidBy}
            onChange={(v) => setForm((f) => ({ ...f, paid_by: v, scope: v === "partner" ? "household" : f.scope }))}
            options={[{ value: "me", label: "Yo" }, { value: "partner", label: "Pareja" }, { value: "shared", label: "Compartido" }]}
          />
        </div>
        <div>
          <span className="label">Ámbito</span>
          <Segmented label="Ámbito" className="w-full" value={(form.scope ?? "personal") as TxnScope} onChange={(v) => set("scope", v)} options={[{ value: "personal", label: "Personal" }, { value: "household", label: "Hogar" }]} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.is_active ?? true} onChange={(e) => set("is_active", e.target.checked)} className="h-4 w-4 accent-emerald-600" />
          Activo (genera pagos)
        </label>
        <Button type="submit" fullWidth disabled={save.isPending}>Guardar</Button>
        {form.id && (
          <Button
            type="button"
            variant="outline"
            fullWidth
            className="text-deficit"
            onClick={async () => {
              await del.mutateAsync(form.id!);
              toast.show("Pago fijo borrado");
              onClose();
            }}
          >
            Borrar (y sus pagos pendientes)
          </Button>
        )}
      </form>
    </Modal>
  );
}
