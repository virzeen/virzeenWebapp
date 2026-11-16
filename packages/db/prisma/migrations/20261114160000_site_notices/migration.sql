-- CreateTable
CREATE TABLE "SiteNotice" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "linkLabel" TEXT,
    "linkHref" TEXT,
    "audiences" "CustomerTier"[],
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteNotice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteNotice_isActive_sortOrder_idx" ON "SiteNotice"("isActive", "sortOrder");
