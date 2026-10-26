import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./errors";

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

// Mapea errores tipados a respuestas JSON; lo inesperado se registra y sale como 500.
export function handle<C>(fn: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: "Datos inválidos", fields: err.flatten().fieldErrors },
          { status: 400 },
        );
      }
      if (err instanceof SyntaxError) {
        return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
      }
      if (err instanceof AppError) {
        return NextResponse.json(
          { error: err.message, fields: err.fields },
          { status: err.status },
        );
      }
      console.error(err);
      return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
  };
}
