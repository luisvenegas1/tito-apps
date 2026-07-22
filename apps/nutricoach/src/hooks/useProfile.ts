import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query";
import { useAuth } from "@/features/auth/AuthProvider";
import { getOrCreateProfile, updateProfile, type ProfilePatch } from "@/features/profile/api";

export function useProfile() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: qk.profile,
    queryFn: () => getOrCreateProfile(userId!),
    enabled: !!userId,
  });
}

export function useUpdateProfile() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: ProfilePatch) => updateProfile(userId!, patch),
    onSuccess: (data) => qc.setQueryData(qk.profile, data),
  });
}
