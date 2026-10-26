CREATE TABLE "supplier_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"supplier_code" text NOT NULL,
	"product_id" uuid NOT NULL,
	"units_per_package" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "supplier_products_code_unique" UNIQUE("supplier_id","supplier_code"),
	CONSTRAINT "supplier_products_units_positive" CHECK ("supplier_products"."units_per_package" >= 1)
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"name_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "suppliers_name_key_unique" UNIQUE("name_key")
);
--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "supplier_id" uuid;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "document_date" date;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "other_charges" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_other_charges_nonneg" CHECK ("purchases"."other_charges" >= 0);