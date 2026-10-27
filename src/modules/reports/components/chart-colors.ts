// Colores explícitos: el color «primary» del tema es casi negro y los gráficos se verían apagados.
// Se eligieron para distinguirse entre sí y verse bien en tema claro y oscuro.
export const CHART_COLORS = {
  sales: "#1b5fc1",
  refunds: "#b3261e",
  cash: "#1b5fc1",
  yape: "#19a974",
} as const;

/** Paleta para series sin significado fijo (productos). */
export const PALETTE = ["#1b5fc1", "#19a974", "#9dbbe8", "#c98a00", "#7c5cc4", "#0f7ba8", "#b3261e", "#14746f", "#6b7a99", "#e08a3c"];

export const TOOLTIP_STYLE = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--popover-foreground)",
} as const;
