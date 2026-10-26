import { api } from "@/lib/axios";

export type Me = { id: string; name: string; email: string; permissions: string[] };

export const getMe = async () => (await api.get<Me>("/me")).data;
