ALTER TABLE "contents" ADD COLUMN "created_by_id" TEXT;

CREATE INDEX "contents_created_by_id_idx" ON "contents"("created_by_id");

ALTER TABLE "contents"
  ADD CONSTRAINT "contents_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "admin_users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
