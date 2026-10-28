import { formatDate, formatDateTime, todayLima } from "./dates";

// Cuadre de caja. Todo en centavos.
//   efectivo esperado = apertura + ventas en efectivo - retiros - canjes - devoluciones
//   Yape esperado     = ventas Yape + canjes   (en un canje entra dinero por Yape)

export type ShiftTotals = {
  opening: number;
  cashSales: number;
  yapeSales: number;
  withdrawals: number;
  exchanges: number;
  /** Reembolsos de devoluciones, pagados en efectivo de la gaveta. */
  refunds: number;
};

export const expectedCash = (t: ShiftTotals) =>
  t.opening + t.cashSales - t.withdrawals - t.exchanges - t.refunds;

export const expectedYape = (t: ShiftTotals) => t.yapeSales + t.exchanges;

/** Positivo = sobra, negativo = falta. */
export function closeDifferences(
  totals: ShiftTotals,
  counted: { cash: number; yape: number },
) {
  const expCash = expectedCash(totals);
  const expYape = expectedYape(totals);
  const differenceCash = counted.cash - expCash;
  const differenceYape = counted.yape - expYape;
  return {
    expectedCash: expCash,
    expectedYape: expYape,
    differenceCash,
    differenceYape,
    difference: differenceCash + differenceYape,
  };
}

/** Un turno está vencido cuando se abrió un día anterior al de hoy (el día cambia a medianoche, hora de Lima). */
export const isShiftStale = (openedAt: Date, now = new Date()) => todayLima(openedAt) < todayLima(now);

export const staleShiftMessage = (openedAt: Date) =>
  `Tu turno es del ${formatDate(todayLima(openedAt))}. Ciérralo para continuar`;

export const cashHeldByMessage = (ownerName: string, openedAt: Date) =>
  `La caja está abierta por ${ownerName} desde ${formatDateTime(openedAt.toISOString())}; debe cerrarse antes de abrir otro turno`;

export type CloseMode = "NORMAL" | "FORCED_COUNTED" | "FORCED_NO_COUNT";

/**
 * Lo que se guarda al cerrar un turno. Con conteo: el cuadre de siempre. Sin conteo («sin cuadre», solo supervisor):
 * lo contado y la diferencia quedan nulos, nunca en cero, y solo se guarda lo que el sistema esperaba.
 */
export function closingValues(totals: ShiftTotals, counted: { cash: number; yape: number } | null) {
  const result = closeDifferences(totals, counted ?? { cash: 0, yape: 0 });
  return {
    values: {
      systemAmount: result.expectedCash + result.expectedYape,
      countedCash: counted ? counted.cash : null,
      countedYape: counted ? counted.yape : null,
      closingAmount: counted ? counted.cash + counted.yape : null,
      difference: counted ? result.difference : null,
    },
    expectedCash: result.expectedCash,
    expectedYape: result.expectedYape,
    /** Nulo cuando no hubo conteo. */
    differences: counted ? { differenceCash: result.differenceCash, differenceYape: result.differenceYape, difference: result.difference } : null,
  };
}
