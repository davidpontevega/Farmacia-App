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
  /** Hay un documento leído: se indica que algunos datos vienen de él. */
  fromDocument?: boolean;
};

export function PurchaseHeader({ header, onHeader, documentTotal, onDocumentTotal, suppliers, today, fromDocument }: Props) {
  return (
    <section className="rounded-2xl border bg-card p-5" aria-labelledby="doc-data">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 id="doc-data" className="text-base font-semibold">
          Datos del documento
        </h2>
        {fromDocument && (
          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">Rellenados desde la cotización</span>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground" htmlFor="supplier">Proveedor</Label>
        <Input
          className="h-11"
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
        <Label className="text-xs text-muted-foreground" htmlFor="document">Número de documento</Label>
        <Input
          className="h-11"
          id="document"
          placeholder="Ej: F002-00000914"
          value={header.documentNumber}
          onChange={(e) => onHeader({ documentNumber: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground" htmlFor="document-date">Fecha del documento</Label>
        <Input
          className="h-11"
          id="document-date"
          type="date"
          max={today}
          value={header.documentDate}
          onChange={(e) => onHeader({ documentDate: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground" htmlFor="other-charges">Otros gastos (S/), ej. envío</Label>
        <Input
          className="h-11"
          id="other-charges"
          inputMode="decimal"
          placeholder="0.00"
          value={header.otherCharges}
          onChange={(e) => onHeader({ otherCharges: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground" htmlFor="document-total">Total del documento (S/)</Label>
        <Input
          className="h-11"
          id="document-total"
          inputMode="decimal"
          placeholder="Para verificar la suma"
          value={documentTotal}
          onChange={(e) => onDocumentTotal(e.target.value)}
        />
      </div>
      </div>
    </section>
  );
}
