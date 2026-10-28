import { check, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { id } from "./_shared";

/** Consultas por síntoma que no encontraron nada (spec 021). Sin usuario ni datos personales: solo frases cortas normalizadas. */
export const symptomMisses = pgTable(
  "symptom_misses",
  {
    id: id(),
    query: text("query").notNull().unique(),
    count: integer("count").notNull().default(1),
    firstAt: timestamp("first_at", { withTimezone: true }).notNull().defaultNow(),
    lastAt: timestamp("last_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("symptom_misses_query_length", sql`char_length(${t.query}) between 3 and 80`),
    index("symptom_misses_last_idx").on(sql`${t.lastAt} desc`),
  ],
);
