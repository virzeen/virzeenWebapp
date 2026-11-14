-- CreateEnum
CREATE TYPE "ShoppingPreference" AS ENUM ('HOME', 'CLOTHING', 'BOTH');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "birthday" DATE,
ADD COLUMN     "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shoppingPreference" "ShoppingPreference",
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3);
