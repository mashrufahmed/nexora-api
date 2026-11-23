CREATE TYPE "PublicationStatus" AS ENUM ('SCHEDULED', 'PUBLISHED', 'ARCHIVED');

ALTER TYPE "ContentType" RENAME TO "ContentType_old";
CREATE TYPE "ContentType" AS ENUM ('ARTICLE', 'NEWS', 'PAGE');
ALTER TABLE "contents" ALTER COLUMN "type" TYPE "ContentType" USING CASE WHEN "type"::text IN ('ARTICLE','NEWS','PAGE') THEN "type"::text::"ContentType" ELSE 'ARTICLE'::"ContentType" END;
DROP TYPE "ContentType_old";

ALTER TYPE "ContentStatus" RENAME TO "ContentStatus_old";
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED');
ALTER TABLE "contents" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "contents" ALTER COLUMN "status" TYPE "ContentStatus" USING CASE WHEN "status"::text = 'IN_REVIEW' THEN 'IN_REVIEW'::"ContentStatus" WHEN "status"::text IN ('PUBLISHED','SCHEDULED') THEN 'APPROVED'::"ContentStatus" ELSE 'DRAFT'::"ContentStatus" END;
ALTER TABLE "contents" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
DROP TYPE "ContentStatus_old";

ALTER TABLE "contents" ADD COLUMN "description" TEXT;
ALTER TABLE "contents" ADD COLUMN "sections" JSONB;
ALTER TABLE "contents" ADD COLUMN "review_note" TEXT;
ALTER TABLE "contents" ADD COLUMN "deleted_at" TIMESTAMP(3);
UPDATE "contents" SET "description" = "excerpt", "sections" = "body";
ALTER TABLE "contents" DROP COLUMN "excerpt";
ALTER TABLE "contents" DROP COLUMN "body";
CREATE INDEX "contents_deleted_at_idx" ON "contents"("deleted_at");

CREATE TABLE "content_revisions" (
  "id" TEXT NOT NULL,
  "content_id" TEXT NOT NULL,
  "revision_number" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "sections" JSONB,
  "note" TEXT,
  "created_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "content_revisions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "content_revisions_content_id_revision_number_key" ON "content_revisions"("content_id", "revision_number");
CREATE INDEX "content_revisions_content_id_created_at_idx" ON "content_revisions"("content_id", "created_at");
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "site_contents" ADD COLUMN "is_featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "site_contents" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "site_contents" ALTER COLUMN "status" TYPE "PublicationStatus" USING CASE WHEN "status"::text = 'SCHEDULED' THEN 'SCHEDULED'::"PublicationStatus" WHEN "status"::text = 'ARCHIVED' THEN 'ARCHIVED'::"PublicationStatus" ELSE 'PUBLISHED'::"PublicationStatus" END;
ALTER TABLE "site_contents" ALTER COLUMN "status" SET DEFAULT 'PUBLISHED';