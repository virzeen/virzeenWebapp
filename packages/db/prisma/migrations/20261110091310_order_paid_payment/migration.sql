-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paidPaymentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_paidPaymentId_key" ON "Order"("paidPaymentId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_paidPaymentId_fkey" FOREIGN KEY ("paidPaymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

