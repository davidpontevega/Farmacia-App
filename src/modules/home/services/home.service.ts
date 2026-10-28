import { api } from "@/lib/axios";
import type { NavCounters } from "@/lib/home";
import type { HomeSummary } from "../types";

export const getHomeSummary = async () => (await api.get<HomeSummary>("/home/summary")).data;

export const getNavCounters = async () => (await api.get<NavCounters>("/nav/counters")).data;
