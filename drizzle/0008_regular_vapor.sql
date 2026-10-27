ALTER TABLE "products" ADD COLUMN "shelf" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "shelf_row" text;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_shelf_len" CHECK (char_length("products"."shelf") <= 20);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_shelf_row_len" CHECK (char_length("products"."shelf_row") <= 20);