export type AppCategory = "finance" | "health" | "sports" | "productivity" | "utilities";
export type AppStatus = "available" | "beta" | "coming-soon";

export interface TitoApp {
  id: string;
  name: string;
  shortDescription: string;
  longDescription?: string;
  category: AppCategory;
  status: AppStatus;
  icon: string;
  url?: string;
  featured?: boolean;
  isNew?: boolean;
}
