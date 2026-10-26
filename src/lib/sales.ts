// Reglas puras de venta. Todo en centavos.

export type FefoLot = { lotId: string; stock: number };
export type FefoAllocation = { lotId: string; quantity: number };

/**
 * Reparte `quantity` entre los lotes, que llegan ya ordenados por vencimiento (FEFO).
 * Devuelve null si el stock total no alcanza.
 */
export function allocateFefo(lots: FefoLot[], quantity: number): FefoAllocation[] | null {
  const allocation: FefoAllocation[] = [];
  let remaining = quantity;
  for (const lot of lots) {
    if (remaining === 0) break;
    if (lot.stock <= 0) continue;
    const take = Math.min(lot.stock, remaining);
    allocation.push({ lotId: lot.lotId, quantity: take });
    remaining -= take;
  }
  return remaining === 0 ? allocation : null;
}

export const formatTicket = (n: number) => `B001-${String(n).padStart(8, "0")}`;

export type PaymentMethod = "CASH" | "YAPE" | "MIXED";

export type PaymentResult =
  | { ok: true; cashAmount: number; yapeAmount: number; change: number }
  | { ok: false; error: string };

/**
 * Montos netos de la venta: lo que queda en caja y en Yape, sin el vuelto.
 *  - CASH:  efectivo recibido >= total; se registra el total.
 *  - YAPE:  se registra el total.
 *  - MIXED: Yape entre 0 y el total (exclusivos); el efectivo recibido cubre el resto.
 */
export function resolvePayment(p: {
  method: PaymentMethod;
  total: number;
  cashTendered?: number;
  yapeAmount?: number;
}): PaymentResult {
  if (p.total <= 0) return { ok: false, error: "El total debe ser mayor que 0" };

  if (p.method === "YAPE") {
    return { ok: true, cashAmount: 0, yapeAmount: p.total, change: 0 };
  }

  if (p.method === "CASH") {
    if (p.cashTendered === undefined || p.cashTendered < p.total) {
      return { ok: false, error: "El efectivo recibido no cubre el total" };
    }
    return { ok: true, cashAmount: p.total, yapeAmount: 0, change: p.cashTendered - p.total };
  }

  const yape = p.yapeAmount ?? 0;
  if (yape <= 0 || yape >= p.total) {
    return { ok: false, error: "En pago mixto el Yape debe ser mayor que 0 y menor que el total" };
  }
  const cashDue = p.total - yape;
  if (p.cashTendered === undefined || p.cashTendered < cashDue) {
    return { ok: false, error: "El efectivo recibido no cubre el resto del total" };
  }
  return { ok: true, cashAmount: cashDue, yapeAmount: yape, change: p.cashTendered - cashDue };
}

export const cartTotal = (items: { unitPrice: number; quantity: number }[]) =>
  items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
