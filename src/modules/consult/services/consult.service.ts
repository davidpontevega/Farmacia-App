import { api } from "@/lib/axios";

export type MissRow = { id: string; query: string; count: number; lastAt: string };

/** Anota (anónimamente) una consulta sin resultado; el servidor decide si cumple las reglas para guardarla. */
export const reportMiss = async (query: string) => (await api.post<{ saved: boolean }>("/consult/misses", { query })).data;

export const listMisses = async () => (await api.get<MissRow[]>("/consult/misses")).data;

export const deleteMiss = async (id: string) => (await api.delete(`/consult/misses/${id}`)).data;
