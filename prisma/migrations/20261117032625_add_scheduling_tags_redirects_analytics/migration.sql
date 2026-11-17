-- CreateEnum
CREATE TYPE "RedirectStatus" AS ENUM ('INACTIVE', 'ACTIVE');

-- CreateEnum
CREATE TYPE "AnalyticsEventType" AS ENUM ('PAGE_VIEW', 'AFFILIATE_CLICK');

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_content_tags" (
    "id" TEXT NOT NULL,
    "site_content_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "site_content_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redirects" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "from_path" TEXT NOT NULL,
    "to_path" TEXT NOT NULL,
    "status_code" INTEGER NOT NULL DEFAULT 301,
    "status" "RedirectStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "redirects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "type" "AnalyticsEventType" NOT NULL,
    "path" TEXT,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "referrer" TEXT,
    "user_agent_hash" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tags_site_id_slug_key" ON "tags"("site_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "site_content_tags_site_content_id_tag_id_key" ON "site_content_tags"("site_content_id", "tag_id");

-- CreateIndex
CREATE INDEX "redirects_site_id_status_idx" ON "redirects"("site_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "redirects_site_id_from_path_key" ON "redirects"("site_id", "from_path");

-- CreateIndex
CREATE INDEX "analytics_events_site_id_type_occurred_at_idx" ON "analytics_events"("site_id", "type", "occurred_at");

-- CreateIndex
CREATE INDEX "analytics_events_site_id_entity_type_entity_id_idx" ON "analytics_events"("site_id", "entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_content_tags" ADD CONSTRAINT "site_content_tags_site_content_id_fkey" FOREIGN KEY ("site_content_id") REFERENCES "site_contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_content_tags" ADD CONSTRAINT "site_content_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redirects" ADD CONSTRAINT "redirects_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
