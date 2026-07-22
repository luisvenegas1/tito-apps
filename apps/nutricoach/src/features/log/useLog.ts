import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query";
import { useAuth } from "@/features/auth/AuthProvider";
import { todayISO } from "@/lib/date";
import { listLogItems, addLogItems, deleteLogItem, type NewLogItem } from "./api";

export function useDailyLog(date = todayISO()) {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: qk.log(date),
    queryFn: () => listLogItems(userId!, date),
    enabled: !!userId,
  });
}

export function useAddFood(date = todayISO()) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: NewLogItem[]) => addLogItems(userId!, date, items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.log(date) });
      qc.invalidateQueries({ queryKey: qk.dashboard(date) });
    },
  });
}

export function useDeleteFood(date = todayISO()) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteLogItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.log(date) });
      qc.invalidateQueries({ queryKey: qk.dashboard(date) });
    },
  });
}
