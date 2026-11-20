CREATE TABLE "product_categories" (
    "id" TEXT NOT NULL,
    "site_product_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "product_categories_site_product_id_category_id_key" ON "product_categories"("site_product_id", "category_id");
CREATE INDEX "product_categories_category_id_idx" ON "product_categories"("category_id");
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_site_product_id_fkey" FOREIGN KEY ("site_product_id") REFERENCES "site_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;