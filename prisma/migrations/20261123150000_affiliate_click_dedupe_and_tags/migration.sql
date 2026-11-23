ALTER TABLE "affiliate_links" ADD COLUMN "tag_id" TEXT;
ALTER TABLE "affiliate_clicks" ADD COLUMN "dedupe_key" TEXT;
UPDATE "affiliate_clicks" SET "dedupe_key" = md5("id") WHERE "dedupe_key" IS NULL;
ALTER TABLE "affiliate_clicks" ALTER COLUMN "dedupe_key" SET NOT NULL;
CREATE UNIQUE INDEX "affiliate_clicks_dedupe_key_key" ON "affiliate_clicks"("dedupe_key");
CREATE INDEX "affiliate_links_tag_id_idx" ON "affiliate_links"("tag_id");
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE SET NULL ON UPDATE CASCADE;