import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@titoapps/ui";
import { useAuth } from "@/features/auth/AuthProvider";
import { AuthPage } from "@/features/auth/AuthPage";
import { acceptInvite, invitePreview, pendingInvite } from "@/features/data/shared";
import { errorMessage } from "@/lib/errors";
import { Loading } from "@/components/Empty";
import { qk } from "@/lib/query";

type Preview = Awaited<ReturnType<typeof invitePreview>> | null;

/** /invitacion/:token — pública. Muestra quién invita, pide entrar y acepta. */
export function AcceptInvitePage() {
  const { token = "" } = useParams();
  const { session, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [preview, setPreview] = useState<Preview | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    pendingInvite.set(token);
    invitePreview(token).then(setPreview).catch(() => setPreview(null));
  }, [token]);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const accountId = await acceptInvite(token);
      pendingInvite.clear();
      await qc.invalidateQueries({ queryKey: qk.accounts });
      navigate(`/cuentas/${accountId}`, { replace: true });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (loading || preview === undefined) return <Loading />;

  if (!preview || !preview.valid) {
    pendingInvite.clear();
    return (
      <div className="mx-auto max-w-md px-6 pt-20 text-center">
        <h1 className="text-2xl font-extrabold">Esta invitación ya no sirve</h1>
        <p className="mt-2 text-muted">Puede que ya se haya usado o que haya vencido. Pide a quien te invitó que te mande una nueva.</p>
        <a href="/" className="mt-6 inline-block font-semibold text-primary">Ir a Money Track</a>
      </div>
    );
  }

  if (!session) {
    return <AuthPage presetEmail={preview.email} intro={`${preview.creditor_label} te invitó a ver y llevar juntos la cuenta que comparten.`} />;
  }

  const wrongEmail = session.user.email?.toLowerCase() !== preview.email;

  return (
    <div className="mx-auto max-w-md px-6 pt-16">
      <img src="/icon.svg" alt="" className="h-14 w-14 rounded-2xl" />
      <h1 className="mt-6 text-2xl font-extrabold">{preview.creditor_label} te invitó a su cuenta compartida</h1>
      <p className="mt-2 text-muted">
        Vas a ver los cargos y abonos entre ustedes y podrás registrar los tuyos. {preview.creditor_label} no verá nada más de tus finanzas, y tú tampoco de las suyas.
      </p>
      {wrongEmail ? (
        <>
          <p className="mt-6 rounded-xl bg-warning/15 px-3 py-2 text-sm">
            La invitación es para <b>{preview.email}</b>, pero entraste como <b>{session.user.email}</b>.
          </p>
          <Button fullWidth className="mt-4" onClick={signOut}>Salir y entrar con {preview.email}</Button>
        </>
      ) : (
        <Button fullWidth size="lg" className="mt-8" onClick={accept} disabled={busy}>
          {busy ? "Aceptando…" : "Aceptar invitación"}
        </Button>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-deficit">{error}</p>}
      <button
        type="button"
        className="mt-6 w-full text-center text-sm font-semibold text-muted"
        onClick={() => {
          pendingInvite.clear();
          navigate("/", { replace: true });
        }}
      >
        Ahora no
      </button>
    </div>
  );
}
