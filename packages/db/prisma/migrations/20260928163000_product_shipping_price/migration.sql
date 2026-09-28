-- Per-product delivery charge, folded into variant prices (customers see free shipping).
ALTER TABLE "Product" ADD COLUMN "shippingPaisa" INTEGER NOT NULL DEFAULT 0;
