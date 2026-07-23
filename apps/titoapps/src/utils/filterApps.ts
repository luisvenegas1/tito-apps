import { categoryLabels } from "@/data/apps";
import type { AppCategory, AppStatus, TitoApp } from "@/types/app";

const statusOrder: Record<AppStatus, number> = {
  available: 0,
  beta: 1,
  "coming-soon": 2,
};

export function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function filterApps(items: readonly TitoApp[], query: string, category: AppCategory | "all", status: AppStatus | "all" = "all") {
  const search = normalizeSearch(query);
  return items
    .filter((app) => {
      const matchesCategory = category === "all" || app.category === category;
      const matchesStatus = status === "all" || app.status === status;
      const searchable = normalizeSearch(`${app.name} ${app.shortDescription} ${categoryLabels[app.category]}`);
      return matchesCategory && matchesStatus && (!search || searchable.includes(search));
    })
    .sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
}

export function availableCategories(items: readonly TitoApp[]) {
  return (Object.keys(categoryLabels) as AppCategory[]).filter((category) =>
    items.some((app) => app.category === category),
  );
}

export function availableStatuses(items: readonly TitoApp[]) {
  return (["available", "beta", "coming-soon"] as AppStatus[]).filter((status) =>
    items.some((app) => app.status === status),
  );
}
