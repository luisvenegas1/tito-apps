import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/ui/TopBar";
import { useDialog } from "@/components/ui/Dialog";
import { copyToClipboard } from "@/components/ui/toast";
import { useAuth } from "../auth/AuthProvider";
import { useGroupId, useGroup } from "./useGroup";
import {
  listMembers, removeMember, listInvites, createInvite, revokeInvite,
  renameGroup, inviteUrl, inviteMessage, whatsappShareUrl, GroupInvite,
} from "./api";
import { formatDate } from "@/lib/utils/format";
import { Button } from "@titoapps/ui";

function inviteState(i: GroupInvite): { label: string; tone: string } {
  if (i.accepted_at) return { label: "Usada", tone: "text-gray-400" };
  if (i.revoked_at) return { label: "Anulada", tone: "text-gray-400" };
  if (new Date(i.expires_at) < new Date()) return { label: "Vencida", tone: "text-gray-400" };
  return { label: "Pendiente", tone: "text-pitch-600" };
}

export function MembersPage() {
  const gid = useGroupId();
  const qc = useQueryClient();
  const dialog = useDialog();
  const { session } = useAuth();
  const { data: group } = useGroup();

  const { data: members } = useQuery({ queryKey: ["members", gid], queryFn: () => listMembers(gid) });
  const { data: invites } = useQuery({ queryKey: ["invites", gid], queryFn: () => listInvites(gid) });

  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const isOwner = group?.role === "owner";

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  async function invite() {
    if (!session || !group) return;
    setBusy(true);
    try {
      const inv = await createInvite(gid, label || null, session.user.id);
      await qc.invalidateQueries({ queryKey: ["invites", gid] });
      setLabel("");
      const url = inviteUrl(inv.token);
      const text = inviteMessage(group.name, url);
      window.open(whatsappShareUrl(text), "_blank");
      await copyToClipboard(url);
      flash("Invitación creada. También copiamos el enlace.");
    } catch (e: any) {
      dialog.alert({ title: "No se pudo crear la invitación", message: e.message ?? "Error" });
    } finally {
      setBusy(false);
    }
  }

  async function kick(userId: string, name: string) {
    const ok = await dialog.confirm({
      title: `¿Sacar a ${name} del grupo?`,
      message: "Deja de ver los partidos, los jugadores y los pagos. Podés volver a invitarlo cuando quieras.",
      confirmLabel: "Sacar",
      danger: true,
    });
    if (!ok) return;
    await removeMember(gid, userId);
    qc.invalidateQueries({ queryKey: ["members", gid] });
  }

  async function rename() {
    const name = await dialog.prompt({
      title: "Nombre del grupo",
      defaultValue: group?.name ?? "",
      confirmLabel: "Guardar",
    });
    if (name === null || !name.trim()) return;
    await renameGroup(gid, name);
    qc.invalidateQueries({ queryKey: ["group", gid] });
    qc.invalidateQueries({ queryKey: ["groups"] });
  }

  return (
    <div className="pb-8">
      <TopBar
        title={group?.name ?? "Miembros"}
        back
        backTo={`/g/${gid}`}
        right={
          isOwner ? (
            <button className="text-sm text-gray-400 underline" onClick={rename}>Renombrar</button>
          ) : undefined
        }
      />

      <div className="space-y-4 p-4">
        <div className="card">
          <div className="mb-2 font-semibold">Quiénes organizan</div>
          <p className="mb-2 text-xs text-gray-400">
            Todos pueden crear partidos, importar listas, armar equipos y aprobar pagos.
          </p>
          <div className="space-y-1.5">
            {(members ?? []).map((m) => (
              <div key={m.user_id} className="flex items-center justify-between border-t border-gray-100 pt-1.5 first:border-0 first:pt-0">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {m.full_name || m.username || "Sin nombre"}
                    {m.user_id === session?.user.id && " (vos)"}
                  </div>
                  <div className="text-xs text-gray-400">
                    {m.role === "owner" ? "Creador" : "Administrador"}
                    {m.username && ` · @${m.username}`}
                  </div>
                </div>
                {isOwner && m.role !== "owner" && (
                  <button
                    className="shrink-0 text-xs text-red-400 underline"
                    onClick={() => kick(m.user_id, m.full_name || m.username || "esta persona")}
                  >
                    Sacar
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="card space-y-2">
          <div className="font-semibold">Invitar por WhatsApp</div>
          <p className="text-xs text-gray-400">
            El enlace sirve <b>una sola vez</b> y vence en 7 días. Quien lo abra tiene que
            tener cuenta e iniciar sesión: sin eso no entra.
          </p>
          <input
            className="input"
            placeholder="¿Para quién? (ej. Ale) — opcional"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <Button fullWidth onClick={invite} disabled={busy}>
            {busy ? "Creando…" : "📲 Crear invitación y abrir WhatsApp"}
          </Button>
        </div>

        {(invites?.length ?? 0) > 0 && (
          <div className="card">
            <div className="mb-2 font-semibold">Invitaciones</div>
            <div className="space-y-1.5">
              {(invites ?? []).map((i) => {
                const st = inviteState(i);
                const pending = st.label === "Pendiente";
                return (
                  <div key={i.id} className="flex items-center justify-between gap-2 border-t border-gray-100 pt-1.5 first:border-0 first:pt-0">
                    <div className="min-w-0">
                      <div className="truncate text-sm">{i.label || "Sin nombre"}</div>
                      <div className={`text-xs ${st.tone}`}>
                        {st.label} · vence {formatDate(i.expires_at.slice(0, 10))}
                      </div>
                    </div>
                    {pending && (
                      <div className="flex shrink-0 gap-2">
                        <button
                          className="text-xs text-pitch-600 underline"
                          onClick={async () => {
                            await copyToClipboard(inviteUrl(i.token));
                            flash("Enlace copiado");
                          }}
                        >
                          Copiar
                        </button>
                        <button
                          className="text-xs text-red-400 underline"
                          onClick={async () => {
                            await revokeInvite(i.id);
                            qc.invalidateQueries({ queryKey: ["invites", gid] });
                          }}
                        >
                          Anular
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
