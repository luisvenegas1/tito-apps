import { useMemo, useState } from "react";
import { AppGrid } from "@/components/AppGrid";
import { AppSearch } from "@/components/AppSearch";
import { CategoryFilter } from "@/components/CategoryFilter";
import { FeaturedApps } from "@/components/FeaturedApps";
import { StatusFilter } from "@/components/StatusFilter";
import { apps } from "@/data/apps";
import type { AppCategory, AppStatus } from "@/types/app";
import { availableCategories, availableStatuses, filterApps } from "@/utils/filterApps";

export function HomePage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<AppCategory | "all">("all");
  const [status, setStatus] = useState<AppStatus | "all">("all");
  const filtered = useMemo(() => filterApps(apps, query, category, status), [query, category, status]);
  const categories = useMemo(() => availableCategories(apps), []);
  const statuses = useMemo(() => availableStatuses(apps), []);
  return <>
    <section className="overflow-hidden border-b border-border bg-surface"><div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.2fr_.8fr] lg:px-8"><div><p className="mb-4 text-sm font-bold uppercase tracking-[.18em] text-primary">El ecosistema Tito Apps</p><h1 className="max-w-3xl text-4xl font-bold leading-tight text-fg sm:text-6xl">Apps que simplifican tu vida</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-muted">Herramientas sencillas para organizar, controlar y mejorar diferentes aspectos de tu vida.</p><a href="#applications" className="mt-8 inline-flex rounded-token bg-primary px-5 py-3 font-semibold text-primary-contrast transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Explora nuestras aplicaciones <span aria-hidden="true" className="ml-2">↓</span></a></div><div aria-hidden="true" className="relative mx-auto aspect-square w-full max-w-sm"><div className="absolute inset-4 rounded-full bg-primary/10" /><div className="absolute inset-16 rounded-token-xl bg-surface shadow-token-lg ring-1 ring-border"><img src="/icon.svg" alt="" className="h-full w-full p-12" /></div><div className="absolute left-0 top-10 h-16 w-16 rounded-token-xl bg-accent/15" /><div className="absolute bottom-8 right-0 h-20 w-20 rounded-full bg-accent-alt/15" /></div></div></section>
    <FeaturedApps items={apps} />
    <section id="applications" aria-labelledby="all-apps-title" className="bg-bg scroll-mt-20"><div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8"><div className="mb-7"><p className="text-sm font-semibold text-primary">Todo en un lugar</p><h2 id="all-apps-title" className="mt-1 text-3xl font-bold text-fg">Todas las aplicaciones</h2><p className="mt-2 text-muted">Encuentra la herramienta que necesitas hoy.</p></div><div className="mb-8 space-y-4"><AppSearch value={query} onChange={setQuery} /><CategoryFilter categories={categories} value={category} onChange={setCategory} /><StatusFilter statuses={statuses} value={status} onChange={setStatus} /><p className="text-sm text-muted" aria-live="polite">{filtered.length} {filtered.length === 1 ? "aplicación" : "aplicaciones"}</p></div><AppGrid items={filtered} /></div></section>
  </>;
}
