"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorMessage } from "@/lib/axios";
import { useReturnLookup } from "../hooks/use-returns";
import { ReturnForm } from "./return-form";

export function ReturnsView() {
  const [input, setInput] = useState("");
  const [ticket, setTicket] = useState("");
  const { data, isFetching, error } = useReturnLookup(ticket);

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    setTicket(input.trim());
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Devoluciones</h1>

      <form onSubmit={search} className="flex max-w-md items-end gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <Label htmlFor="ticket">Número de ticket</Label>
          <Input
            id="ticket"
            autoFocus
            placeholder="Ej: B001-00000001 o solo los últimos dígitos"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={input.trim().length < 3 || isFetching}>
          {isFetching ? "Buscando…" : "Buscar"}
        </Button>
      </form>

      {ticket && isFetching && !data && <Skeleton className="h-32 w-full" />}
      {ticket && error && (
        <p className="text-sm text-destructive" role="alert">
          {apiErrorMessage(error)}
        </p>
      )}
      {ticket && data && !error && (
        <ReturnForm
          key={data.sale.id}
          data={data}
          onDone={() => {
            setInput("");
            setTicket("");
          }}
        />
      )}
    </div>
  );
}
