ALTER TABLE "sites" ADD COLUMN "dark_logo_media_id" TEXT;

CREATE INDEX "sites_dark_logo_media_id_idx" ON "sites"("dark_logo_media_id");

ALTER TABLE "sites"
  ADD CONSTRAINT "sites_dark_logo_media_id_fkey"
  FOREIGN KEY ("dark_logo_media_id") REFERENCES "media_assets"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;