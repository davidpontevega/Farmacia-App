ALTER TABLE "cash_shifts" ADD COLUMN "closed_by" uuid;--> statement-breakpoint
ALTER TABLE "cash_shifts" ADD COLUMN "close_mode" text DEFAULT 'NORMAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "cash_shifts" ADD CONSTRAINT "cash_shifts_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cash_shifts_one_open" ON "cash_shifts" USING btree ((1)) WHERE "cash_shifts"."status" = 'OPEN';--> statement-breakpoint
ALTER TABLE "cash_shifts" ADD CONSTRAINT "cash_shifts_close_mode" CHECK ("cash_shifts"."close_mode" in ('NORMAL', 'FORCED_COUNTED', 'FORCED_NO_COUNT'));