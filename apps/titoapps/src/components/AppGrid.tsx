import { EmptyState } from "@titoapps/ui";
import type { TitoApp } from "@/types/app";
import { AppCard } from "./AppCard";

export function AppGrid({ items }: { items: readonly TitoApp[] }) {
  if (!items.length) return <EmptyState title="No encontramos aplicaciones" description="Prueba con otra búsqueda o categoría." />;
  return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{items.map((app) => <AppCard key={app.id} app={app} />)}</div>;
}
