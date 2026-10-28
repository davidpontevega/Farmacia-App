import { api } from "@/lib/axios";
import type { CreateShortagesInput, ResolveShortageInput } from "../schemas";
import type { ShortageGroup, ShortageStatus } from "../types";

export const listShortages = async (status: ShortageStatus) =>
  (await api.get<ShortageGroup[]>("/shortages", { params: { status } })).data;

export const createShortages = async (input: CreateShortagesInput) =>
  (await api.post<{ created: number; skipped: number }>("/shortages", input)).data;

export const resolveShortage = async (input: ResolveShortageInput) => (await api.patch<{ affected: number }>("/shortages", input)).data;
