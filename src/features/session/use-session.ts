"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { fetchMe, signOut, type SessionProfile } from "@/features/auth/api";
import type { Role } from "@/entities/profile/model";

export const sessionKeys = { current: ["session"] };

export type SessionStatus = "loading" | "authenticated" | "anonymous";

export interface Session {
  status: SessionStatus;
  profile: SessionProfile | null;
  profileId: string | null;
  role: Role | null;
  mustChangePassword: boolean;
  logout: () => void;
}

export function useSession(): Session {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isPending, isError } = useQuery({
    queryKey: sessionKeys.current,
    queryFn: fetchMe,
    // A rejected /auth/me already means the refresh cookie failed too. Retrying
    // only delays the answer the user is waiting on.
    retry: false,
    staleTime: Infinity,
  });

  const logout = useMutation({
    mutationFn: signOut,
    onSettled: () => {
      queryClient.clear();
      router.replace("/login");
    },
  });

  const status: SessionStatus = isPending
    ? "loading"
    : isError || !data
      ? "anonymous"
      : "authenticated";

  return {
    status,
    profile: data ?? null,
    profileId: data?.id ?? null,
    role: data?.role ?? null,
    mustChangePassword: data?.mustChangePassword ?? false,
    logout: () => logout.mutate(),
  };
}
