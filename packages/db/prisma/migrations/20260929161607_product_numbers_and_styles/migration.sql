-- Product numbers and style numbers (specs/product-editor-on-page.md "Styles, colour shown, origin").
-- Additive: a new column on "Product", a new table, and data for the rows that already exist.

-- Product numbers: products that already exist get 1, 2, 3… in the order they were made. The column is filled
-- before it becomes NOT NULL and gets the same sequence default Prisma makes for @default(autoincrement()).
ALTER TABLE "Product" ADD COLUMN "number" INTEGER;

UPDATE "Product" AS p
SET "number" = numbered.position
FROM (SELECT "id", row_number() OVER (ORDER BY "createdAt", "id") AS position FROM "Product") AS numbered
WHERE p."id" = numbered."id";

CREATE SEQUENCE "Product_number_seq" AS INTEGER OWNED BY "Product"."number";
-- The next product gets the number after the highest one (1 on an empty database).
SELECT setval('"Product_number_seq"', COALESCE((SELECT max("number") FROM "Product"), 0) + 1, false);
ALTER TABLE "Product" ALTER COLUMN "number" SET DEFAULT nextval('"Product_number_seq"');
ALTER TABLE "Product" ALTER COLUMN "number" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Product_number_key" ON "Product"("number");

-- CreateTable
CREATE TABLE "ProductStyle" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "colourShown" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductStyle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductStyle_code_key" ON "ProductStyle"("code");

-- CreateIndex
CREATE INDEX "ProductStyle_productId_idx" ON "ProductStyle"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductStyle_productId_color_key" ON "ProductStyle"("productId", "color");

-- AddForeignKey
ALTER TABLE "ProductStyle" ADD CONSTRAINT "ProductStyle_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Style numbers for the products that already exist, like styleColors in @virzeen/core: the style '' first when the
-- shop shows the product without styles (no variant has a colour, or nothing for sale has one); then the colours for
-- sale in the shop's order (variant sortOrder, then id), so the first style customers see is -101; then the colours
-- whose variants are all switched off, so they keep a number too.
-- VZ + the product number (at least 4 digits) + -101, -102… (catalogService.saveProduct makes them the same way).
INSERT INTO "ProductStyle" ("id", "productId", "color", "code", "colourShown", "createdAt", "updatedAt")
SELECT
    'c' || replace(gen_random_uuid()::text, '-', ''), -- a cuid2-shaped id (lowercase letters and digits)
    styles."productId",
    styles."color",
    'VZ' || lpad(p."number"::text, greatest(4, length(p."number"::text)), '0') || '-'
        || (100 + row_number() OVER (PARTITION BY styles."productId" ORDER BY styles."rank"))::text,
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT product."id" AS "productId", '' AS "color", 0::bigint AS "rank"
    FROM "Product" AS product
    WHERE NOT EXISTS (
            SELECT 1 FROM "ProductVariant" AS v
            WHERE v."productId" = product."id" AND v."isActive" AND btrim(coalesce(v."color", '')) <> ''
        )
        AND (
            NOT EXISTS (
                SELECT 1 FROM "ProductVariant" AS v
                WHERE v."productId" = product."id" AND btrim(coalesce(v."color", '')) <> ''
            )
            OR EXISTS (SELECT 1 FROM "ProductVariant" AS v WHERE v."productId" = product."id" AND v."isActive")
        )
    UNION ALL
    -- Each colour ranks by its first variant row, rows for sale before switched-off ones.
    SELECT variant_rows."productId", variant_rows."color", min(variant_rows."rowOrder") AS "rank"
    FROM (
        SELECT
            "productId",
            btrim("color") AS "color",
            row_number() OVER (PARTITION BY "productId" ORDER BY "isActive" DESC, "sortOrder", "id") AS "rowOrder"
        FROM "ProductVariant"
        WHERE btrim(coalesce("color", '')) <> ''
    ) AS variant_rows
    GROUP BY variant_rows."productId", variant_rows."color"
) AS styles
JOIN "Product" AS p ON p."id" = styles."productId";

-- Every product's Country/Region of origin becomes China (owner, 2026-09-29: "make the all Country of Origin: China").
UPDATE "Product" SET "countryOfOrigin" = 'China' WHERE "countryOfOrigin" IS DISTINCT FROM 'China';
