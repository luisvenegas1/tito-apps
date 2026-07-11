/** Formatea colones costarricenses: 2200 -> ₡2.200 */
export function crc(amount: number): string {
  return "₡" + Math.round(amount).toLocaleString("es-CR");
}

/** Genera un PIN numérico de 4 dígitos. */
export function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("es-CR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    return iso;
  }
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
