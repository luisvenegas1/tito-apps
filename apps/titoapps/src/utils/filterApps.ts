import { categoryLabels } from "@/data/apps";
import type { AppCategory, TitoApp } from "@/types/app";

export function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function filterApps(items: readonly TitoApp[], query: string, category: AppCategory | "all") {
  const search = normalizeSearch(query);
  return items.filter((app) => {
    const matchesCategory = category === "all" || app.category === category;
    const searchable = normalizeSearch(`${app.name} ${app.shortDescription} ${categoryLabels[app.category]}`);
    return matchesCategory && (!search || searchable.includes(search));
  });
}

export function availableCategories(items: readonly TitoApp[]) {
  return (Object.keys(categoryLabels) as AppCategory[]).filter((category) =>
    items.some((app) => app.category === category),
  );
}
