import { useState, type FormEvent } from "react";
import { Button, Input, useToast } from "@titoapps/ui";
import { copyToClipboard } from "@titoapps/utils";
import { errorMessage } from "@/lib/errors";
import { formatDay } from "@/lib/dates";
import { useCreateInvite, useInvites, useRevokeInvite, type AccountView } from "@/features/data/shared";

/**
 * Invitar a la otra persona. El enlace se comparte por WhatsApp o se copia;
 * solo funciona si quien lo abre entra con el correo invitado (accept_invite).
 */
export function InvitePanel({ account, startOpen }: { account: AccountView; startOpen?: boolean }) {
  const { data: invites = [] } = useInvites(account.id, true);
  const create = useCreateInvite();
  const revoke = useRevokeInvite();
  const toast = useToast();
  const [open, setOpen] = useState(Boolean(startOpen));
  const [email, setEmail] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const pending = invites[0];

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      setLink(await create.mutateAsync({ accountId: account.id, email }));
    } catch (err) {
      toast.show(errorMessage(err), "danger");
    }
  }

  const message = link
    ? `Hola ${account.debtor_label}, te invito a ver nuestra cuenta en Money Track. Entra con tu correo ${email || pending?.email}: ${link}`
    : "";

  return (
    <section className="card mx-4 mt-3">
      {link ? (
        <>
          <p className="font-semibold">Invitación lista</p>
          <p className="mt-1 text-sm text-muted">Envíale este enlace a {account.otherLabel}. Vence en 14 días y solo sirve con el correo que pusiste.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <a className="rounded-token bg-primary py-2.5 text-center font-semibold text-primary-contrast" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
              Enviar por WhatsApp
            </a>
            <Button
              variant="outline"
              onClick={async () => {
                await copyToClipboard(link);
                toast.show("Enlace copiado", "success");
              }}
            >
              Copiar enlace
            </Button>
          </div>
        </>
      ) : pending && !open ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm">
            Invitación enviada a <span className="font-semibold">{pending.email}</span>
            <span className="block text-xs text-muted">Vence el {formatDay(pending.expires_at.slice(0, 10))}</span>
          </p>
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Reenviar</Button>
            <Button size="sm" variant="ghost" onClick={() => revoke.mutate(pending)}>Cancelar</Button>
          </div>
        </div>
      ) : open ? (
        <form onSubmit={submit}>
          <p className="font-semibold">Invitar a {account.otherLabel}</p>
          <p className="mt-1 text-sm text-muted">Verá este libro y podrá registrar cargos y abonos. No verá nada más de tus finanzas.</p>
          <div className="mt-3 flex gap-2">
            <Input type="email" placeholder="Su correo" value={email} onChange={(e) => setEmail(e.target.value)} required aria-label="Correo" />
            <Button type="submit" disabled={create.isPending}>Crear enlace</Button>
          </div>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm">{account.otherLabel} todavía no puede ver esta cuenta.</p>
          <Button size="sm" onClick={() => setOpen(true)}>Invitar</Button>
        </div>
      )}
    </section>
  );
}
