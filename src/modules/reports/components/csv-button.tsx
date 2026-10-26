"use client";

import { Button } from "@/components/ui/button";
import { todayLima } from "@/lib/dates";
import { toCsv } from "@/lib/reports";

type Props = {
  /** Parte del nombre del archivo: `<nombre>-AAAA-MM-DD.csv`. */
  name: string;
  headers: string[];
  rows: (string | number | null)[][];
  /** Mientras se muestran datos de la consulta anterior, no se exporta. */
  disabled?: boolean;
};

export function CsvButton({ name, headers, rows, disabled }: Props) {
  const download = () => {
    const blob = new Blob([toCsv(headers, rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}-${todayLima()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  return (
    <Button type="button" size="sm" variant="outline" disabled={disabled || rows.length === 0} onClick={download}>
      Exportar CSV
    </Button>
  );
}
