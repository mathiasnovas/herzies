-- Currency & Trading System Migration
-- Adds currency, inventory v2 (JSONB), CD item, and trades table

-- 1. Add currency and CD tracking to herzies
ALTER TABLE public.herzies
  ADD COLUMN IF NOT EXISTS currency integer NOT NULL DEFAULT 0 CHECK (currency >= 0);

ALTER TABLE public.herzies
  ADD COLUMN IF NOT EXISTS cds_granted integer NOT NULL DEFAULT 0;

-- 2. Add JSONB inventory (v2) alongside existing text[] inventory
ALTER TABLE public.herzies
  ADD COLUMN IF NOT EXISTS inventory_v2 jsonb NOT NULL DEFAULT '{}';

-- Migrate existing inventory data from text[] to JSONB
UPDATE public.herzies
SET inventory_v2 = (
  SELECT COALESCE(jsonb_object_agg(item_id, 1), '{}')
  FROM unnest(inventory) AS item_id
)
WHERE array_length(inventory, 1) > 0;

-- 3. Add item catalog columns
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS sell_price integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stackable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS equipable boolean NOT NULL DEFAULT false;

-- Seed CD item
INSERT INTO public.items (id, name, description, rarity, sell_price, stackable)
VALUES ('cd', 'CD', 'A compact disc earned by listening.', 'common', 10, true)
ON CONFLICT (id) DO UPDATE SET sell_price = 10, stackable = true;

-- Update first-edition
UPDATE public.items SET stackable = false, equipable = false WHERE id = 'first-edition';

-- 4. Create trades table
CREATE TABLE IF NOT EXISTS public.trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiator_id uuid NOT NULL REFERENCES auth.users(id),
  target_id uuid NOT NULL REFERENCES auth.users(id),
  initiator_offer jsonb NOT NULL DEFAULT '{"items": {}, "currency": 0}',
  target_offer jsonb NOT NULL DEFAULT '{"items": {}, "currency": 0}',
  state text NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'active', 'initiator_locked', 'target_locked', 'both_locked', 'completed', 'cancelled')),
  initiator_accepted boolean NOT NULL DEFAULT false,
  target_accepted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes')
);

-- Indexes for active trade lookups
CREATE INDEX IF NOT EXISTS idx_trades_initiator_active
  ON public.trades(initiator_id)
  WHERE state NOT IN ('completed', 'cancelled');

CREATE INDEX IF NOT EXISTS idx_trades_target_active
  ON public.trades(target_id)
  WHERE state NOT IN ('completed', 'cancelled');

-- RLS on trades
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see own trades" ON public.trades;
CREATE POLICY "Users can see own trades"
  ON public.trades FOR SELECT
  USING (auth.uid() = initiator_id OR auth.uid() = target_id);

-- Auto-update updated_at on trades
DROP TRIGGER IF EXISTS trades_updated_at ON public.trades;
CREATE TRIGGER trades_updated_at
  BEFORE UPDATE ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 5. Expire stale trades
CREATE OR REPLACE FUNCTION expire_stale_trades()
RETURNS void AS $$
BEGIN
  UPDATE public.trades
  SET state = 'cancelled'
  WHERE state NOT IN ('completed', 'cancelled')
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Atomic trade execution
CREATE OR REPLACE FUNCTION execute_trade(trade_id uuid)
RETURNS boolean AS $$
DECLARE
  t public.trades;
  init_inv jsonb;
  targ_inv jsonb;
  init_currency integer;
  targ_currency integer;
  item_key text;
  item_qty integer;
  init_offer_items jsonb;
  targ_offer_items jsonb;
  init_offer_currency integer;
  targ_offer_currency integer;
BEGIN
  -- Lock the trade row
  SELECT * INTO t FROM public.trades WHERE id = trade_id FOR UPDATE;
  IF NOT FOUND OR t.state != 'both_locked' THEN RETURN false; END IF;
  IF NOT t.initiator_accepted OR NOT t.target_accepted THEN RETURN false; END IF;

  -- Parse offers
  init_offer_items := COALESCE(t.initiator_offer->'items', '{}');
  targ_offer_items := COALESCE(t.target_offer->'items', '{}');
  init_offer_currency := COALESCE((t.initiator_offer->>'currency')::int, 0);
  targ_offer_currency := COALESCE((t.target_offer->>'currency')::int, 0);

  -- Lock both herzie rows in consistent order to prevent deadlocks
  IF t.initiator_id < t.target_id THEN
    SELECT inventory_v2, currency INTO init_inv, init_currency
      FROM public.herzies WHERE user_id = t.initiator_id FOR UPDATE;
    SELECT inventory_v2, currency INTO targ_inv, targ_currency
      FROM public.herzies WHERE user_id = t.target_id FOR UPDATE;
  ELSE
    SELECT inventory_v2, currency INTO targ_inv, targ_currency
      FROM public.herzies WHERE user_id = t.target_id FOR UPDATE;
    SELECT inventory_v2, currency INTO init_inv, init_currency
      FROM public.herzies WHERE user_id = t.initiator_id FOR UPDATE;
  END IF;

  -- Validate initiator has sufficient currency
  IF init_currency < init_offer_currency THEN RETURN false; END IF;
  -- Validate target has sufficient currency
  IF targ_currency < targ_offer_currency THEN RETURN false; END IF;

  -- Validate initiator has offered items
  FOR item_key, item_qty IN SELECT * FROM jsonb_each_text(init_offer_items)
  LOOP
    IF COALESCE((init_inv->>item_key)::int, 0) < item_qty::int THEN RETURN false; END IF;
  END LOOP;

  -- Validate target has offered items
  FOR item_key, item_qty IN SELECT * FROM jsonb_each_text(targ_offer_items)
  LOOP
    IF COALESCE((targ_inv->>item_key)::int, 0) < item_qty::int THEN RETURN false; END IF;
  END LOOP;

  -- Transfer: remove initiator's offered items, add to target
  FOR item_key, item_qty IN SELECT * FROM jsonb_each_text(init_offer_items)
  LOOP
    init_inv := jsonb_set(init_inv, ARRAY[item_key], to_jsonb(COALESCE((init_inv->>item_key)::int, 0) - item_qty::int));
    targ_inv := jsonb_set(targ_inv, ARRAY[item_key], to_jsonb(COALESCE((targ_inv->>item_key)::int, 0) + item_qty::int));
  END LOOP;

  -- Transfer: remove target's offered items, add to initiator
  FOR item_key, item_qty IN SELECT * FROM jsonb_each_text(targ_offer_items)
  LOOP
    targ_inv := jsonb_set(targ_inv, ARRAY[item_key], to_jsonb(COALESCE((targ_inv->>item_key)::int, 0) - item_qty::int));
    init_inv := jsonb_set(init_inv, ARRAY[item_key], to_jsonb(COALESCE((init_inv->>item_key)::int, 0) + item_qty::int));
  END LOOP;

  -- Clean up zero-quantity entries
  init_inv := (SELECT COALESCE(jsonb_object_agg(k, v), '{}') FROM jsonb_each(init_inv) AS x(k, v) WHERE (v::text)::int > 0);
  targ_inv := (SELECT COALESCE(jsonb_object_agg(k, v), '{}') FROM jsonb_each(targ_inv) AS x(k, v) WHERE (v::text)::int > 0);

  -- Transfer currency
  init_currency := init_currency - init_offer_currency + targ_offer_currency;
  targ_currency := targ_currency - targ_offer_currency + init_offer_currency;

  -- Update both herzies
  UPDATE public.herzies SET inventory_v2 = init_inv, currency = init_currency WHERE user_id = t.initiator_id;
  UPDATE public.herzies SET inventory_v2 = targ_inv, currency = targ_currency WHERE user_id = t.target_id;

  -- Mark trade as completed
  UPDATE public.trades SET state = 'completed', updated_at = now() WHERE id = trade_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
