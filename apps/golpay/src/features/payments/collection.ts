/** Mensajes de cobranza (puros). `money` formatea el monto (ej. crc). */

export interface Sinpe {
  number: string;
  name?: string | null;
}

/** Cobranza para UN jugador, con las fechas que debe y el total. */
export function playerDebtMessage(
  name: string,
  unpaid: { label: string; amount: number }[],
  total: number,
  money: (n: number) => string,
  sinpe?: Sinpe | null,
): string {
  const lines = unpaid.map((u) => `• ${u.label}: ${money(u.amount)}`).join("\n");
  let msg = `Hola ${name}, tenés pendiente:\n${lines}\n\nTotal: ${money(total)}`;
  if (sinpe?.number) msg += `\n\nSINPE: ${sinpe.number}${sinpe.name ? ` (${sinpe.name})` : ""}`;
  return msg;
}

/** Cobranza para TODOS los que deben. */
export function groupDebtMessage(
  debtors: { name: string; amount: number }[],
  money: (n: number) => string,
  sinpe?: Sinpe | null,
): string {
  const lines = debtors.map((d) => `• ${d.name}: ${money(d.amount)}`).join("\n");
  let msg = `Pendientes de pago:\n${lines}`;
  if (sinpe?.number) msg += `\n\nSINPE: ${sinpe.number}${sinpe.name ? ` (${sinpe.name})` : ""}`;
  return msg;
}
