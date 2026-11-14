-- CreateEnum
CREATE TYPE "MeasureUnit" AS ENUM ('METRIC', 'IMPERIAL');

-- CreateEnum
CREATE TYPE "ReviewNameStyle" AS ENUM ('FIRST_NAME', 'FULL_NAME', 'ANONYMOUS');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "measureUnit" "MeasureUnit" NOT NULL DEFAULT 'METRIC',
ADD COLUMN     "preferredSize" TEXT,
ADD COLUMN     "reviewNameStyle" "ReviewNameStyle" NOT NULL DEFAULT 'FIRST_NAME';

-- CreateTable
CREATE TABLE "MemberInterest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT,
    "collectionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberInterest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberInterest_userId_createdAt_idx" ON "MemberInterest"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MemberInterest_userId_categoryId_key" ON "MemberInterest"("userId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberInterest_userId_collectionId_key" ON "MemberInterest"("userId", "collectionId");

-- AddForeignKey
ALTER TABLE "MemberInterest" ADD CONSTRAINT "MemberInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberInterest" ADD CONSTRAINT "MemberInterest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberInterest" ADD CONSTRAINT "MemberInterest_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Exactly one of the two targets is set (the service also checks it).
ALTER TABLE "MemberInterest" ADD CONSTRAINT "MemberInterest_one_target" CHECK (num_nonnulls("categoryId", "collectionId") = 1);
