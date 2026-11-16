-- Categories and collections become one thing (specs/catalog-groups-visibility.md), step 2 of 2: DROP.
-- Runs after the app no longer reads Category, Product.categoryId or MemberInterest.categoryId.

-- The CHECK needed two optional targets; a pick now has one required collection.
ALTER TABLE "MemberInterest" DROP CONSTRAINT "MemberInterest_one_target";

-- DropForeignKey
ALTER TABLE "MemberInterest" DROP CONSTRAINT "MemberInterest_categoryId_fkey";

-- DropIndex
DROP INDEX "MemberInterest_userId_categoryId_key";

-- AlterTable
ALTER TABLE "MemberInterest" DROP COLUMN "categoryId";

ALTER TABLE "MemberInterest" ALTER COLUMN "collectionId" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_categoryId_fkey";

-- DropIndex
DROP INDEX "Product_categoryId_idx";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "categoryId";

-- DropTable
DROP TABLE "Category";
