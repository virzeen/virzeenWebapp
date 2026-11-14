-- AlterTable
ALTER TABLE "Collection" ADD COLUMN     "publicAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "dispatchPromisedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Referral" ADD COLUMN     "rewardEntryId" TEXT,
ADD COLUMN     "reversedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Order_status_dispatchPromisedAt_idx" ON "Order"("status", "dispatchPromisedAt");
