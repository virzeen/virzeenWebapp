-- CreateIndex
CREATE UNIQUE INDEX "Payment_orderId_attempt_key" ON "Payment"("orderId", "attempt");
