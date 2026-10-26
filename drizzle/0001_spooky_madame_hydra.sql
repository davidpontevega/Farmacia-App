DROP VIEW "public"."product_stock";--> statement-breakpoint
CREATE INDEX "cash_movements_shift_idx" ON "cash_movements" USING btree ("shift_id");--> statement-breakpoint
CREATE INDEX "inventory_movements_product_idx" ON "inventory_movements" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "purchase_items_purchase_idx" ON "purchase_items" USING btree ("purchase_id");--> statement-breakpoint
CREATE INDEX "return_items_return_idx" ON "return_items" USING btree ("return_id");--> statement-breakpoint
CREATE INDEX "returns_sale_idx" ON "returns" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "sale_items_sale_idx" ON "sale_items" USING btree ("sale_id");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_price_nonneg" CHECK ("products"."sale_price" >= 0);--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_price_nonneg" CHECK ("purchase_items"."purchase_price" >= 0);--> statement-breakpoint
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_price_nonneg" CHECK ("return_items"."unit_price" >= 0);--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_price_nonneg" CHECK ("sale_items"."unit_price" >= 0);--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_subtotal_matches" CHECK ("sale_items"."subtotal" = "sale_items"."quantity" * "sale_items"."unit_price");--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_amounts_nonneg" CHECK ("sales"."discount" >= 0 AND "sales"."cash_amount" >= 0 AND "sales"."yape_amount" >= 0 AND "sales"."total" >= 0);--> statement-breakpoint
CREATE VIEW "public"."product_stock" AS (select "products"."id", coalesce(sum("stock"), 0)::int as "stock" from "products" left join "lot_stock" on "lot_stock"."product_id" = "products"."id" group by "products"."id");