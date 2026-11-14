-- Settings trimmed (owner 2026-11-14): Shop preferences left Settings, so the size and unit columns (added a few hours
-- earlier, never used anywhere else, not yet on the live site) go; Payment methods keeps the one method a member ticks.

-- AlterTable
ALTER TABLE "User" DROP COLUMN "measureUnit",
DROP COLUMN "preferredSize",
ADD COLUMN     "preferredPaymentMethod" "PaymentMethod";

-- DropEnum
DROP TYPE "MeasureUnit";
