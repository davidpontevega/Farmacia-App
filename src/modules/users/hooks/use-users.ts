"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/axios";
import type { UpdateUserInput } from "../schemas";
import { inviteUser, listUsers, setUserActive, updateUser } from "../services/users.service";

const KEY = ["users"];

export const useUsers = () => useQuery({ queryKey: KEY, queryFn: listUsers });

function useUsersMutation<V>(fn: (v: V) => Promise<unknown>, success: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      toast.success(success);
      return qc.invalidateQueries({ queryKey: KEY });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

export const useInviteUser = () => useUsersMutation(inviteUser, "Invitación enviada");

export const useUpdateUser = () =>
  useUsersMutation(
    ({ id, ...input }: { id: string } & UpdateUserInput) => updateUser(id, input),
    "Usuario actualizado",
  );

export const useSetUserActive = () =>
  useUsersMutation(
    ({ id, active }: { id: string; active: boolean }) => setUserActive(id, active),
    "Estado actualizado",
  );
