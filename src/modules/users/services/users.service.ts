import { api } from "@/lib/axios";
import type { InviteUserInput, UpdateUserInput } from "../schemas";
import type { UsersResponse } from "../types";

export const listUsers = async () => (await api.get<UsersResponse>("/users")).data;

export const inviteUser = async (input: InviteUserInput) =>
  (await api.post<{ id: string }>("/users/invite", input)).data;

export const updateUser = async (id: string, input: UpdateUserInput) =>
  (await api.patch(`/users/${id}`, input)).data;

export const setUserActive = async (id: string, active: boolean) =>
  (await api.post(`/users/${id}/${active ? "reactivate" : "deactivate"}`)).data;
