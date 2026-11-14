-- CreateEnum
CREATE TYPE "CustomerTier" AS ENUM ('GUEST', 'MEMBER');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryNotes" TEXT,
ADD COLUMN     "tier" "CustomerTier" NOT NULL DEFAULT 'MEMBER',
ALTER COLUMN "userId" DROP NOT NULL;
