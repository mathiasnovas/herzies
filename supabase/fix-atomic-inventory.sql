-- Fix: Atomic inventory operations to prevent race conditions with trades
-- The old read-modify-write pattern in processSync could overwrite inventory
-- changes made by concurrent trade executions.

-- Atomically grant CDs without reading/overwriting the full inventory
CREATE OR REPLACE FUNCTION grant_cds(p_user_id uuid, p_quantity int, p_cds_granted int)
RETURNS void AS $$
BEGIN
  UPDATE public.herzies
  SET inventory_v2 = jsonb_set(
        inventory_v2,
        '{cd}',
        to_jsonb(COALESCE((inventory_v2->>'cd')::int, 0) + p_quantity)
      ),
      cds_granted = p_cds_granted
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomically grant a single inventory item (for secret track rewards, etc.)
CREATE OR REPLACE FUNCTION grant_inventory_item(p_user_id uuid, p_item_id text, p_quantity int DEFAULT 1)
RETURNS void AS $$
BEGIN
  UPDATE public.herzies
  SET inventory_v2 = jsonb_set(
        inventory_v2,
        ARRAY[p_item_id],
        to_jsonb(COALESCE((inventory_v2->>p_item_id)::int, 0) + p_quantity)
      )
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
