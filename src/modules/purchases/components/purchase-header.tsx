"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Header } from "../rows";
import type { SupplierOption } from "../types";

type Props = {
  header: Header;
  onHeader: (patch: Partial<Header>) => void;
  documentTotal: string;
  onDocumentTotal: (v: string) => void;
  suppliers: SupplierOption[];
  today: string;
};

export function PurchaseHeader({ header, onHeader, documentTotal, onDocumentTotal, suppliers, today }: Props) {
  return (
    <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-5">
      <div className="flex flex-col gap-1">
        <Label htmlFor="supplier">Proveedor</Label>
        <Input
          id="supplier"
          list="supplier-options"
          autoComplete="off"
          placeholder="Nombre del proveedor"
          value={header.supplier}
          onChange={(e) => onHeader({ supplier: e.target.value })}
        />
        <datalist id="supplier-options">
          {suppliers.map((s) => (
            <option key={s.id} value={s.name} />
          ))}
        </datalist>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="document">Número de documento</Label>
        <Input
          id="document"
          placeholder="Ej: F002-00000914"
          value={header.documentNumber}
          onChange={(e) => onHeader({ documentNumber: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="document-date">Fecha del documento</Label>
        <Input
          id="document-date"
          type="date"
          max={today}
          value={header.documentDate}
          onChange={(e) => onHeader({ documentDate: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="other-charges">Otros gastos (S/), ej. envío</Label>
        <Input
          id="other-charges"
          inputMode="decimal"
          placeholder="0.00"
          value={header.otherCharges}
          onChange={(e) => onHeader({ otherCharges: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="document-total">Total del documento (S/)</Label>
        <Input
          id="document-total"
          inputMode="decimal"
          placeholder="Para verificar la suma"
          value={documentTotal}
          onChange={(e) => onDocumentTotal(e.target.value)}
        />
      </div>
    </div>
  );
}
