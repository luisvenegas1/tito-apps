import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/AuthProvider";
import { listRecentItems } from "./foodsApi";
import { topFrequent, type FrequentEntry } from "./frequents";

/** Comidas frecuentes aprendidas de los registros recientes del usuario. */
export function useFrequents(n = 6) {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery<FrequentEntry[]>({
    queryKey: ["frequents", n],
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: async () => topFrequent(await listRecentItems(userId!), n),
  });
}
