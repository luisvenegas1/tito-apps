import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Input, Modal, useToast } from "@titoapps/ui";
import { balances } from "@/lib/ledger";
import { formatDay } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { PageHeader } from "@/components/PageHeader";
import { MoneyByCurrency } from "@/components/Money";
import { Empty, ErrorNote, Loading } from "@/components/Empty";
import { useProfile } from "@/features/data/core";
import { useAccounts, useAllEntries, useCreateAccount, type AccountView } from "@/features/data/shared";

/** S5: "Me deben" y "Debo" con el mismo componente (spec §5.3). */
export function AccountsPage() {
  const q = useAccounts();
  const { data: entries = [] } = useAllEntries();
  const [creating, setCreating] = useState(false);
  const accounts = (q.data ?? []).filter((a) => a.is_active);
  const archived = (q.data ?? []).filter((a) => !a.is_active);
  const owed = accounts.filter((a) => a.role === "creditor");
  const owing = accounts.filter((a) => a.role === "debtor");

  const Group = ({ title, list, hint }: { title: string; list: AccountView[]; hint: string }) => (
    <section>
      <h2 className="section-title">{title}</h2>
      <ul className="card divide-y divide-border p-0">
        {list.map((a) => {
          const mine = entries.filter((e) => e.account_id === a.id && !e.deleted_at);
          const last = mine[mine.length - 1];
          return (
            <li key={a.id}>
              <Link to={`/cuentas/${a.id}`} className="row hover:bg-surface-subtle">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-deep text-lg font-bold text-mint" aria-hidden>
                  {a.otherLabel.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{a.otherLabel}</span>
                  <span className="block truncate text-xs text-muted">
                    {a.role === "creditor" && !a.debtor_id ? "Aún no vinculada · " : ""}
                    {last ? `Último: ${last.concept} (${formatDay(last.occurred_on)})` : "Sin movimientos"}
                  </span>
                </span>
                <span className="text-right">
                  <MoneyByCurrency value={balances(mine)} className="block text-lg" />
                  <span className="text-xs text-muted">{hint}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );

  return (
    <div>
      <PageHeader
        title="Cuentas"
        action={
          <button type="button" onClick={() => setCreating(true)} className="rounded-full px-3 py-1.5 text-sm font-semibold text-primary hover:bg-surface-subtle">
            Nueva cuenta
          </button>
        }
      />
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorNote error={q.error} onRetry={() => q.refetch()} />
      ) : accounts.length === 0 ? (
        <Empty
          title="Todavía no tienes cuentas compartidas"
          action={<Button onClick={() => setCreating(true)}>Crear la primera</Button>}
        >
          Lleva lo que alguien te debe (por ejemplo, las compras de tu mamá con tu tarjeta) con cargos y abonos. La otra persona puede entrar y ver el mismo libro.
        </Empty>
      ) : (
        <div className="px-4 pb-6">
          {owed.length > 0 && <Group title="Me deben" list={owed} hint="te debe" />}
          {owing.length > 0 && <Group title="Debo" list={owing} hint="le debes" />}
          {archived.length > 0 && (
            <p className="mt-6 text-center text-sm text-muted">
              Archivadas: {archived.map((a, i) => (
                <span key={a.id}>
                  {i > 0 && ", "}
                  <Link to={`/cuentas/${a.id}`} className="font-semibold">{a.otherLabel}</Link>
                </span>
              ))}
            </p>
          )}
        </div>
      )}
      <NewAccountSheet open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function NewAccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: profile } = useProfile();
  const create = useCreateAccount();
  const navigate = useNavigate();
  const toast = useToast();
  const [other, setOther] = useState("");
  const [me, setMe] = useState("");
  const [card, setCard] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      const id = await create.mutateAsync({
        debtor_label: other,
        creditor_label: me.trim() || profile?.display_name || "Yo",
        linked_card: card.trim() || null,
      });
      onClose();
      setOther("");
      setCard("");
      navigate(`/cuentas/${id}?invitar=1`);
    } catch (err) {
      toast.show(errorMessage(err), "danger");
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <h2 className="text-lg font-bold">Nueva cuenta compartida</h2>
        <p className="text-sm text-muted">Tú anotas lo que la otra persona te debe. Después puedes invitarla para que vea y registre en el mismo libro.</p>
        <label className="block">
          <span className="label">¿Quién te debe?</span>
          <Input value={other} onChange={(e) => setOther(e.target.value)} placeholder="Mamá" required autoFocus />
        </label>
        <label className="block">
          <span className="label">¿Cómo te verá esa persona?</span>
          <Input value={me} onChange={(e) => setMe(e.target.value)} placeholder={profile?.display_name ?? "Luis"} />
        </label>
        <label className="block">
          <span className="label">Tarjeta asociada (opcional)</span>
          <Input value={card} onChange={(e) => setCard(e.target.value)} placeholder="Extensión BAC ••1234" />
        </label>
        <Button type="submit" fullWidth disabled={create.isPending}>Crear cuenta</Button>
      </form>
    </Modal>
  );
}
