ALTER TYPE "public"."cash_movement_type" ADD VALUE 'CASH_REFUND';--> statement-breakpoint
ALTER TABLE "return_items" ADD COLUMN "sale_item_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_sale_item_id_sale_items_id_fk" FOREIGN KEY ("sale_item_id") REFERENCES "public"."sale_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "return_items_sale_item_idx" ON "return_items" USING btree ("sale_item_id");