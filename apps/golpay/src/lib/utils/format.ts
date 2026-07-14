// Utilidades neutrales ahora viven en @titoapps/utils.
// Se re-exportan para no cambiar los imports existentes de GolPay.
export { generatePin, formatDate, formatTime } from "@titoapps/utils";

/** Formatea colones costarricenses: 2200 -> ₡2.200 (fijo de GolPay). */
export function crc(amount: number): string {
  return "₡" + Math.round(amount).toLocaleString("es-CR");
}

export const PAYMENT_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  reportado: "Reportado",
  confirmado: "Confirmado",
  parcial: "Pago parcial",
  exonerado: "Invitado",
  no_asistio: "No asistió",
};

/** Color de semáforo por estado. */
export function statusColor(status: string): string {
  switch (status) {
    case "confirmado":
      return "bg-green-500";
    case "reportado":
      return "bg-yellow-400";
    case "parcial":
      return "bg-orange-400";
    case "pendiente":
      return "bg-red-500";
    default:
      return "bg-gray-400"; // exonerado / no_asistio
  }
}
