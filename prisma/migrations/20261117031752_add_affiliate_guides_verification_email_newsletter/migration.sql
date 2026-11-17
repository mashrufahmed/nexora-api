-- CreateEnum
CREATE TYPE "AffiliateStatus" AS ENUM ('INACTIVE', 'ACTIVE');

-- CreateEnum
CREATE TYPE "GuideStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "NewsletterStatus" AS ENUM ('PENDING', 'ACTIVE', 'UNSUBSCRIBED');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "merchants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "website" TEXT,
    "status" "AffiliateStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_links" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "site_product_id" TEXT,
    "merchant_id" TEXT NOT NULL,
    "destination_url" TEXT NOT NULL,
    "tracking_url" TEXT,
    "status" "AffiliateStatus" NOT NULL DEFAULT 'INACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_clicks" (
    "id" TEXT NOT NULL,
    "affiliate_link_id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "clicked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referrer" TEXT,
    "user_agent_hash" TEXT,

    CONSTRAINT "affiliate_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buying_guides" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "body" JSONB,
    "status" "GuideStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buying_guides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buying_guide_items" (
    "id" TEXT NOT NULL,
    "buying_guide_id" TEXT NOT NULL,
    "site_product_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,

    CONSTRAINT "buying_guide_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comparisons" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "GuideStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comparisons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comparison_items" (
    "id" TEXT NOT NULL,
    "comparison_id" TEXT NOT NULL,
    "site_product_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,

    CONSTRAINT "comparison_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "verified_at" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newsletter_subscribers" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "normalized_email" TEXT NOT NULL,
    "status" "NewsletterStatus" NOT NULL DEFAULT 'PENDING',
    "source" TEXT,
    "subscribed_at" TIMESTAMP(3),
    "unsubscribed_at" TIMESTAMP(3),
    "verified_at" TIMESTAMP(3),
    "unsubscribe_token_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_senders" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email_address" TEXT NOT NULL,
    "reply_to" TEXT,
    "provider_config" JSONB,
    "status" "AffiliateStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "email_senders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html_body" TEXT NOT NULL,
    "text_body" TEXT,
    "variables" JSONB,
    "status" "AffiliateStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_messages" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "sender_id" TEXT,
    "template_id" TEXT,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html_body" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'QUEUED',
    "error" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "merchants_slug_key" ON "merchants"("slug");

-- CreateIndex
CREATE INDEX "affiliate_links_site_id_status_idx" ON "affiliate_links"("site_id", "status");

-- CreateIndex
CREATE INDEX "affiliate_clicks_affiliate_link_id_clicked_at_idx" ON "affiliate_clicks"("affiliate_link_id", "clicked_at");

-- CreateIndex
CREATE UNIQUE INDEX "buying_guides_site_id_slug_key" ON "buying_guides"("site_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "buying_guide_items_buying_guide_id_site_product_id_key" ON "buying_guide_items"("buying_guide_id", "site_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "comparisons_site_id_slug_key" ON "comparisons"("site_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "comparison_items_comparison_id_site_product_id_key" ON "comparison_items"("comparison_id", "site_product_id");

-- CreateIndex
CREATE INDEX "verifications_entity_type_entity_id_status_idx" ON "verifications"("entity_type", "entity_id", "status");

-- CreateIndex
CREATE INDEX "verifications_identifier_method_status_idx" ON "verifications"("identifier", "method", "status");

-- CreateIndex
CREATE INDEX "newsletter_subscribers_site_id_status_idx" ON "newsletter_subscribers"("site_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscribers_site_id_normalized_email_key" ON "newsletter_subscribers"("site_id", "normalized_email");

-- CreateIndex
CREATE UNIQUE INDEX "email_senders_site_id_email_address_key" ON "email_senders"("site_id", "email_address");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_site_id_slug_key" ON "email_templates"("site_id", "slug");

-- CreateIndex
CREATE INDEX "email_messages_site_id_created_at_idx" ON "email_messages"("site_id", "created_at");

-- AddForeignKey
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_site_product_id_fkey" FOREIGN KEY ("site_product_id") REFERENCES "site_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_affiliate_link_id_fkey" FOREIGN KEY ("affiliate_link_id") REFERENCES "affiliate_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buying_guides" ADD CONSTRAINT "buying_guides_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buying_guide_items" ADD CONSTRAINT "buying_guide_items_buying_guide_id_fkey" FOREIGN KEY ("buying_guide_id") REFERENCES "buying_guides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buying_guide_items" ADD CONSTRAINT "buying_guide_items_site_product_id_fkey" FOREIGN KEY ("site_product_id") REFERENCES "site_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparisons" ADD CONSTRAINT "comparisons_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparison_items" ADD CONSTRAINT "comparison_items_comparison_id_fkey" FOREIGN KEY ("comparison_id") REFERENCES "comparisons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparison_items" ADD CONSTRAINT "comparison_items_site_product_id_fkey" FOREIGN KEY ("site_product_id") REFERENCES "site_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_senders" ADD CONSTRAINT "email_senders_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "email_senders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "email_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
