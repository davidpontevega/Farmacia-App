"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiErrorMessage } from "@/lib/axios";
import { formatDateTime, todayLima } from "@/lib/dates";
import { formatSoles } from "@/lib/money";
import { useReturns } from "../hooks/use-returns";
import { RETURNS_LIST_LIMIT } from "../types";

export function ReturnsTable() {
  const [from, setFrom] = useState(todayLima());
  const [to, setTo] = useState(todayLima());
  const range = from && to && from <= to ? { from, to } : null;
  const { data, isLoading, error } = useReturns(range);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Devoluciones</h1>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="ret-from">Desde</Label>
          <Input id="ret-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="ret-to">Hasta</Label>
          <Input id="ret-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        {!range && (
          <p className="text-sm text-destructive">«Desde» no puede ser posterior a «Hasta»</p>
        )}
      </div>

      {isLoading && <Skeleton className="h-48 w-full" />}
      {error && <p className="text-destructive">{apiErrorMessage(error)}</p>}
      {data && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Ticket</TableHead>
                <TableHead>Devuelto por</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Sin devoluciones en este rango
                  </TableCell>
                </TableRow>
              )}
              {data.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{formatDateTime(r.createdAt)}</TableCell>
                  <TableCell className="font-medium">{r.ticketNumber}</TableCell>
                  <TableCell>{r.userName}</TableCell>
                  <TableCell>{r.reason}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatSoles(r.refundedAmount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.length >= RETURNS_LIST_LIMIT && (
            <p className="text-sm text-muted-foreground">
              Se muestran las {RETURNS_LIST_LIMIT} devoluciones más recientes; acota el rango de fechas.
            </p>
          )}
        </>
      )}
    </div>
  );
}
