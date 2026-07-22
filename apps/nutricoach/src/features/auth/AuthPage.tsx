import { useState } from "react";
import { Button, Input, FormField } from "@titoapps/ui";
import { supabase } from "@/lib/supabase/client";

/** Login / registro con Supabase (email + password), patrón del monorepo. */
export function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setInfo("Revisá tu correo para confirmar la cuenta.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell flex min-h-screen flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-slate-900">NutriCoach</h1>
        <p className="mt-1 text-slate-500">Tu nutricionista personal con IA.</p>
      </div>
      <form onSubmit={submit} className="card space-y-4">
        <FormField label="Correo">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </FormField>
        <FormField label="Contraseña">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </FormField>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {info && <p className="text-sm text-green-600">{info}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "..." : mode === "login" ? "Entrar" : "Crear cuenta"}
        </Button>
      </form>
      <button
        className="mt-4 text-center text-sm text-slate-500 underline"
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
      >
        {mode === "login" ? "No tengo cuenta" : "Ya tengo cuenta"}
      </button>
    </div>
  );
}
