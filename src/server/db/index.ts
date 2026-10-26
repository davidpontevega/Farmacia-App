import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL no está definida");

// Pool (WebSocket) y no neon-http: ventas, caja y stock exigen db.transaction.
export const pool = new Pool({ connectionString: url });
export const db = drizzle(pool, { schema });
