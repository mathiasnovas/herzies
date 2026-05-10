-- Add headphones item (equipable)
INSERT INTO public.items (id, name, description, rarity, sell_price, stackable, equipable)
VALUES ('headphones', 'Headphones', 'Wearable headphones for your herzie.', 'uncommon', null, false, true);

-- Add equipped column to herzies (jsonb array of item IDs currently worn)
ALTER TABLE public.herzies
ADD COLUMN equipped jsonb NOT NULL DEFAULT '[]'::jsonb;
