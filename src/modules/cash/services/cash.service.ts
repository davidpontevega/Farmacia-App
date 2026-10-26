import { api } from "@/lib/axios";
import type { CloseShiftInput, MovementInput, OpenShiftInput } from "../schemas";
import type { ActiveShiftResponse, CloseShiftResult } from "../types";

export const getActiveShift = async () =>
  (await api.get<ActiveShiftResponse>("/cash/shift")).data;

export const openShift = async (input: OpenShiftInput) =>
  (await api.post<{ id: string }>("/cash/shift/open", input)).data;

export const closeShift = async (input: CloseShiftInput) =>
  (await api.post<CloseShiftResult>("/cash/shift/close", input)).data;

export const addMovement = async (input: MovementInput) =>
  (await api.post<{ id: string }>("/cash/movements", input)).data;
