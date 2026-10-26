"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import type { CatalogName } from "@/lib/match";
import { formatSoles } from "@/lib/money";
import { roundingDiff } from "@/lib/purchase-rules";
import { derive, rowIssues, type PurchaseRow } from "../rows";
import { PurchaseProductCell } from "./purchase-product-cell";

type Props = {
  row: PurchaseRow;
  index: number;
  today: string;
  catalog: CatalogName[];
  onChange: (key: string, patch: Partial<PurchaseRow>) => void;
  onRemove: (key: string) => void;
  onDuplicate: (key: string) => void;
  onEnterLast: (index: number) => void;
  /** Se enfocó esta fila (para resaltarla en el visor del documento). */
  onFocusRow?: (ocrRef: string | null) => void;
};

const cell = "px-1 py-1.5 align-top";

export function PurchaseRowView({ row, index, today, catalog, onChange, onRemove, onDuplicate, onEnterLast, onFocusRow }: Props) {
  const set = (patch: Partial<PurchaseRow>) => onChange(row.key, patch);
  const d = derive(row);
  const { errors, warnings } = rowIssues(row, today);
  const pendingWarnings = warnings.length > 0 && !row.confirmed;
  const rounding =
    d.documentLineCents !== null && d.stockUnits !== null && d.unitCostCents !== null
      ? roundingDiff(d.documentLineCents, d.stockUnits, d.unitCostCents)
      : 0;

  const doubt = (name: string) => (row.uncertain?.includes(name) ? " border-amber-500 ring-1 ring-amber-500" : "");
  const field = (name: keyof PurchaseRow, label: string, width: string, extra?: Partial<React.ComponentProps<typeof Input>>) => (
    <Input
      aria-label={`${label}, fila ${index + 1}`}
      data-col={name}
      className={width + doubt(name)}
      title={doubt(name) ? "Leído con dudas: verifica" : undefined}
      value={String(row[name])}
      onChange={(e) => set({ [name]: e.target.value } as Partial<PurchaseRow>)}
      {...extra}
    />
  );

  return (
    <TableRow data-row={index} onFocusCapture={() => onFocusRow?.(row.ocrRef ?? null)} className={errors.length ? "bg-destructive/5" : pendingWarnings ? "bg-amber-500/10" : undefined}>
      <TableCell className={cell}>{field("supplierCode", "Código del proveedor", "w-24")}</TableCell>
      <TableCell className={cell}>
        <PurchaseProductCell row={row} rowLabel={`fila ${index + 1}`} catalog={catalog} onChange={set} />
      </TableCell>
      <TableCell className={cell}>{field("qty", "Cantidad", "w-16", { inputMode: "numeric" })}</TableCell>
      <TableCell className={cell}>{field("um", "Unidad", "w-16")}</TableCell>
      <TableCell className={cell}>
        <Input
          aria-label={`Unidades por presentación, fila ${index + 1}`}
          data-col="unitsPerPackage"
          className="w-16"
          inputMode="numeric"
          value={row.unitsPerPackage}
          onChange={(e) => set({ unitsPerPackage: e.target.value, unitsEdited: true })}
        />
      </TableCell>
      <TableCell className={cell}>{field("packagePrice", "Precio de la presentación (S/)", "w-20", { inputMode: "decimal" })}</TableCell>
      <TableCell className={cell}>{field("lineTotal", "Total de la línea (S/)", "w-20", { inputMode: "decimal" })}</TableCell>
      <TableCell className={cell}>{field("expiry", "Vencimiento", "w-28", { placeholder: "dd/mm/aaaa" })}</TableCell>
      <TableCell className={cell}>{field("lot", "Lote", "w-24", { placeholder: "automático" })}</TableCell>
      <TableCell className={cell}>
        <Input
          aria-label={`Precio de venta, fila ${index + 1}`}
          data-col="salePrice"
          className="w-20"
          inputMode="decimal"
          placeholder={row.isNew ? "obligatorio" : "opcional"}
          value={row.salePrice}
          onChange={(e) => set({ salePrice: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onEnterLast(index);
            }
          }}
        />
      </TableCell>
      <TableCell className={`${cell} min-w-44 text-xs`}>
        {d.stockUnits !== null && d.unitCostCents !== null && (
          <p className="font-medium">
            Entran {d.stockUnits} u · {formatSoles(d.unitCostCents)} c/u
            {rounding !== 0 && (
              <span className="font-normal text-muted-foreground"> (redondeo {formatSoles(rounding)})</span>
            )}
          </p>
        )}
        {errors.map((m) => (
          <p key={m} className="text-destructive">
            {m}
          </p>
        ))}
        {warnings.map((m) => (
          <p key={m} className={row.confirmed ? "text-muted-foreground" : "text-amber-600"}>
            {m}
          </p>
        ))}
        {pendingWarnings && errors.length === 0 && (
          <Button type="button" size="xs" variant="outline" className="mt-1" onClick={() => set({ confirmed: true })}>
            Confirmar
          </Button>
        )}
      </TableCell>
      <TableCell className={`${cell} whitespace-nowrap`}>
        <Button type="button" size="xs" variant="ghost" aria-label={`Duplicar fila ${index + 1}`} onClick={() => onDuplicate(row.key)}>
          Duplicar
        </Button>
        <Button type="button" size="xs" variant="ghost" aria-label={`Quitar fila ${index + 1}`} onClick={() => onRemove(row.key)}>
          Quitar
        </Button>
      </TableCell>
    </TableRow>
  );
}
