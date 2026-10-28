"use client";

import { useQuery } from "@tanstack/react-query";
import { getHomeSummary, getNavCounters } from "../services/home.service";

const TWO_MINUTES = 2 * 60_000;

export const useHomeSummary = (enabled: boolean) =>
  useQuery({ queryKey: ["home-summary"], queryFn: getHomeSummary, enabled, refetchInterval: TWO_MINUTES });

/** Contadores del menú (Faltantes, Reportes): el servidor solo devuelve los que el usuario puede ver. */
export const useNavCounters = () => useQuery({ queryKey: ["nav-counters"], queryFn: getNavCounters, refetchInterval: TWO_MINUTES });
