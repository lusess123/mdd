ALTER TABLE "mmd_demo_sessions"
  ADD COLUMN "product_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "mmd_demo_sessions" AS session
SET
  "product_count" = product.total,
  "last_activity_at" = product.last_activity_at
FROM (
  SELECT
    "session_id",
    COUNT(*)::INTEGER AS total,
    MAX("updated_at") AS last_activity_at
  FROM "mmd_products"
  GROUP BY "session_id"
) AS product
WHERE session."id" = product."session_id";

CREATE OR REPLACE FUNCTION "mmd_reserve_product_slot"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO "mmd_demo_sessions" (
    "id",
    "product_count",
    "created_at",
    "last_activity_at"
  )
  VALUES (NEW."session_id", 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  ON CONFLICT ("id") DO NOTHING;

  UPDATE "mmd_demo_sessions"
  SET
    "product_count" = "product_count" + 1,
    "last_activity_at" = CURRENT_TIMESTAMP
  WHERE
    "id" = NEW."session_id"
    AND "product_count" < 50;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MMD_SESSION_RECORD_LIMIT' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "mmd_release_product_slot"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE "mmd_demo_sessions"
  SET
    "product_count" = GREATEST("product_count" - 1, 0),
    "last_activity_at" = CURRENT_TIMESTAMP
  WHERE "id" = OLD."session_id";

  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION "mmd_touch_product_session"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE "mmd_demo_sessions"
  SET "last_activity_at" = CURRENT_TIMESTAMP
  WHERE "id" = NEW."session_id";

  RETURN NEW;
END;
$$;

CREATE TRIGGER "mmd_products_reserve_slot"
AFTER INSERT ON "mmd_products"
FOR EACH ROW
EXECUTE FUNCTION "mmd_reserve_product_slot"();

CREATE TRIGGER "mmd_products_release_slot"
AFTER DELETE ON "mmd_products"
FOR EACH ROW
EXECUTE FUNCTION "mmd_release_product_slot"();

CREATE TRIGGER "mmd_products_touch_session"
AFTER UPDATE ON "mmd_products"
FOR EACH ROW
EXECUTE FUNCTION "mmd_touch_product_session"();
