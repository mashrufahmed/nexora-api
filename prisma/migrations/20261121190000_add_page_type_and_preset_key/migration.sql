CREATE TYPE "PageType" AS ENUM ('HOME', 'ARTICLE', 'NEWS', 'PAGE', 'CATEGORY', 'PRODUCT', 'REVIEW', 'BUYING_GUIDE', 'COMPARISON', 'AUTHOR');

ALTER TABLE "page_templates" ADD COLUMN "preset_key" TEXT;

UPDATE "page_templates"
SET "type" = CASE UPPER(TRIM("type"))
    WHEN 'HOME' THEN 'HOME'
    WHEN 'ARTICLE' THEN 'ARTICLE'
    WHEN 'NEWS' THEN 'NEWS'
    WHEN 'PAGE' THEN 'PAGE'
    WHEN 'CATEGORY' THEN 'CATEGORY'
    WHEN 'PRODUCT' THEN 'PRODUCT'
    WHEN 'REVIEW' THEN 'REVIEW'
    WHEN 'BUYING_GUIDE' THEN 'BUYING_GUIDE'
    WHEN 'COMPARISON' THEN 'COMPARISON'
    WHEN 'AUTHOR' THEN 'AUTHOR'
    ELSE 'PAGE'
  END;

ALTER TABLE "page_templates"
  ALTER COLUMN "type" DROP DEFAULT,
  ALTER COLUMN "type" TYPE "PageType" USING "type"::"PageType",
  ALTER COLUMN "type" SET DEFAULT 'PAGE';

WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "site_id", "type" ORDER BY "updated_at" DESC, "created_at" DESC, "id") AS row_number
  FROM "page_templates"
  WHERE "status" = 'PUBLISHED'
)
UPDATE "page_templates" AS template
SET "status" = 'ARCHIVED'
FROM ranked
WHERE template."id" = ranked."id" AND ranked.row_number > 1;

CREATE UNIQUE INDEX "page_templates_one_published_per_site_type_key"
  ON "page_templates"("site_id", "type")
  WHERE "status" = 'PUBLISHED';