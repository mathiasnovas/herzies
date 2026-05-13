"use client";

import {
  ITEMS,
  ItemDisplay,
  RARITY_COLORS,
  RARITY_LABELS,
} from "@herzies/shared";
import { useEffect, useState } from "react";

const WINDOW_WIDTH = 380;
const WINDOW_HEIGHT = 380;
const TITLEBAR_HEIGHT = 28;
const CONTENT_PADDING = 12;
const ROTATION_MS = 5000;

const MOCK_CURRENCY = 142;
const MOCK_QTYS: Record<string, number> = {
  "first-edition": 1,
  cd: 7,
  headphones: 1,
};

export function DesktopInventoryPreview() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (ITEMS.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % ITEMS.length);
    }, ROTATION_MS);
    return () => clearInterval(id);
  }, []);

  const item = ITEMS[index];
  const qty = MOCK_QTYS[item.id] ?? 1;

  return (
    <div className="mx-auto overflow-hidden w-[380px] max-w-full">
      {/* Body — mirrors InventoryView's detail mode */}
      <div
        className="flex flex-col"
        style={{
          height: WINDOW_HEIGHT - TITLEBAR_HEIGHT,
          padding: CONTENT_PADDING,
        }}
      >
        {/* Spinning 3D item art */}
        <div className="flex justify-center items-center py-2 mb-2 min-h-[220px]">
          <ItemDisplay item={item} size={9} />
        </div>

        {/* Item info */}
        <div
          className="text-[14px] font-bold"
          style={{ color: RARITY_COLORS[item.rarity] }}
        >
          {item.name}
        </div>
        <div className="text-[11px] text-text-dim mb-1">
          {RARITY_LABELS[item.rarity]} · x{qty}
        </div>
        <div className="text-[12px] text-text-dim mb-3 leading-snug">
          {item.description}
        </div>
      </div>
    </div>
  );
}
