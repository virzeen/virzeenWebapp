-- CreateEnum
CREATE TYPE "FeatureLayout" AS ENUM ('THREE', 'TWO', 'FULL', 'TALL_LEFT', 'TALL_RIGHT', 'WIDE_TOP');

-- CreateEnum
CREATE TYPE "SizeGuideKind" AS ENUM ('CHART', 'PICTURE');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "featureLayout" "FeatureLayout" NOT NULL DEFAULT 'THREE';

-- AlterTable
ALTER TABLE "SizeGuide" ADD COLUMN     "kind" "SizeGuideKind" NOT NULL DEFAULT 'CHART',
ALTER COLUMN "chart" DROP NOT NULL;
