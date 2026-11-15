"use client";

import { useState } from "react";
import { Heart, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleReaction } from "@/app/actions/reactions";
import type { ReactionType } from "@/types";
import { toast } from "sonner";

type ReactionButtonsProps = {
  targetType: "post" | "comment";
  targetId: string;
  initialLikeCount: number;
  initialDislikeCount: number;
  initialReaction: ReactionType;
  size?: "default" | "sm";
};

export function ReactionButtons({
  targetType,
  targetId,
  initialLikeCount,
  initialDislikeCount,
  initialReaction,
  size = "default",
}: ReactionButtonsProps) {
  const [reaction, setReaction] = useState<ReactionType>(initialReaction);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [dislikeCount, setDislikeCount] = useState(initialDislikeCount);
  const [justLiked, setJustLiked] = useState(false);
  const [pending, setPending] = useState(false);

  async function toggle(next: "like" | "dislike") {
    if (pending) return;
    setPending(true);

    const prevReaction = reaction;
    const prevLike = likeCount;
    const prevDislike = dislikeCount;

    if (reaction === next) {
      setReaction(null);
      if (next === "like") setLikeCount((c) => c - 1);
      else setDislikeCount((c) => c - 1);
    } else {
      if (reaction === "like") setLikeCount((c) => c - 1);
      if (reaction === "dislike") setDislikeCount((c) => c - 1);

      if (next === "like") {
        setLikeCount((c) => c + 1);
        setJustLiked(true);
        setTimeout(() => setJustLiked(false), 220);
      } else {
        setDislikeCount((c) => c + 1);
      }
      setReaction(next);
    }

    const { error } = await toggleReaction({ targetType, targetId, reaction: next });
    setPending(false);

    if (error) {
      setReaction(prevReaction);
      setLikeCount(prevLike);
      setDislikeCount(prevDislike);
      toast.error(error);
    }
  }

  const iconSize = size === "sm" ? "size-4" : "size-5";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className={cn("flex items-center gap-4", textSize)}>
      <button
        type="button"
        aria-pressed={reaction === "like"}
        onClick={() => toggle("like")}
        className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        <Heart
          className={cn(
            iconSize,
            "transition-transform",
            justLiked && "scale-125",
            reaction === "like"
              ? "fill-like text-like"
              : "text-muted-foreground"
          )}
        />
        <span className={reaction === "like" ? "font-medium text-like" : undefined}>
          {likeCount}
        </span>
      </button>

      <button
        type="button"
        aria-pressed={reaction === "dislike"}
        onClick={() => toggle("dislike")}
        className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        <ThumbsDown
          className={cn(
            iconSize,
            reaction === "dislike"
              ? "fill-foreground/80 text-foreground"
              : "text-muted-foreground"
          )}
        />
        <span className={reaction === "dislike" ? "font-medium text-foreground" : undefined}>
          {dislikeCount}
        </span>
      </button>
    </div>
  );
}
