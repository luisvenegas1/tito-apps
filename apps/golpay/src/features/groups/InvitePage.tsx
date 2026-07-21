import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { acceptInvite, peekInvite } from "./api";
import { useAuth } from "../auth/AuthProvider";
import { Button } from "@titoapps/ui";
import { rememberInvite } from "./pendingInvite";
import { errorMessage } from "@/lib/errors";

export function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const { session, loading } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: peek, isLoading } = useQuery({
    queryKey: ["invite", token],
    queryFn: () => peekInvite(token!),
    enabled: Boolean(token),
  });

  // Sin sesión no hay permisos: guardamos el token y mandamos a entrar.
  useEffect(() => {
    if (!loading && !session && token) rememberInvite(token);
  }, [loading, session, token]);

  if (loading || isLoading) return <p className="p-8 text-center text-gray-400">Cargando…</p>;

  if (!peek) {
    return (
      <Centered title="Invitación no válida">
        Puede que el enlace esté mal copiado o que la invitación ya no exista.
      </Centered>
    );
  }

  if (!peek.valid) {
    return (
      <Centered title="Esta invitación ya no sirve">
        Se usó, venció o fue anulada. Pedile a quien te invitó que te mande una nueva.
      </Centered>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const gid = await acceptInvite(token!);
      await qc.invalidateQueries({ queryKey: ["groups"] });
      nav(`/g/${gid}`, { replace: true });
    } catch (e: any) {
      setError(errorMessage(e, "No se pudo aceptar la invitación"));
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div className="text-4xl">⚽</div>
      <h1 className="mt-2 text-xl font-extrabold">Te invitaron a {peek.group_name}</h1>
      {peek.invited_by && (
        <p className="mt-1 text-sm text-gray-500">De parte de {peek.invited_by}</p>
      )}
      <p className="mt-3 max-w-sm text-sm text-gray-500">
        Al entrar vas a poder crear partidos, importar listas, armar equipos y aprobar pagos
        de este grupo.
      </p>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      <Button className="mt-5" onClick={accept} disabled={busy}>
        {busy ? "Entrando…" : `Entrar a ${peek.group_name}`}
      </Button>
    </div>
  );
}

function Centered({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="mt-2 max-w-sm text-sm text-gray-500">{children}</p>
    </div>
  );
}
