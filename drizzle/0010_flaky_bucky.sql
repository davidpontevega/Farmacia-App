CREATE TYPE "public"."shortage_source" AS ENUM('PRESCRIPTION', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."shortage_status" AS ENUM('OPEN', 'ORDERED', 'DISMISSED');--> statement-breakpoint
CREATE TABLE "shortages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"name_key" text NOT NULL,
	"quantity" integer NOT NULL,
	"source" "shortage_source" NOT NULL,
	"product_id" uuid,
	"status" "shortage_status" DEFAULT 'OPEN' NOT NULL,
	"user_id" uuid NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shortages_quantity_range" CHECK ("shortages"."quantity" between 1 and 9999),
	CONSTRAINT "shortages_name_length" CHECK (char_length("shortages"."name") between 1 and 120)
);
--> statement-breakpoint
ALTER TABLE "shortages" ADD CONSTRAINT "shortages_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shortages" ADD CONSTRAINT "shortages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shortages" ADD CONSTRAINT "shortages_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shortages_status_key_idx" ON "shortages" USING btree ("status","name_key");--> statement-breakpoint
CREATE INDEX "shortages_user_key_idx" ON "shortages" USING btree ("user_id","name_key","created_at" desc);