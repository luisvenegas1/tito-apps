import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, useToast } from "@titoapps/ui";
import { parseAmount } from "@/lib/money";
import { todayISO } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { Segmented } from "@/components/Segmented";
import { useProfile, useSaveRate, useUpdateProfile } from "@/features/data/core";
import { useAccounts } from "@/features/data/shared";
import type { Currency } from "@/lib/supabase/types";

/** Primera vez: nombre, moneda principal y tipo de cambio (A3). */
export function OnboardingPage() {
  const { data: profile } = useProfile();
  const { data: accounts = [] } = useAccounts();
  const update = useUpdateProfile();
  const saveRate = useSaveRate();
  const navigate = useNavigate();
  const toast = useToast();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [base, setBase] = useState<Currency>("CRC");
  const [rate, setRate] = useState("505");

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      const v = parseAmount(rate);
      if (v) await saveRate.mutateAsync({ crc_per_usd: v, valid_from: todayISO() });
      await update.mutateAsync({ display_name: name.trim() || null, base_currency: base, onboarded: true });
      // Si llegó por invitación, lo primero que ve es la cuenta compartida (spec §5.2).
      const shared = accounts.find((a) => a.role === "debtor");
      navigate(shared ? `/cuentas/${shared.id}` : "/", { replace: true });
    } catch (err) {
      toast.show(errorMessage(err), "danger");
    }
  }

  return (
    <div className="min-h-screen">
      <div className="hero px-6 pb-10 pt-14 text-white">
        <img src="/icon.svg" alt="" className="h-12 w-12 rounded-2xl" />
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight">Te damos la bienvenida</h1>
        <p className="mt-2 max-w-sm text-white/70">Tres datos y listo. Ya cargamos categorías como préstamo, condominio, luz y súper; puedes cambiarlas cuando quieras.</p>
      </div>
      <form onSubmit={submit} className="mx-auto -mt-5 max-w-md space-y-5 rounded-t-3xl bg-bg px-6 pb-10 pt-7">
        <label className="block">
          <span className="label">¿Cómo te llamas?</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </label>
        <div>
          <span className="label">¿En qué moneda quieres ver tus totales?</span>
          <Segmented label="Moneda principal" className="w-full" value={base} onChange={setBase} options={[{ value: "CRC", label: "Colones (₡)" }, { value: "USD", label: "Dólares ($)" }]} />
        </div>
        <label className="block">
          <span className="label">Tipo de cambio de hoy (colones por dólar)</span>
          <Input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} className="amount" />
          <span className="mt-1 block text-xs text-muted">Lo puedes actualizar en Ajustes. Cada movimiento guarda su moneda original.</span>
        </label>
        <Button type="submit" fullWidth size="lg" disabled={update.isPending}>Empezar</Button>
      </form>
    </div>
  );
}
