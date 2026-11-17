-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "attributes" JSONB,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "media_asset_id" TEXT NOT NULL,
    "alt" TEXT,
    "caption" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_score_criteria" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "weight" DECIMAL(8,3) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "review_score_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "site_product_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "verdict" TEXT,
    "body" JSONB,
    "overall_score" DECIMAL(8,3),
    "status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_criterion_scores" (
    "id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "criterion_id" TEXT NOT NULL,
    "score" DECIMAL(8,3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "review_criterion_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "product_variants_product_id_idx" ON "product_variants"("product_id");

-- CreateIndex
CREATE INDEX "product_images_product_id_position_idx" ON "product_images"("product_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "product_images_product_id_media_asset_id_key" ON "product_images"("product_id", "media_asset_id");

-- CreateIndex
CREATE INDEX "review_score_criteria_site_id_position_idx" ON "review_score_criteria"("site_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "review_score_criteria_site_id_name_key" ON "review_score_criteria"("site_id", "name");

-- CreateIndex
CREATE INDEX "reviews_site_product_id_status_idx" ON "reviews"("site_product_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "review_criterion_scores_review_id_criterion_id_key" ON "review_criterion_scores"("review_id", "criterion_id");

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_score_criteria" ADD CONSTRAINT "review_score_criteria_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_site_product_id_fkey" FOREIGN KEY ("site_product_id") REFERENCES "site_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_criterion_scores" ADD CONSTRAINT "review_criterion_scores_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_criterion_scores" ADD CONSTRAINT "review_criterion_scores_criterion_id_fkey" FOREIGN KEY ("criterion_id") REFERENCES "review_score_criteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;
