// Colores explícitos: el color «primary» del tema es casi negro y los gráficos se verían apagados.
// Se eligieron para distinguirse entre sí y verse bien en tema claro y oscuro.
export const CHART_COLORS = {
  sales: "#10b981",
  refunds: "#f43f5e",
  cash: "#10b981",
  yape: "#8b5cf6",
} as const;

/** Paleta para series sin significado fijo (productos). */
export const PALETTE = ["#10b981", "#0ea5e9", "#8b5cf6", "#f59e0b", "#ec4899", "#14b8a6", "#6366f1", "#f97316", "#84cc16", "#06b6d4"];

export const TOOLTIP_STYLE = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--popover-foreground)",
} as const;
