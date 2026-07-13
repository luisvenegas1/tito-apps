/**
 * Genera un PIN numérico del largo indicado (por defecto 4 dígitos).
 * Siempre devuelve solo dígitos, sin ceros a la izquierda que reduzcan el largo.
 *
 *  generatePin()  -> "4821"
 *  generatePin(6) -> "573920"
 */
export function generatePin(length = 4): string {
  const min = 10 ** (length - 1);
  const max = 10 ** length;
  return String(Math.floor(min + Math.random() * (max - min)));
}
