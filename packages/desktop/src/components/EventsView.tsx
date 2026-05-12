import type { GameEvent } from "@herzies/shared";
import { useEffect, useState } from "react";
import { getItem, RARITY_COLORS as ITEM_RARITY_COLORS } from "../items";
import { herzies } from "../tauri-bridge";
import { ItemDisplay } from "./ItemDisplay";

function formatCountdown(endsAt: string): string {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return "ended";
  const hours = Math.floor(ms / 3_600_000);
  const days = Math.floor(hours / 24);
  const h = hours % 24;
  if (days > 0) return `${days}d ${h}h left`;
  if (hours > 0) return `${hours}h left`;
  return "< 1h left";
}

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function EventsView() {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    herzies
      .fetchActiveEvents()
      .then((data) => {
        setEvents(data.events);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    const interval = setInterval(() => {
      herzies.fetchActiveEvents().then((data) => setEvents(data.events));
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          fontSize: 12,
          color: "#555",
        }}
      >
        Loading...
      </div>
    );
  }

  const hunt = events.find((e) => e.type === "song_hunt");

  console.log("> events", events);

  if (!hunt) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          fontSize: 12,
          color: "#555",
          textAlign: "center",
        }}
      >
        No active Song Hunt. Check back Monday!!!
      </div>
    );
  }

  const config = hunt.config as {
    rewardItemId: string;
    maxClaims: number;
    hints: Array<{
      text: string;
      unlocksAt: string;
      unlocked: boolean;
    }>;
    firstFinders: Array<{
      name: string;
      claimedAt: string;
    }>;
  };

  const rewardItem = getItem(config.rewardItemId);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "auto",
      }}
    >
      {/* Title + countdown */}
      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: "bold",
            color: "#7dd3fc",
          }}
        >
          {hunt.title}
        </div>
        <div style={{ fontSize: 10, color: "#666" }}>
          {formatCountdown(hunt.endsAt)}
        </div>
      </div>

      {/* Reward preview */}
      {/* {rewardItem && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
            padding: "6px 0",
            borderBottom: "1px solid #222",
          }}
        >
          <ItemDisplay item={rewardItem} size={7} />
          <div
            style={{
              fontSize: 11,
              color: ITEM_RARITY_COLORS[rewardItem.rarity],
            }}
          >
            {rewardItem.name}
          </div>
        </div>
      )} */}

      {/* Hints */}
      <div style={{ marginBottom: 10 }}>
        <div
          style={{
            fontSize: 10,
            color: "#666",
            marginBottom: 4,
          }}
        >
          Hints
        </div>
        {config.hints.map((hint, i) => (
          <div
            key={i}
            style={{
              marginBottom: 4,
              padding: "4px 0",
              borderBottom: "1px solid #222",
            }}
          >
            {hint.unlocked ? (
              <div style={{ fontSize: 11, color: "#e0e0e0" }}>
                {i + 1}. {hint.text}
              </div>
            ) : (
              <>
                <div
                  style={{
                    fontSize: 11,
                    color: "#555",
                    fontFamily: "monospace",
                  }}
                >
                  {i + 1}.{" "}
                  <span
                    style={{ filter: hint.unlocked ? "none" : "blur(1px)" }}
                  >
                    {hint.text}
                  </span>
                </div>
                <div style={{ fontSize: 9, color: "#444" }}>
                  unlocks {formatCountdown(hint.unlocksAt).replace(" left", "")}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* First Finders */}
      <div>
        <div
          style={{
            fontSize: 10,
            color: "#666",
            marginBottom: 4,
          }}
        >
          First Finders
        </div>
        {config.firstFinders && config.firstFinders.length > 0 ? (
          config.firstFinders.slice(0, 3).map((finder, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                padding: "2px 0",
                borderBottom: "1px solid #222",
              }}
            >
              <span style={{ color: "#facc15" }}>{finder.name}</span>
              <span style={{ color: "#555" }}>{timeAgo(finder.claimedAt)}</span>
            </div>
          ))
        ) : (
          <div style={{ fontSize: 11, color: "#555" }}>
            No one has found it yet...
          </div>
        )}
      </div>
    </div>
  );
}
