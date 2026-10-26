// Reglas puras de devolución. Todo en centavos.

export type ReturnCondition = "GOOD" | "DAMAGED";

/** Línea de una venta con lo ya devuelto. */
export type ReturnLine = {
  saleItemId: string;
  productName: string;
  quantity: number;
  returned: number;
  unitPrice: number;
};

export type ReturnRequestItem = {
  saleItemId: string;
  quantity: number;
  condition: ReturnCondition;
};

export const availableOf = (line: Pick<ReturnLine, "quantity" | "returned">) =>
  line.quantity - line.returned;

export type ReturnValidation =
  | { ok: true; items: ReturnRequestItem[]; refunded: number }
  | { ok: false; kind: "not_in_sale" | "insufficient"; error: string };

/**
 * Valida una devolución contra las líneas de la venta (el tope es por línea,
 * contando devoluciones anteriores). Las entradas repetidas de la misma línea y
 * estado se suman; el reembolso usa el precio de la línea, nunca el del cliente.
 */
export function validateReturn(lines: ReturnLine[], requested: ReturnRequestItem[]): ReturnValidation {
  const byId = new Map(lines.map((l) => [l.saleItemId, l]));

  const merged = new Map<string, ReturnRequestItem>();
  for (const item of requested) {
    const key = `${item.saleItemId}:${item.condition}`;
    const prev = merged.get(key);
    merged.set(key, prev ? { ...prev, quantity: prev.quantity + item.quantity } : { ...item });
  }
  const items = [...merged.values()];

  const wantedByLine = new Map<string, number>();
  for (const item of items) {
    wantedByLine.set(item.saleItemId, (wantedByLine.get(item.saleItemId) ?? 0) + item.quantity);
  }

  for (const [saleItemId, wanted] of wantedByLine) {
    const line = byId.get(saleItemId);
    if (!line) {
      return { ok: false, kind: "not_in_sale", error: "Un producto no pertenece a esta venta" };
    }
    const available = availableOf(line);
    if (available <= 0) {
      return {
        ok: false,
        kind: "insufficient",
        error: `Ya se devolvió la totalidad de ${line.productName}`,
      };
    }
    if (wanted > available) {
      return {
        ok: false,
        kind: "insufficient",
        error: `Solo puedes devolver ${available} unidad(es) de ${line.productName} — ya se devolvieron ${line.returned}`,
      };
    }
  }

  const refunded = items.reduce((sum, i) => sum + i.quantity * byId.get(i.saleItemId)!.unitPrice, 0);
  return { ok: true, items, refunded };
}
