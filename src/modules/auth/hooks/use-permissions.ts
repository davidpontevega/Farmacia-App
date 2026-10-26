"use client";

import { useQuery } from "@tanstack/react-query";
import type { PermissionCode } from "@/lib/permissions";
import { getMe } from "../services/auth.service";

export function usePermissions() {
  const { data, isLoading } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const permissions = data?.permissions ?? [];
  return {
    isLoading,
    userId: data?.id ?? null,
    can: (code: PermissionCode) => permissions.includes(code),
  };
}
