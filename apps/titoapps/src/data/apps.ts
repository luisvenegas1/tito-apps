import type { AppCategory, AppStatus, TitoApp } from "@/types/app";

export const categoryLabels: Record<AppCategory, string> = {
  finance: "Finanzas", health: "Salud", sports: "Deportes",
  productivity: "Productividad", utilities: "Utilidades",
};

export const statusLabels: Record<AppStatus, string> = {
  available: "Disponible", beta: "Beta", "coming-soon": "Próximamente",
};

export const apps: readonly TitoApp[] = [
  {
    id: "golpay", name: "GolPay", shortDescription: "Controla los pagos de tus mejengas de forma sencilla.",
    category: "sports", status: "available", icon: "https://golpay.tito-apps.com/icon-192.png",
    url: "https://golpay.tito-apps.com/", featured: true,
  },
  {
    id: "splitpay", name: "SplitPay", shortDescription: "Divide gastos fácilmente entre amigos, parejas o grupos.",
    category: "finance", status: "available", icon: "/apps/splitpay.svg",
    url: "https://splitpay.tito-apps.com/",
  },
  {
    id: "moneytrack", name: "MoneyTrack", shortDescription: "Organiza tus gastos, cuentas y finanzas personales.",
    category: "finance", status: "coming-soon", icon: "/apps/moneytrack.svg",
  },
  {
    id: "nutricoach", name: "NutriCoach", shortDescription: "Controla tu alimentación y recibe recomendaciones personalizadas.",
    category: "health", status: "available", icon: "https://nutricoach.tito-apps.com/icon-192.png",
    url: "https://nutricoach.tito-apps.com/", featured: true,
  },
  {
    id: "bingo", name: "Bingo", shortDescription: "Organiza partidas de bingo con múltiples patrones y narración de números.",
    category: "utilities", status: "available", icon: "https://bingo.tito-apps.com/favicon.svg",
    url: "https://bingo.tito-apps.com/", isNew: true,
  },
];
