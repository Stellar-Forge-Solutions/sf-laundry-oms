-- ==============================================================================
-- Migration: 0020_enforce_tenant_boundaries.sql
-- Description: Fixes multi-tenancy isolation gaps flagged by Aikido:
--   1. Revoke public/authenticated access to snapshot_shop_metrics RPC
--   2. Revoke public/authenticated access to sync_billing_sales RPC
--   3. Prevent rebinding order_items and order_events across orders/shops
-- ==============================================================================

-- 1. Protect snapshot_shop_metrics from cross-tenant RPC execution
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'snapshot_shop_metrics'
  ) THEN
    REVOKE EXECUTE ON FUNCTION snapshot_shop_metrics(uuid, text, text) FROM public, anon, authenticated;
  END IF;
END $$;

-- 2. Protect sync_billing_sales from direct public RPC calls
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'sync_billing_sales'
  ) THEN
    REVOKE EXECUTE ON FUNCTION sync_billing_sales(uuid, date) FROM public, anon, authenticated;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'trg_bills_sync_sales'
  ) THEN
    REVOKE EXECUTE ON FUNCTION trg_bills_sync_sales() FROM public, anon, authenticated;
  END IF;
END $$;

-- 3. Prevent tenant child-row rebinding on order_items
DROP POLICY IF EXISTS order_items_u ON order_items;
CREATE POLICY order_items_u ON order_items FOR UPDATE
  USING (shop_id = current_shop_id() AND shop_can_write(shop_id, 'orders'))
  WITH CHECK (
    shop_id = current_shop_id()
    AND EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.shop_id = current_shop_id())
  );

-- 4. Prevent tenant child-row rebinding on order_events
DROP POLICY IF EXISTS order_events_u ON order_events;
CREATE POLICY order_events_u ON order_events FOR UPDATE
  USING (shop_id = current_shop_id() AND shop_can_write(shop_id, 'orders'))
  WITH CHECK (
    shop_id = current_shop_id()
    AND EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.shop_id = current_shop_id())
  );
