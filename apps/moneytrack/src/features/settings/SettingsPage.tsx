import { useState, type FormEvent } from "react";
import { Button, Input, Select, useToast } from "@titoapps/ui";
import { getTheme, setTheme, type BrandTheme } from "@titoapps/brand";
import { formatDay, todayISO } from "@/lib/dates";
import { parseAmount } from "@/lib/money";
import { errorMessage } from "@/lib/errors";
import { PageHeader } from "@/components/PageHeader";
import { Segmented } from "@/components/Segmented";
import { Loading } from "@/components/Empty";
import { useProfile, useRates, useSaveRate, useUpdateProfile } from "@/features/data/core";
import type { Currency } from "@/lib/supabase/types";
import { disablePush, enablePush, pushSupported } from "./push";

export const THEME_KEY = "mt.theme";

/** S11: preferencias del usuario. */
export function SettingsPage() {
  const { data: profile, isLoading } = useProfile();
  const update = useUpdateProfile();
  const { data: rates = [] } = useRates();
  const saveRate = useSaveRate();
  const toast = useToast();
  const [name, setName] = useState<string | null>(null);
  const [rate, setRate] = useState("");
  const [rateDate, setRateDate] = useState(todayISO());
  const [theme, setThemeState] = useState<BrandTheme>(getTheme());
  const [pushBusy, setPushBusy] = useState(false);

  if (isLoading || !profile) return <Loading />;

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.show(ok, "success");
    } catch (e) {
      toast.show(errorMessage(e), "danger");
    }
  };

  async function addRate(e: FormEvent) {
    e.preventDefault();
    const v = parseAmount(rate);
    if (!v) return toast.show("Escribe el tipo de cambio", "danger");
    await run(() => saveRate.mutateAsync({ crc_per_usd: v, valid_from: rateDate }), "Tipo de cambio guardado");
    setRate("");
  }

  async function togglePush(on: boolean) {
    setPushBusy(true);
    await run(async () => {
      if (on) await enablePush();
      else await disablePush();
      await update.mutateAsync({ push_enabled: on });
    }, on ? "Notificaciones activadas" : "Notificaciones desactivadas");
    setPushBusy(false);
  }

  return (
    <div>
      <PageHeader title="Ajustes" back />
      <div className="space-y-3 px-4 pb-10 pt-4">
        <section className="card space-y-3">
          <h2 className="font-bold">Perfil</h2>
          <label className="block">
            <span className="label">Tu nombre</span>
            <div className="flex gap-2">
              <Input value={name ?? profile.display_name ?? ""} onChange={(e) => setName(e.target.value)} />
              <Button variant="outline" disabled={name === null} onClick={() => run(() => update.mutateAsync({ display_name: (name ?? "").trim() || null }), "Nombre guardado")}>
                Guardar
              </Button>
            </div>
          </label>
          <div>
            <span className="label">Moneda principal</span>
            <Segmented
              label="Moneda principal"
              value={profile.base_currency}
              onChange={(v: Currency) => run(() => update.mutateAsync({ base_currency: v }), "Moneda principal actualizada")}
              options={[{ value: "CRC", label: "Colones (₡)" }, { value: "USD", label: "Dólares ($)" }]}
            />
            <p className="mt-1 text-xs text-muted">Los totales se muestran en esta moneda. Cada movimiento guarda su moneda original.</p>
          </div>
        </section>

        <section className="card">
          <h2 className="font-bold">Tipo de cambio</h2>
          <p className="mt-1 text-sm text-muted">Colones por dólar. Cada movimiento usa el vigente en su fecha.</p>
          <form onSubmit={addRate} className="mt-3 flex gap-2">
            <Input inputMode="decimal" placeholder="505" value={rate} onChange={(e) => setRate(e.target.value)} aria-label="Colones por dólar" className="amount" />
            <Input type="date" value={rateDate} onChange={(e) => setRateDate(e.target.value)} aria-label="Vigente desde" />
            <Button type="submit">Agregar</Button>
          </form>
          <ul className="mt-3 divide-y divide-border text-sm">
            {rates.slice(0, 6).map((r) => (
              <li key={r.id} className="flex justify-between py-2">
                <span className="text-muted">Desde {formatDay(r.valid_from)}/{r.valid_from.slice(2, 4)}</span>
                <span className="font-semibold tabular-nums">₡{r.crc_per_usd.toLocaleString("es-CR")}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card space-y-3">
          <h2 className="font-bold">Recordatorios de pago</h2>
          <label className="block">
            <span className="label">Avisarme</span>
            <Select value={profile.reminder_days_before} onChange={(e) => run(() => update.mutateAsync({ reminder_days_before: Number(e.target.value) }), "Guardado")}>
              {[0, 1, 2, 3, 5, 7].map((d) => (
                <option key={d} value={d}>{d === 0 ? "El mismo día" : d === 1 ? "1 día antes" : `${d} días antes`}</option>
              ))}
            </Select>
          </label>
          {pushSupported() ? (
            <label className="flex items-center justify-between gap-3">
              <span>
                <span className="block font-medium">Notificaciones en este dispositivo</span>
                <span className="text-xs text-muted">Llegan aunque la app esté cerrada.</span>
              </span>
              <input type="checkbox" className="h-5 w-5 accent-emerald-600" checked={profile.push_enabled} disabled={pushBusy} onChange={(e) => togglePush(e.target.checked)} />
            </label>
          ) : (
            <p className="text-sm text-muted">Los avisos aparecen en la campana del inicio. Para recibirlos en el teléfono, instala la app en la pantalla de inicio.</p>
          )}
        </section>

        <section className="card">
          <h2 className="font-bold">Apariencia</h2>
          <Segmented
            label="Tema"
            className="mt-3 w-full"
            value={theme}
            onChange={(t) => {
              setTheme(t);
              setThemeState(t);
              try {
                localStorage.setItem(THEME_KEY, t);
              } catch {
                /* opcional */
              }
            }}
            options={[{ value: "light", label: "Claro" }, { value: "dark", label: "Oscuro" }]}
          />
        </section>
      </div>
    </div>
  );
}
