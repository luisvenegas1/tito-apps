import { supabase } from "@/lib/supabase/client";
import { looksLikeEmail, validateUsername } from "@/lib/username";

const GENERIC = "Usuario o contraseña incorrectos";

/** Login por email (directo en el cliente) o username (vía Edge Function segura). */
export async function signInWithIdentifier(identifier: string, password: string): Promise<void> {
  const id = identifier.trim();
  if (looksLikeEmail(id)) {
    const { error } = await supabase.auth.signInWithPassword({ email: id, password });
    if (error) throw new Error(GENERIC);
    return;
  }
  // Username -> la Edge Function resuelve el email en el servidor y devuelve tokens.
  const { data, error } = await supabase.functions.invoke("login", {
    body: { identifier: id, password },
  });
  if (error || !data?.access_token) throw new Error(GENERIC);
  const { error: sessErr } = await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });
  if (sessErr) throw new Error(GENERIC);
}

/** Disponibilidad del username (RPC que solo devuelve booleano). */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("username_available", { u: username });
  if (error) return false;
  return Boolean(data);
}

/** Registro con username. La unicidad final la garantiza la BD. */
export async function signUpWithUsername(
  email: string,
  password: string,
  username: string,
  fullName: string,
): Promise<{ needsConfirmation: boolean }> {
  const v = validateUsername(username);
  if (!v.ok) throw new Error(v.error);
  if (!(await isUsernameAvailable(username))) throw new Error("Ese usuario ya está en uso.");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw error;

  // Si hay sesión (confirmación desactivada), fijamos el username ya.
  if (data.session && data.user) {
    const { error: upErr } = await supabase
      .from("profiles")
      .update({ username })
      .eq("user_id", data.user.id);
    if (upErr) throw new Error("Ese usuario ya está en uso.");
    return { needsConfirmation: false };
  }
  // Con confirmación activada, el gate de username lo fija tras el primer login.
  return { needsConfirmation: true };
}

/** Cambio de username desde el perfil (mantiene unicidad). */
export async function changeUsername(username: string): Promise<void> {
  const v = validateUsername(username);
  if (!v.ok) throw new Error(v.error);
  if (!(await isUsernameAvailable(username))) throw new Error("Ese usuario ya está en uso.");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { error } = await supabase.from("profiles").update({ username }).eq("user_id", user.id);
  if (error) throw new Error("Ese usuario ya está en uso.");
}

/** Actualiza el nombre visible del usuario. */
export async function updateFullName(fullName: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sesión no válida");
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName.trim() || null })
    .eq("user_id", auth.user.id);
  if (error) throw new Error(error.message);
}

/**
 * Cambia la contraseña. Verificamos la actual reautenticando primero:
 * `updateUser` sola aceptaría el cambio con solo tener la sesión abierta.
 */
export async function changePassword(current: string, next: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const email = auth.user?.email;
  if (!email) throw new Error("Sesión no válida");

  const { error: reauth } = await supabase.auth.signInWithPassword({ email, password: current });
  if (reauth) throw new Error("La contraseña actual no es correcta");

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) throw new Error(error.message);
}

/** Recuperación de contraseña SOLO por email (anti-enumeración: mensaje genérico en la UI). */
export async function requestPasswordReset(email: string): Promise<void> {
  await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/reset`,
  });
}
