import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query";
import { useAuth } from "@/features/auth/AuthProvider";
import { todayISO } from "@/lib/date";
import type { NormalizedWorkout } from "@titoapps/health";
import {
  addWater,
  addWeight,
  addWorkout,
  listWeights,
  getLatestWeight,
  deleteWeight,
  listWorkouts,
  deleteWorkout,
  importExternalWorkouts,
  type NewWorkout,
} from "./api";

function useInvalidateDay(date: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: qk.dashboard(date) });
    qc.invalidateQueries({ queryKey: qk.weights });
  };
}

export function useAddWater(date = todayISO()) {
  const { session } = useAuth();
  const invalidate = useInvalidateDay(date);
  return useMutation({
    mutationFn: (ml: number) => addWater(session!.user.id, ml),
    onSuccess: invalidate,
  });
}

export function useAddWeight(date = todayISO()) {
  const { session } = useAuth();
  const invalidate = useInvalidateDay(date);
  return useMutation({
    mutationFn: (kg: number) => addWeight(session!.user.id, kg),
    onSuccess: invalidate,
  });
}

export function useAddWorkout(date = todayISO()) {
  const { session } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (w: NewWorkout) => addWorkout(session!.user.id, w),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.dashboard(date) });
      qc.invalidateQueries({ queryKey: ["workouts"] });
    },
  });
}

export function useDeleteWeight() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWeight(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.weights });
      qc.invalidateQueries({ queryKey: ["weights", "latest"] });
      if (userId) qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useWeights() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: qk.weights,
    queryFn: () => listWeights(userId!),
    enabled: !!userId,
  });
}

export function useLatestWeight() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ["weights", "latest"],
    queryFn: () => getLatestWeight(userId!),
    enabled: !!userId,
  });
}

export function useWorkouts(sinceDays = 14) {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ["workouts", "list", sinceDays],
    queryFn: () => listWorkouts(userId!, sinceDays),
    enabled: !!userId,
  });
}

function useInvalidateWorkouts() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["workouts"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };
}

export function useDeleteWorkout() {
  const invalidate = useInvalidateWorkouts();
  return useMutation({ mutationFn: (id: string) => deleteWorkout(id), onSuccess: invalidate });
}

export function useImportWorkouts() {
  const { session } = useAuth();
  const invalidate = useInvalidateWorkouts();
  return useMutation({
    mutationFn: (workouts: NormalizedWorkout[]) => importExternalWorkouts(session!.user.id, workouts),
    onSuccess: invalidate,
  });
}
