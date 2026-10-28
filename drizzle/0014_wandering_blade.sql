CREATE TABLE "symptom_misses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"query" text NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"first_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "symptom_misses_query_unique" UNIQUE("query"),
	CONSTRAINT "symptom_misses_query_length" CHECK (char_length("symptom_misses"."query") between 3 and 80)
);
--> statement-breakpoint
CREATE INDEX "symptom_misses_last_idx" ON "symptom_misses" USING btree ("last_at" desc);