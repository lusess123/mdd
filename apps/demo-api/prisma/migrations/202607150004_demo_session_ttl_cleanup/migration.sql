CREATE OR REPLACE FUNCTION "mmd_cleanup_expired_demo_sessions"(
  p_cutoff TIMESTAMP(3),
  p_batch_limit INTEGER DEFAULT 1000
)
RETURNS TABLE (
  "sessions_deleted" INTEGER,
  "products_deleted" INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  candidate RECORD;
  deleted_for_session INTEGER;
BEGIN
  "sessions_deleted" := 0;
  "products_deleted" := 0;

  IF p_batch_limit IS NULL OR p_batch_limit < 1 THEN
    RAISE EXCEPTION 'p_batch_limit must be positive';
  END IF;

  -- 在线写入优先：清理等待行锁超过 250ms 时跳过该 Session，次日重试。
  PERFORM set_config('lock_timeout', '250ms', true);

  FOR candidate IN
    SELECT "id"
    FROM "mmd_demo_sessions"
    WHERE "last_activity_at" < p_cutoff
    ORDER BY "last_activity_at", "id"
    LIMIT p_batch_limit
  LOOP
    BEGIN
      -- 候选查询后再次核对过期时间，并防止多个 Cron 重复清理同一 Session。
      PERFORM 1
      FROM "mmd_demo_sessions"
      WHERE
        "id" = candidate."id"
        AND "last_activity_at" < p_cutoff
      FOR UPDATE NOWAIT;

      IF NOT FOUND THEN
        CONTINUE;
      END IF;

      -- 先删产品，让现有 AFTER DELETE 触发器逐条释放 product_count。
      DELETE FROM "mmd_products"
      WHERE "session_id" = candidate."id";
      GET DIAGNOSTICS deleted_for_session = ROW_COUNT;

      DELETE FROM "mmd_demo_sessions"
      WHERE "id" = candidate."id";

      IF FOUND THEN
        "sessions_deleted" := "sessions_deleted" + 1;
        "products_deleted" := "products_deleted" + deleted_for_session;
      END IF;
    EXCEPTION
      WHEN lock_not_available OR deadlock_detected THEN
        -- 子事务会回滚该 Session 已完成的删除和计数变化，其他 Session 继续。
        CONTINUE;
    END;
  END LOOP;

  RETURN NEXT;
END;
$$;
