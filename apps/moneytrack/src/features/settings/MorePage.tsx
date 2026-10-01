import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/features/auth/AuthProvider";
import { useProfile } from "@/features/data/core";

const SECTIONS = [
  {
    title: "Planificar",
    items: [
      { to: "/pagos", label: "Próximos pagos", hint: "Qué vence y qué está atrasado" },
      { to: "/recurrentes", label: "Pagos fijos", hint: "Préstamo, condominio, seguros…" },
      { to: "/metas", label: "Metas", hint: "Ahorro y topes por categoría" },
    ],
  },
  {
    title: "Analizar",
    items: [
      { to: "/reportes", label: "Reportes", hint: "Por año, categoría y cuentas compartidas" },
      { to: "/avisos", label: "Avisos", hint: "Recordatorios de pago" },
    ],
  },
  {
    title: "Configurar",
    items: [
      { to: "/ajustes", label: "Ajustes", hint: "Moneda, tipo de cambio, notificaciones, tema" },
      { to: "/categorias", label: "Categorías", hint: "Crear, renombrar, archivar" },
      { to: "/personas", label: "Personas", hint: "Pareja y otras personas sin cuenta" },
      { to: "/datos", label: "Exportar e importar", hint: "CSV de respaldo o desde tu Excel" },
    ],
  },
];

export function MorePage() {
  const { data: profile } = useProfile();
  const { session, signOut } = useAuth();
  return (
    <div>
      <PageHeader title="Más" />
      <div className="px-4 pb-8">
        <div className="mt-4 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-navy text-lg font-bold text-mint" aria-hidden>
            {(profile?.display_name ?? "?").slice(0, 1).toUpperCase()}
          </span>
          <span>
            <span className="block font-bold">{profile?.display_name}</span>
            <span className="text-sm text-muted">{session?.user.email}</span>
          </span>
        </div>
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="section-title">{s.title}</h2>
            <ul className="card divide-y divide-border p-0">
              {s.items.map((i) => (
                <li key={i.to}>
                  <Link to={i.to} className="row hover:bg-surface-subtle">
                    <span className="flex-1">
                      <span className="block font-semibold">{i.label}</span>
                      <span className="text-sm text-muted">{i.hint}</span>
                    </span>
                    <span className="text-muted" aria-hidden>›</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <button type="button" onClick={signOut} className="mt-6 w-full rounded-2xl border border-border py-3 font-semibold text-deficit">
          Cerrar sesión
        </button>
        <p className="mt-4 text-center text-xs text-muted">Money Track {__APP_VERSION__} · Tito Apps</p>
      </div>
    </div>
  );
}
