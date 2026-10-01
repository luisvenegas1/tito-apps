import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: true, retry: 1, staleTime: 30_000 } },
});

/** Query keys centralizadas. */
export const qk = {
  profile: ["profile"] as const,
  categories: ["categories"] as const,
  people: ["people"] as const,
  rates: ["rates"] as const,
  txRange: (from: string, to: string) => ["tx", from, to] as const,
  tx: ["tx"] as const,
  txOne: (id: string) => ["tx-one", id] as const,
  attachments: (txId: string) => ["attachments", txId] as const,
  accounts: ["accounts"] as const,
  account: (id: string) => ["account", id] as const,
  entries: (accountId: string) => ["entries", accountId] as const,
  allEntries: ["entries"] as const,
  linkedTx: (accountId: string) => ["linked-tx", accountId] as const,
  history: (entryId: string) => ["history", entryId] as const,
  invites: (accountId: string) => ["invites", accountId] as const,
  templates: ["templates"] as const,
  payments: ["payments"] as const,
  goals: ["goals"] as const,
  notifications: ["notifications"] as const,
} as const;
