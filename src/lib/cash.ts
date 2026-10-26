// Cuadre de caja. Todo en centavos.
//   efectivo esperado = apertura + ventas en efectivo - retiros - canjes
//   Yape esperado     = ventas Yape + canjes   (en un canje entra dinero por Yape)

export type ShiftTotals = {
  opening: number;
  cashSales: number;
  yapeSales: number;
  withdrawals: number;
  exchanges: number;
};

export const expectedCash = (t: ShiftTotals) =>
  t.opening + t.cashSales - t.withdrawals - t.exchanges;

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
