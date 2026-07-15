CREATE TYPE "ProductStatus" AS ENUM ('draft', 'published', 'archived');

CREATE TABLE "mmd_products" (
  "id" VARCHAR(64) NOT NULL,
  "session_id" VARCHAR(64) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "sku" VARCHAR(80) NOT NULL,
  "cover" TEXT NOT NULL,
  "price" DECIMAL(12, 2) NOT NULL,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "status" "ProductStatus" NOT NULL DEFAULT 'draft',
  "inventory" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mmd_products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mmd_products_session_id_sku_key"
  ON "mmd_products"("session_id", "sku");

CREATE INDEX "mmd_products_session_id_created_at_idx"
  ON "mmd_products"("session_id", "created_at");
