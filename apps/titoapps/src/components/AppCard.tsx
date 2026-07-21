import { Badge, Card } from "@titoapps/ui";
import { categoryLabels, statusLabels } from "@/data/apps";
import type { TitoApp } from "@/types/app";

const statusTone = { available: "success", beta: "warning", "coming-soon": "neutral" } as const;

function CardBody({ app }: { app: TitoApp }) {
  return <>
    <div className="flex items-start justify-between gap-3"><img src={app.icon} alt={`Icono de ${app.name}`} className="h-12 w-12 rounded-token object-cover" /><div className="flex flex-wrap justify-end gap-2"><Badge tone={statusTone[app.status]}>{statusLabels[app.status]}</Badge>{app.isNew && <Badge tone="primary">Nuevo</Badge>}</div></div>
    <div className="mt-5"><p className="text-xs font-semibold uppercase tracking-wider text-primary">{categoryLabels[app.category]}</p><h3 className="mt-1 text-xl font-bold text-fg">{app.name}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-muted">{app.shortDescription}</p></div>
    <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm font-semibold"><span className={app.url ? "text-primary" : "text-muted"}>{app.url ? "Abrir" : app.status === "coming-soon" ? "Próximamente" : "URL pendiente"}</span>{app.url && <span aria-hidden="true">↗</span>}</div>
  </>;
}

export function AppCard({ app }: { app: TitoApp }) {
  const className = "group h-full transition duration-base ease-standard motion-reduce:transition-none";
  if (app.url) return <a href={app.url} target="_blank" rel="noreferrer" aria-label={`Abrir ${app.name} (abre en una pestaña nueva)`} className="block h-full rounded-token focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"><Card className={`${className} hover:-translate-y-1 hover:shadow-token-lg active:translate-y-0`}><CardBody app={app} /></Card></a>;
  return <Card className={`${className} opacity-80`} aria-label={`${app.name}: ${app.status === "coming-soon" ? "Próximamente" : "URL pendiente"}`}><CardBody app={app} /></Card>;
}
