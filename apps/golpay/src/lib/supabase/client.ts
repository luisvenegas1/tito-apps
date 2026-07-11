import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  // Aviso claro en desarrollo si faltan variables.
  console.warn(
    "[GolPay] Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copiá .env.example a .env.local.",
  );
}

// Sin generic de Database: usamos nuestras propias interfaces del dominio
// (src/lib/supabase/types.ts) al castear los resultados en cada api.ts.
export const supabase = createClient(url ?? "", anonKey ?? "");
