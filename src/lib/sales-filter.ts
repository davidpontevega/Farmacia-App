// Filtro y resumen de Yape/Plin del historial de ventas (spec 026). Funciones puras sobre el listado ya cargado.
type SaleLike = { yapeAmount: number; hasProof: boolean; status: "COMPLETED" | "VOIDED" };

export type SalesFilter = "ALL" | "YAPE" | "NO_PROOF";

export function filterSales<T extends SaleLike>(sales: readonly T[], filter: SalesFilter): T[] {
  if (filter === "YAPE") return sales.filter((s) => s.yapeAmount > 0);
  if (filter === "NO_PROOF") return sales.filter((s) => s.yapeAmount > 0 && s.status === "COMPLETED" && !s.hasProof);
  return [...sales];
}

/** Solo ventas completadas con Yape/Plin; en una venta mixta cuenta únicamente su parte de Yape/Plin. */
export function yapeSummary(sales: readonly SaleLike[]) {
  const yape = sales.filter((s) => s.yapeAmount > 0 && s.status === "COMPLETED");
  const withProof = yape.filter((s) => s.hasProof).length;
  return { count: yape.length, total: yape.reduce((sum, s) => sum + s.yapeAmount, 0), withProof, withoutProof: yape.length - withProof };
}
