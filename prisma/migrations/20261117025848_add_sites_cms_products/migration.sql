-- CreateEnum
CREATE TYPE "SiteStatus" AS ENUM ('INACTIVE', 'ACTIVE');

-- CreateEnum
CREATE TYPE "SiteSecretStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('ARTICLE', 'REVIEW', 'GUIDE', 'COMPARISON');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('INACTIVE', 'ACTIVE');

-- CreateTable
CREATE TABLE "sites" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "SiteStatus" NOT NULL DEFAULT 'INACTIVE',
    "logo_media_id" TEXT,
    "favicon_media_id" TEXT,
    "settings" JSONB,
    "seo_settings" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contents" (
    "id" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "body" JSONB,
    "featured_media_id" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_authors" (
    "id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "content_authors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_contents" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title_override" TEXT,
    "excerpt_override" TEXT,
    "seo_metadata" JSONB,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "scheduled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_content_categories" (
    "id" TEXT NOT NULL,
    "site_content_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,

    CONSTRAINT "site_content_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "model_number" TEXT,
    "description" TEXT,
    "specifications" JSONB,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_products" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT,
    "summary" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'INACTIVE',
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "seo_metadata" JSONB,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "site_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_domains" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_secrets" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "status" "SiteSecretStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "site_secrets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_site_access" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_site_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sites_slug_key" ON "sites"("slug");

-- CreateIndex
CREATE INDEX "sites_status_idx" ON "sites"("status");

-- CreateIndex
CREATE INDEX "contents_status_idx" ON "contents"("status");

-- CreateIndex
CREATE INDEX "content_authors_author_id_idx" ON "content_authors"("author_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_authors_content_id_author_id_key" ON "content_authors"("content_id", "author_id");

-- CreateIndex
CREATE INDEX "categories_site_id_parent_id_idx" ON "categories"("site_id", "parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_site_id_slug_key" ON "categories"("site_id", "slug");

-- CreateIndex
CREATE INDEX "site_contents_site_id_status_idx" ON "site_contents"("site_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "site_contents_site_id_slug_key" ON "site_contents"("site_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "site_contents_site_id_content_id_key" ON "site_contents"("site_id", "content_id");

-- CreateIndex
CREATE UNIQUE INDEX "site_content_categories_site_content_id_category_id_key" ON "site_content_categories"("site_content_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "brands_slug_key" ON "brands"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_brand_id_idx" ON "products"("brand_id");

-- CreateIndex
CREATE INDEX "site_products_site_id_status_idx" ON "site_products"("site_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "site_products_site_id_slug_key" ON "site_products"("site_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "site_products_site_id_product_id_key" ON "site_products"("site_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "site_domains_hostname_key" ON "site_domains"("hostname");

-- CreateIndex
CREATE INDEX "site_domains_site_id_idx" ON "site_domains"("site_id");

-- CreateIndex
CREATE INDEX "site_secrets_site_id_status_idx" ON "site_secrets"("site_id", "status");

-- CreateIndex
CREATE INDEX "user_site_access_site_id_idx" ON "user_site_access"("site_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_site_access_user_id_site_id_key" ON "user_site_access"("user_id", "site_id");

-- AddForeignKey
ALTER TABLE "content_authors" ADD CONSTRAINT "content_authors_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_contents" ADD CONSTRAINT "site_contents_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_contents" ADD CONSTRAINT "site_contents_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_content_categories" ADD CONSTRAINT "site_content_categories_site_content_id_fkey" FOREIGN KEY ("site_content_id") REFERENCES "site_contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_content_categories" ADD CONSTRAINT "site_content_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_products" ADD CONSTRAINT "site_products_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_products" ADD CONSTRAINT "site_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_domains" ADD CONSTRAINT "site_domains_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_secrets" ADD CONSTRAINT "site_secrets_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_site_access" ADD CONSTRAINT "user_site_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_site_access" ADD CONSTRAINT "user_site_access_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
