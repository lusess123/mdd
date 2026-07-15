CREATE TABLE "mmd_demo_sessions" (
  "id" VARCHAR(64) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mmd_demo_sessions_pkey" PRIMARY KEY ("id")
);

INSERT INTO "mmd_demo_sessions" ("id", "created_at")
SELECT "session_id", MIN("created_at")
FROM "mmd_products"
GROUP BY "session_id"
ON CONFLICT ("id") DO NOTHING;
