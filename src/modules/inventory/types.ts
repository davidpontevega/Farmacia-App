export type LotRow = {
  lotId: string;
  lotNumber: string;
  expiryDate: string;
  purchasePrice: number;
  stock: number;
};

export type KardexRow = {
  id: string;
  createdAt: string;
  productName: string;
  lotNumber: string;
  type: "ENTRY" | "EXIT" | "RETURN" | "ADJUSTMENT";
  quantity: number;
  reason: string;
  userName: string;
};
