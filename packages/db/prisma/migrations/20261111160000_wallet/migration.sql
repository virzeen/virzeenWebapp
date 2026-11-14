-- CreateEnum
CREATE TYPE "WalletKind" AS ENUM ('POINTS', 'CREDIT');

-- CreateEnum
CREATE TYPE "WalletEntryType" AS ENUM ('EARN', 'SPEND', 'EXPIRE', 'REFUND', 'ADJUST');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "creditUsedPaisa" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pointsUsed" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "WalletEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "WalletKind" NOT NULL,
    "type" "WalletEntryType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "remaining" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "orderId" TEXT,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WalletEntry_userId_kind_createdAt_idx" ON "WalletEntry"("userId", "kind", "createdAt");

-- CreateIndex
CREATE INDEX "WalletEntry_kind_expiresAt_idx" ON "WalletEntry"("kind", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "WalletEntry_orderId_type_kind_key" ON "WalletEntry"("orderId", "type", "kind");

-- AddForeignKey
ALTER TABLE "WalletEntry" ADD CONSTRAINT "WalletEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

