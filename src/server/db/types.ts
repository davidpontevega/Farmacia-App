import type { db } from "./index";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Los repositorios aceptan `db` o una transacción abierta.
export type Executor = typeof db | Tx;
export type { Tx };
