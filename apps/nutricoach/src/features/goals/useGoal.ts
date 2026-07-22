import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query";
import { useAuth } from "@/features/auth/AuthProvider";
import { getActiveGoal, saveGoal, type SaveGoalInput } from "./api";

export function useActiveGoal() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: qk.goal,
    queryFn: () => getActiveGoal(userId!),
    enabled: !!userId,
  });
}

export function useSaveGoal() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveGoalInput) => saveGoal(userId!, input),
    onSuccess: (goal) => {
      qc.setQueryData(qk.goal, goal);
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
