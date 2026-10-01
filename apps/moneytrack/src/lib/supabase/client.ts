import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  console.warn("[MoneyTrack] Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copiá .env.example a .env.local.");
}

// Sin generic de Database: interfaces de dominio en types.ts (patrón del monorepo).
export const supabase = createClient(url ?? "", anonKey ?? "");

/** Id del usuario con sesión (lanza si no hay). */
export async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error("Tu sesión expiró. Vuelve a entrar.");
  return id;
}
