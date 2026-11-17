-- CreateEnum
CREATE TYPE "AuthorStatus" AS ENUM ('INACTIVE', 'ACTIVE');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('ACTIVE', 'DELETED');

-- CreateEnum
CREATE TYPE "PageTemplateStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "authors" (
    "id" TEXT NOT NULL,
    "site_id" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "avatar_media_id" TEXT,
    "bio" TEXT,
    "short_bio" TEXT,
    "designation" TEXT,
    "website" TEXT,
    "social_links" JSONB,
    "email" TEXT,
    "status" "AuthorStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "authors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "site_id" TEXT,
    "original_filename" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "alt" TEXT,
    "caption" TEXT,
    "metadata" JSONB,
    "status" "MediaStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_templates" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "PageTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "current_revision_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_template_revisions" (
    "id" TEXT NOT NULL,
    "page_template_id" TEXT NOT NULL,
    "revision_number" INTEGER NOT NULL,
    "config" JSONB NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "page_template_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "authors_site_id_status_idx" ON "authors"("site_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "authors_site_id_slug_key" ON "authors"("site_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_storage_key_key" ON "media_assets"("storage_key");

-- CreateIndex
CREATE INDEX "media_assets_site_id_status_idx" ON "media_assets"("site_id", "status");

-- CreateIndex
CREATE INDEX "media_assets_mime_type_idx" ON "media_assets"("mime_type");

-- CreateIndex
CREATE INDEX "page_templates_site_id_type_status_idx" ON "page_templates"("site_id", "type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "page_templates_site_id_name_key" ON "page_templates"("site_id", "name");

-- CreateIndex
CREATE INDEX "page_template_revisions_page_template_id_published_at_idx" ON "page_template_revisions"("page_template_id", "published_at");

-- CreateIndex
CREATE UNIQUE INDEX "page_template_revisions_page_template_id_revision_number_key" ON "page_template_revisions"("page_template_id", "revision_number");

-- AddForeignKey
ALTER TABLE "authors" ADD CONSTRAINT "authors_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_authors" ADD CONSTRAINT "content_authors_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_templates" ADD CONSTRAINT "page_templates_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_template_revisions" ADD CONSTRAINT "page_template_revisions_page_template_id_fkey" FOREIGN KEY ("page_template_id") REFERENCES "page_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
