/**
 * Cálculo del cobro de un partido. Tres modos:
 *  - fijo:     un monto por jugador, igual para todos (la mejenga de siempre).
 *  - dividido: un monto total que se reparte entre los que juegan, redondeado
 *              HACIA ARRIBA a los ₡500 (torneo). Sobra un poco para la banca.
 *  - gratis:   no se cobra (la cancha del condominio).
 */

export type CostMode = "fijo" | "dividido" | "gratis";

/** Redondea hacia arriba al múltiplo de `step`. ceilTo(4818, 500) = 5000. */
export function ceilTo(n: number, step: number): number {
  if (step <= 0) return Math.ceil(n);
  return Math.ceil(n / step) * step;
}

/**
 * Monto por cabeza cuando se reparte un total entre `count` jugadores.
 * 55000 entre 11 = 5000. Sin jugadores todavía, 0.
 * Se redondea el reparto hacia arriba a los ₡500.
 */
export function perHeadDivided(total: number, count: number, step = 500): number {
  if (count <= 0 || total <= 0) return 0;
  return ceilTo(total / count, step);
}

/**
 * Cuánto le toca a cada jugador según el modo.
 * En "dividido" depende de cuántos juegan; en "fijo" es el monto tal cual.
 */
export function perHead(
  mode: CostMode,
  opts: { costPerPlayer: number; totalAmount: number; playerCount: number },
): number {
  switch (mode) {
    case "gratis":
      return 0;
    case "dividido":
      return perHeadDivided(opts.totalAmount, opts.playerCount);
    case "fijo":
    default:
      return opts.costPerPlayer;
  }
}
