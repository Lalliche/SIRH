"use client";

import { Button } from "@/components/ui";
import { db } from "@/lib/db";
import { REACTIONS, reactionCount, toggleReaction } from "./helpers";

export default function ReactionBar({ announcement: a, userId }) {
  return (
    <div className="flex flex-wrap gap-[0.4em]" role="group" aria-label="Réactions">
      {REACTIONS.map(({ key, label, icon }) => {
        const mine = a.reactions?.[key]?.includes(userId);
        return (
          <Button
            key={key}
            size="sm"
            icon={icon}
            variant={mine ? "soft" : "secondary"}
            aria-pressed={!!mine}
            onClick={() => db.patch("announcements", a.id, { reactions: toggleReaction(a, key, userId) })}
          >
            {label} <span className="num">{reactionCount(a, key) || ""}</span>
          </Button>
        );
      })}
    </div>
  );
}
