import { useState, type FormEvent } from "react";
import { Button, Input, Select, useToast } from "@titoapps/ui";
import { getTheme, setTheme, type BrandTheme } from "@titoapps/brand";
import { formatDay, todayISO } from "@/lib/dates";
import { CURRENCIES, CURRENCY_NAME, CURRENCY_SYMBOL, formatMoney, parseAmount } from "@/lib/money";
import { errorMessage } from "@/lib/errors";
import { PageHeader } from "@/components/PageHeader";
import { Segmented } from "@/components/Segmented";
import { Loading } from "@/components/Empty";
import { syncBccrRates, useProfile, useRates, useSaveRate, useUpdateProfile } from "@/features/data/core";
import { useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query";
import type { Currency, ForeignCurrency } from "@/lib/supabase/types";
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
  const qc = useQueryClient();
  const [rateCur, setRateCur] = useState<ForeignCurrency>("USD");
  const [buy, setBuy] = useState("");
  const [sell, setSell] = useState("");
  const [rateDate, setRateDate] = useState(todayISO());
  const [syncing, setSyncing] = useState(false);
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
    const b = parseAmount(buy);
    const s = parseAmount(sell || buy);
    if (!b || !s) return toast.show("Escribe la compra y la venta", "danger");
    await run(() => saveRate.mutateAsync({ currency: rateCur, buy: b, sell: s, valid_from: rateDate }), "Tipo de cambio guardado");
    setBuy("");
    setSell("");
  }

  async function syncNow() {
    setSyncing(true);
    await run(async () => {
      await syncBccrRates();
      await qc.invalidateQueries({ queryKey: qk.rates });
    }, "Tipo de cambio actualizado con el BCCR");
    setSyncing(false);
  }

  const latest = (c: ForeignCurrency) => rates.find((r) => r.currency === c);

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
              options={CURRENCIES.map((c) => ({ value: c, label: `${CURRENCY_SYMBOL[c]} ${CURRENCY_NAME[c]}` }))}
            />
            <p className="mt-1 text-xs text-muted">Los totales se muestran en esta moneda y la puedes cambiar cuando quieras. Cada movimiento guarda su moneda original.</p>
          </div>
        </section>

        <section className="card">
          <h2 className="font-bold">Tipo de cambio</h2>
          <p className="mt-1 text-sm text-muted">
            Colones por cada dólar o euro. Los gastos se convierten con el de <b>venta</b> y los ingresos con el de <b>compra</b>, según la fecha de cada movimiento.
          </p>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="py-1 font-medium">Moneda</th>
                <th className="py-1 text-right font-medium">Compra</th>
                <th className="py-1 text-right font-medium">Venta</th>
                <th className="py-1 text-right font-medium">Desde</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {(["USD", "EUR"] as const).map((c) => {
                const r = latest(c);
                return (
                  <tr key={c} className="border-t border-border">
                    <td className="py-2 font-semibold">{CURRENCY_SYMBOL[c]} {CURRENCY_NAME[c]}</td>
                    <td className="py-2 text-right">{r ? formatMoney(r.buy, "CRC") : "—"}</td>
                    <td className="py-2 text-right">{r ? formatMoney(r.sell, "CRC") : "—"}</td>
                    <td className="py-2 text-right text-xs text-muted">
                      {r ? (r.source === "seed" ? "inicial" : `${formatDay(r.valid_from)} · ${r.source === "bccr" ? "BCCR" : "manual"}`) : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <label className="mt-4 flex items-center justify-between gap-3">
            <span>
              <span className="block font-medium">Actualizar solo con el BCCR</span>
              <span className="text-xs text-muted">Una vez al día, con el tipo de cambio de referencia del Banco Central.</span>
            </span>
            <input
              type="checkbox"
              className="h-5 w-5 accent-emerald-600"
              checked={profile.auto_rates}
              onChange={(e) => run(() => update.mutateAsync({ auto_rates: e.target.checked }), e.target.checked ? "Actualización automática activada" : "Actualización automática desactivada")}
            />
          </label>
          <Button variant="outline" size="sm" className="mt-3" onClick={syncNow} disabled={syncing}>
            {syncing ? "Consultando…" : "Actualizar ahora con el BCCR"}
          </Button>

          <form onSubmit={addRate} className="mt-5 space-y-2 border-t border-border pt-4">
            <p className="text-sm font-medium">Escribirlo a mano</p>
            <p className="text-xs text-muted">Útil si tu banco usa otro (por ejemplo, el de BAC). Lo que escribas a mano no lo reemplaza el BCCR.</p>
            <Segmented label="Moneda" value={rateCur} onChange={setRateCur} options={[{ value: "USD", label: "$ Dólar" }, { value: "EUR", label: "€ Euro" }]} />
            <div className="grid grid-cols-3 gap-2">
              <label>
                <span className="label">Compra</span>
                <Input inputMode="decimal" placeholder="452" value={buy} onChange={(e) => setBuy(e.target.value)} className="amount" />
              </label>
              <label>
                <span className="label">Venta</span>
                <Input inputMode="decimal" placeholder="466" value={sell} onChange={(e) => setSell(e.target.value)} className="amount" />
              </label>
              <label>
                <span className="label">Desde</span>
                <Input type="date" value={rateDate} onChange={(e) => setRateDate(e.target.value)} />
              </label>
            </div>
            <Button type="submit" size="sm">Guardar tipo de cambio</Button>
          </form>
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
