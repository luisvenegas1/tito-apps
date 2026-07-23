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
    category: "sports", status: "available", icon: "/apps/golpay.svg",
    url: "https://golpay-nu.vercel.app/", featured: true,
  },
  {
    id: "splitpay", name: "SplitPay", shortDescription: "Divide gastos fácilmente entre amigos, parejas o grupos.",
    category: "finance", status: "available", icon: "/apps/splitpay.svg",
    url: "https://splitpay-blond.vercel.app/",
  },
  {
    id: "moneytrack", name: "MoneyTrack", shortDescription: "Organiza tus gastos, cuentas y finanzas personales.",
    category: "finance", status: "coming-soon", icon: "/apps/moneytrack.svg",
  },
  {
    id: "nutricoach", name: "NutriCoach", shortDescription: "Controla tu alimentación y recibe recomendaciones personalizadas.",
    category: "health", status: "available", icon: "/apps/nutricoach.svg",
    url: "https://nutricoach.tito-apps.com/", featured: true,
  },
];
