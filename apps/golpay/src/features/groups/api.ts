import { supabase } from "@/lib/supabase/client";

export interface Group {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  /** Rol del usuario actual en este grupo. */
  role: "owner" | "admin";
}

export interface GroupMember {
  user_id: string;
  role: "owner" | "admin";
  created_at: string;
  full_name: string | null;
  username: string | null;
}

export interface GroupInvite {
  id: string;
  token: string;
  label: string | null;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

/** Los grupos donde estoy, con mi rol. */
export async function listGroups(): Promise<Group[]> {
  const { data, error } = await supabase
    .from("group_members")
    .select("role, groups(id, name, created_by, created_at)")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  type Row = { role: "owner" | "admin"; groups: Omit<Group, "role"> | null };
  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.groups)
    .map((r) => ({ ...(r.groups as Omit<Group, "role">), role: r.role }));
}

export async function getGroup(id: string): Promise<Group | null> {
  const { data, error } = await supabase
    .from("group_members")
    .select("role, groups(id, name, created_by, created_at)")
    .eq("group_id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as unknown as { role: "owner" | "admin"; groups: Omit<Group, "role"> | null };
  return row.groups ? { ...row.groups, role: row.role } : null;
}

/** Crea el grupo y te deja de owner (una sola operación en el servidor). */
export async function createGroup(name: string): Promise<string> {
  const { data, error } = await supabase.rpc("create_group", { p_name: name });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function renameGroup(id: string, name: string): Promise<void> {
  const { error } = await supabase.from("groups").update({ name: name.trim() }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteGroup(id: string): Promise<void> {
  const { error } = await supabase.from("groups").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// -------------------- Miembros --------------------

export async function listMembers(groupId: string): Promise<GroupMember[]> {
  const { data, error } = await supabase
    .from("group_members")
    .select("user_id, role, created_at, profiles(full_name, username)")
    .eq("group_id", groupId)
    .order("created_at");
  if (error) throw new Error(error.message);

  type Row = {
    user_id: string; role: "owner" | "admin"; created_at: string;
    profiles: { full_name: string | null; username: string | null } | null;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    user_id: r.user_id,
    role: r.role,
    created_at: r.created_at,
    full_name: r.profiles?.full_name ?? null,
    username: r.profiles?.username ?? null,
  }));
}

export async function removeMember(groupId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

// -------------------- Invitaciones --------------------

export async function listInvites(groupId: string): Promise<GroupInvite[]> {
  const { data, error } = await supabase
    .from("group_invites")
    .select("id, token, label, expires_at, accepted_at, revoked_at, created_at")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as GroupInvite[];
}

/** Crea una invitación de un solo uso. Devuelve el token para armar el enlace. */
export async function createInvite(
  groupId: string,
  label: string | null,
  invitedBy: string,
): Promise<GroupInvite> {
  const { data, error } = await supabase
    .from("group_invites")
    .insert({ group_id: groupId, label: label?.trim() || null, invited_by: invitedBy })
    .select("id, token, label, expires_at, accepted_at, revoked_at, created_at")
    .single();
  if (error) throw new Error(error.message);
  return data as GroupInvite;
}

export async function revokeInvite(id: string): Promise<void> {
  const { error } = await supabase
    .from("group_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export interface InvitePeek {
  group_name: string;
  invited_by: string | null;
  valid: boolean;
}

/** Ver a qué grupo te invitan antes de aceptar. No expone nada más del grupo. */
export async function peekInvite(token: string): Promise<InvitePeek | null> {
  const { data, error } = await supabase.rpc("peek_group_invite", { p_token: token });
  if (error) throw new Error(error.message);
  return (data as InvitePeek | null) ?? null;
}

/** Acepta la invitación. El servidor exige sesión iniciada. Devuelve el grupo. */
export async function acceptInvite(token: string): Promise<string> {
  const { data, error } = await supabase.rpc("accept_group_invite", { p_token: token });
  if (error) throw new Error(error.message);
  return data as string;
}

/** Enlace público de la invitación. */
export function inviteUrl(token: string): string {
  return `${window.location.origin}/invitacion/${token}`;
}

/** Mensaje listo para WhatsApp. */
export function inviteMessage(groupName: string, url: string): string {
  return (
    `⚽ Te invito a organizar *${groupName}* en GolPay.\n\n` +
    `Con este enlace vas a poder crear partidos, armar equipos y aprobar pagos.\n` +
    `Es de un solo uso y vence en 7 días.\n\n${url}`
  );
}

/** Abre WhatsApp con el mensaje listo. */
export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
