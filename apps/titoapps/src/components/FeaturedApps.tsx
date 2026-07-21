import type { TitoApp } from "@/types/app";
import { AppGrid } from "./AppGrid";

export function FeaturedApps({ items }: { items: readonly TitoApp[] }) {
  const featured = items.filter((app) => app.featured);
  if (!featured.length) return null;
  return <section aria-labelledby="featured-title" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8"><div className="mb-7"><p className="text-sm font-semibold text-primary">Para empezar</p><h2 id="featured-title" className="mt-1 text-3xl font-bold text-fg">Aplicaciones destacadas</h2></div><AppGrid items={featured} /></section>;
}
