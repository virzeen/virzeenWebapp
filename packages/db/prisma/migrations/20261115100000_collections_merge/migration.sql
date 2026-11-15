-- Categories and collections become one thing (specs/catalog-groups-visibility.md), step 1 of 2: ADD only.
-- Every Category is copied into Collection KEEPING ITS ID, so Product.categoryId and MemberInterest.categoryId map
-- across without a lookup. Nothing is dropped here; the next migration removes Category and the old columns.

-- CreateEnum
CREATE TYPE "Audience" AS ENUM ('PUBLIC', 'MEMBER', 'PASS');

-- AlterTable
ALTER TABLE "Collection" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "audience" "Audience" NOT NULL DEFAULT 'PUBLIC';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "audience" "Audience" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN "mainCollectionId" TEXT;

-- CreateIndex
CREATE INDEX "Collection_sortOrder_idx" ON "Collection"("sortOrder");

-- Copy the categories. A slug that a collection already uses gets "-2" (or, if that is taken too, the id).
INSERT INTO "Collection" ("id", "slug", "name", "description", "sortOrder", "isFeatured", "audience", "publicAt", "archivedAt", "createdAt", "updatedAt")
SELECT
  c."id",
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM "Collection" k WHERE k."slug" = c."slug") THEN c."slug"
    WHEN NOT EXISTS (SELECT 1 FROM "Collection" k WHERE k."slug" = c."slug" || '-2')
      AND NOT EXISTS (SELECT 1 FROM "Category" o WHERE o."slug" = c."slug" || '-2') THEN c."slug" || '-2'
    ELSE c."slug" || '-' || c."id"
  END,
  c."name", NULL, c."sortOrder", false, 'PUBLIC', NULL, c."archivedAt", c."createdAt", c."updatedAt"
FROM "Category" c;

-- Every product is in its former category's collection, and that is its main collection.
INSERT INTO "_CollectionToProduct" ("A", "B")
SELECT p."categoryId", p."id" FROM "Product" p
ON CONFLICT DO NOTHING;

UPDATE "Product" SET "mainCollectionId" = "categoryId";

ALTER TABLE "Product" ALTER COLUMN "mainCollectionId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Product_mainCollectionId_idx" ON "Product"("mainCollectionId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_mainCollectionId_fkey" FOREIGN KEY ("mainCollectionId") REFERENCES "Collection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A pick of a category becomes a pick of the collection with the same id (one target is set before and after, so the
-- CHECK from the earlier migration holds).
UPDATE "MemberInterest" SET "collectionId" = "categoryId", "categoryId" = NULL WHERE "categoryId" IS NOT NULL;
