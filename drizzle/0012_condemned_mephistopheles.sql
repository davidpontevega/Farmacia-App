ALTER TYPE "public"."shortage_status" ADD VALUE 'RECEIVED';--> statement-breakpoint
ALTER TABLE "shortages" ADD COLUMN "purchase_id" uuid;--> statement-breakpoint
ALTER TABLE "shortages" ADD CONSTRAINT "shortages_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE no action ON UPDATE no action;