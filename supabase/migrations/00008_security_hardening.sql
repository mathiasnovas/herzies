-- Fix security advisor warnings:
-- 1. Revoke anon/authenticated EXECUTE on server-only functions
-- 2. Revoke anon EXECUTE on user-facing functions
-- 3. Set search_path on all functions to prevent search path hijacking

-- ============================================================
-- Server-only functions: revoke from both anon and authenticated
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.grant_cds(uuid, int, int) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_inventory_item(uuid, text, int) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_stale_trades() FROM anon, authenticated;

-- ============================================================
-- User-facing functions: revoke from anon only
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.add_friend(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.remove_friend(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.execute_trade(uuid) FROM anon;

-- ============================================================
-- Set search_path on all functions
-- ============================================================

CREATE OR REPLACE FUNCTION add_friend(my_friend_code text, their_friend_code text)
RETURNS void AS $$
BEGIN
  IF my_friend_code = their_friend_code THEN RETURN; END IF;
  UPDATE public.herzies
  SET friend_codes = array_append(friend_codes, my_friend_code)
  WHERE friend_code = their_friend_code
    AND NOT (my_friend_code = ANY(friend_codes));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION remove_friend(my_friend_code text, their_friend_code text)
RETURNS void AS $$
BEGIN
  UPDATE public.herzies
  SET friend_codes = array_remove(friend_codes, my_friend_code)
  WHERE friend_code = their_friend_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE FUNCTION expire_stale_trades()
RETURNS void AS $$
BEGIN
  UPDATE public.trades
  SET state = 'cancelled'
  WHERE state NOT IN ('completed', 'cancelled')
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

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
  SELECT * INTO t FROM public.trades WHERE id = trade_id FOR UPDATE;
  IF NOT FOUND OR t.state != 'both_locked' THEN RETURN false; END IF;
  IF NOT t.initiator_accepted OR NOT t.target_accepted THEN RETURN false; END IF;

  init_offer_items := COALESCE(t.initiator_offer->'items', '{}');
  targ_offer_items := COALESCE(t.target_offer->'items', '{}');
  init_offer_currency := COALESCE((t.initiator_offer->>'currency')::int, 0);
  targ_offer_currency := COALESCE((t.target_offer->>'currency')::int, 0);

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

  IF init_currency < init_offer_currency THEN RETURN false; END IF;
  IF targ_currency < targ_offer_currency THEN RETURN false; END IF;

  FOR item_key, item_qty IN SELECT * FROM jsonb_each_text(init_offer_items)
  LOOP
    IF COALESCE((init_inv->>item_key)::int, 0) < item_qty::int THEN RETURN false; END IF;
  END LOOP;

  FOR item_key, item_qty IN SELECT * FROM jsonb_each_text(targ_offer_items)
  LOOP
    IF COALESCE((targ_inv->>item_key)::int, 0) < item_qty::int THEN RETURN false; END IF;
  END LOOP;

  FOR item_key, item_qty IN SELECT * FROM jsonb_each_text(init_offer_items)
  LOOP
    init_inv := jsonb_set(init_inv, ARRAY[item_key], to_jsonb(COALESCE((init_inv->>item_key)::int, 0) - item_qty::int));
    targ_inv := jsonb_set(targ_inv, ARRAY[item_key], to_jsonb(COALESCE((targ_inv->>item_key)::int, 0) + item_qty::int));
  END LOOP;

  FOR item_key, item_qty IN SELECT * FROM jsonb_each_text(targ_offer_items)
  LOOP
    targ_inv := jsonb_set(targ_inv, ARRAY[item_key], to_jsonb(COALESCE((targ_inv->>item_key)::int, 0) - item_qty::int));
    init_inv := jsonb_set(init_inv, ARRAY[item_key], to_jsonb(COALESCE((init_inv->>item_key)::int, 0) + item_qty::int));
  END LOOP;

  init_inv := (SELECT COALESCE(jsonb_object_agg(k, v), '{}') FROM jsonb_each(init_inv) AS x(k, v) WHERE (v::text)::int > 0);
  targ_inv := (SELECT COALESCE(jsonb_object_agg(k, v), '{}') FROM jsonb_each(targ_inv) AS x(k, v) WHERE (v::text)::int > 0);

  init_currency := init_currency - init_offer_currency + targ_offer_currency;
  targ_currency := targ_currency - targ_offer_currency + init_offer_currency;

  UPDATE public.herzies SET inventory_v2 = init_inv, currency = init_currency WHERE user_id = t.initiator_id;
  UPDATE public.herzies SET inventory_v2 = targ_inv, currency = targ_currency WHERE user_id = t.target_id;

  UPDATE public.trades SET state = 'completed', updated_at = now() WHERE id = trade_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
