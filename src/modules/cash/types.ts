// Forma JSON de GET /api/cash/shift. Montos en centavos.
// Los que el cajero registra a mano; CASH_REFUND lo crea una devolución.
export type ManualMovementType = "CASH_WITHDRAWAL" | "YAPE_TO_CASH_EXCHANGE";
export type MovementType = ManualMovementType | "CASH_REFUND";

export type ShiftSummary = {
  cashSales: number;
  yapeSales: number;
  salesCount: number;
  withdrawals: number;
  exchanges: number;
  refunds: number;
  expectedCash: number;
  expectedYape: number;
};

export type CashMovementRow = {
  id: string;
  type: MovementType;
  amount: number;
  reason: string;
  createdAt: string;
};

export type ActiveShiftResponse =
  | { shift: null }
  | {
      shift: { id: string; openingAmount: number; openedAt: string };
      summary: ShiftSummary;
      movements: CashMovementRow[];
    };

export type CloseShiftResult = {
  expectedCash: number;
  expectedYape: number;
  differenceCash: number;
  differenceYape: number;
  difference: number;
};

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  CASH_WITHDRAWAL: "Retiro efectivo",
  YAPE_TO_CASH_EXCHANGE: "Canje Yape→Ef.",
  CASH_REFUND: "Devolución",
};
