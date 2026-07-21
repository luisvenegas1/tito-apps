/**
 * Token de invitación guardado mientras el invitado inicia sesión.
 *
 * Vive en su propio módulo a propósito: si LoginPage importara esto desde
 * InvitePage, arrastraría toda la pantalla de invitación (y su cadena de
 * imports) dentro del login, con riesgo de import circular.
 */
const KEY = "golpay:invitacion";

export function rememberInvite(token: string): void {
  try {
    sessionStorage.setItem(KEY, token);
  } catch {
    /* modo privado: se pierde el token, el invitado reabre el enlace */
  }
}

export function takePendingInvite(): string | null {
  try {
    const t = sessionStorage.getItem(KEY);
    if (t) sessionStorage.removeItem(KEY);
    return t;
  } catch {
    return null;
  }
}
