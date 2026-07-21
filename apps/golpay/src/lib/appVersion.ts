/**
 * Versión de la app, inyectada por Vite desde package.json.
 *
 * El `typeof` no sobra: si el dev server quedó corriendo desde antes de que
 * `define` existiera en vite.config, el identificador no está y leerlo tira
 * ReferenceError en pleno render — o sea, pantalla en blanco. Preferimos no
 * mostrar la versión antes que tumbar la app.
 */
export const APP_VERSION: string | undefined =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : undefined;
