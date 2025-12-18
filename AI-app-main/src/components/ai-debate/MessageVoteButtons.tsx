/**
 * MessageVoteButtons Component
 *
 * Thumbs up/down voting buttons for debate messages.
 * Allows users to indicate which arguments they find compelling.
 */

"use client";

import React, { useState, useCallback } from "react";
import type { DebateMessageVotes } from "@/types/aiCollaboration";

interface MessageVoteButtonsProps {
  messageId: string;
  initialVotes?: DebateMessageVotes;
  disabled?: boolean;
  className?: string;
}

export function MessageVoteButtons({
  messageId,
  initialVotes,
  disabled = false,
  className = "",
}: MessageVoteButtonsProps) {
  const [votes, setVotes] = useState<DebateMessageVotes>(
    initialVotes || {
      upvotes: 0,
      downvotes: 0,
      voters: [],
      userVote: undefined,
    }
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVote = useCallback(
    async (voteType: "up" | "down") => {
      if (disabled || isSubmitting) return;

      // If clicking the same vote, remove it (toggle)
      const newVote = votes.userVote === voteType ? "none" : voteType;

      setIsSubmitting(true);

      // Optimistic update
      const prevVotes = { ...votes };
      setVotes((prev) => {
        const updated = { ...prev };

        // Remove previous vote
        if (prev.userVote === "up") updated.upvotes--;
        if (prev.userVote === "down") updated.downvotes--;

        // Add new vote
        if (newVote === "up") updated.upvotes++;
        if (newVote === "down") updated.downvotes++;

        updated.userVote = newVote === "none" ? undefined : newVote;
        return updated;
      });

      try {
        const response = await fetch("/api/ai-debate/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messageId,
            vote: newVote,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to submit vote");
        }

        const data = await response.json();
        setVotes(data.votes);
      } catch (error) {
        console.error("Vote failed:", error);
        // Revert on error
        setVotes(prevVotes);
      } finally {
        setIsSubmitting(false);
      }
    },
    [messageId, votes, disabled, isSubmitting]
  );

  const totalVotes = votes.upvotes + votes.downvotes;
  const score = votes.upvotes - votes.downvotes;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Upvote button */}
      <button
        onClick={() => handleVote("up")}
        disabled={disabled || isSubmitting}
        className={`
          group flex items-center gap-1 px-1.5 py-0.5 rounded transition-all
          ${
            votes.userVote === "up"
              ? "text-emerald-400 bg-emerald-500/20"
              : "text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
        title="This argument is compelling"
      >
        <ThumbsUpIcon
          className={`w-3.5 h-3.5 ${
            votes.userVote === "up" ? "fill-current" : ""
          }`}
        />
        {votes.upvotes > 0 && (
          <span className="text-xs font-medium">{votes.upvotes}</span>
        )}
      </button>

      {/* Downvote button */}
      <button
        onClick={() => handleVote("down")}
        disabled={disabled || isSubmitting}
        className={`
          group flex items-center gap-1 px-1.5 py-0.5 rounded transition-all
          ${
            votes.userVote === "down"
              ? "text-red-400 bg-red-500/20"
              : "text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
        title="This argument is weak"
      >
        <ThumbsDownIcon
          className={`w-3.5 h-3.5 ${
            votes.userVote === "down" ? "fill-current" : ""
          }`}
        />
        {votes.downvotes > 0 && (
          <span className="text-xs font-medium">{votes.downvotes}</span>
        )}
      </button>

      {/* Score indicator (only show if there are votes) */}
      {totalVotes > 0 && (
        <span
          className={`
            ml-1 text-xs font-medium
            ${score > 0 ? "text-emerald-400" : score < 0 ? "text-red-400" : "text-zinc-500"}
          `}
          title={`${totalVotes} total votes`}
        >
          {score > 0 ? "+" : ""}
          {score}
        </span>
      )}
    </div>
  );
}

/**
 * Compact version for inline use
 */
export function MessageVoteButtonsCompact({
  messageId,
  initialVotes,
  disabled = false,
}: Omit<MessageVoteButtonsProps, "className">) {
  const [votes, setVotes] = useState<DebateMessageVotes>(
    initialVotes || {
      upvotes: 0,
      downvotes: 0,
      voters: [],
      userVote: undefined,
    }
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVote = useCallback(
    async (voteType: "up" | "down") => {
      if (disabled || isSubmitting) return;

      const newVote = votes.userVote === voteType ? "none" : voteType;
      setIsSubmitting(true);

      const prevVotes = { ...votes };
      setVotes((prev) => {
        const updated = { ...prev };
        if (prev.userVote === "up") updated.upvotes--;
        if (prev.userVote === "down") updated.downvotes--;
        if (newVote === "up") updated.upvotes++;
        if (newVote === "down") updated.downvotes++;
        updated.userVote = newVote === "none" ? undefined : newVote;
        return updated;
      });

      try {
        const response = await fetch("/api/ai-debate/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId, vote: newVote }),
        });

        if (response.ok) {
          const data = await response.json();
          setVotes(data.votes);
        } else {
          setVotes(prevVotes);
        }
      } catch {
        setVotes(prevVotes);
      } finally {
        setIsSubmitting(false);
      }
    },
    [messageId, votes, disabled, isSubmitting]
  );

  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => handleVote("up")}
        disabled={disabled || isSubmitting}
        className={`p-0.5 rounded ${
          votes.userVote === "up"
            ? "text-emerald-400"
            : "text-zinc-600 hover:text-emerald-400"
        }`}
      >
        <ThumbsUpIcon className="w-3 h-3" />
      </button>
      <button
        onClick={() => handleVote("down")}
        disabled={disabled || isSubmitting}
        className={`p-0.5 rounded ${
          votes.userVote === "down"
            ? "text-red-400"
            : "text-zinc-600 hover:text-red-400"
        }`}
      >
        <ThumbsDownIcon className="w-3 h-3" />
      </button>
    </div>
  );
}

// Icons
function ThumbsUpIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

function ThumbsDownIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
    </svg>
  );
}

export default MessageVoteButtons;
