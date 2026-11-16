-- Two levels, not three (owner, 2026-11-16): a MONO Member is a public shopper, so "MONO Members" items become Public.
-- Nothing else changes: a Pass item is shown to everyone (locked) and only the Pass can buy it.
UPDATE "Product" SET "audience" = 'PUBLIC' WHERE "audience" = 'MEMBER';
UPDATE "Collection" SET "audience" = 'PUBLIC' WHERE "audience" = 'MEMBER';

ALTER TYPE "Audience" RENAME TO "Audience_old";
CREATE TYPE "Audience" AS ENUM ('PUBLIC', 'PASS');

ALTER TABLE "Product" ALTER COLUMN "audience" DROP DEFAULT;
ALTER TABLE "Product" ALTER COLUMN "audience" TYPE "Audience" USING ("audience"::text::"Audience");
ALTER TABLE "Product" ALTER COLUMN "audience" SET DEFAULT 'PUBLIC';

ALTER TABLE "Collection" ALTER COLUMN "audience" DROP DEFAULT;
ALTER TABLE "Collection" ALTER COLUMN "audience" TYPE "Audience" USING ("audience"::text::"Audience");
ALTER TABLE "Collection" ALTER COLUMN "audience" SET DEFAULT 'PUBLIC';

DROP TYPE "Audience_old";
