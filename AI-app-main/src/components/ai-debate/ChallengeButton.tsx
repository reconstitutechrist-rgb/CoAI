/**
 * ChallengeButton Component
 *
 * Allows users to challenge specific claims or statements in debate messages.
 * Provides quick challenge templates and custom challenge input.
 */

"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import type { DebateMessage } from "@/types/aiCollaboration";

interface ChallengeButtonProps {
  message: DebateMessage;
  onChallenge: (content: string, targetMessageId: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

const CHALLENGE_TEMPLATES = [
  { label: "Need evidence", text: "Can you provide evidence or sources for this claim?" },
  { label: "Consider alternatives", text: "Have you considered alternative approaches?" },
  { label: "Edge cases", text: "What about edge cases or exceptions to this?" },
  { label: "Clarify", text: "Can you clarify what you mean by this?" },
  { label: "Performance impact", text: "What's the performance impact of this approach?" },
  { label: "Security concern", text: "Are there any security implications to consider?" },
];

export function ChallengeButton({
  message,
  onChallenge,
  disabled = false,
  className = "",
}: ChallengeButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customChallenge, setCustomChallenge] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowCustomInput(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Focus input when custom input is shown
  useEffect(() => {
    if (showCustomInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showCustomInput]);

  const handleChallenge = useCallback(
    async (text: string) => {
      if (!text.trim() || isSubmitting) return;

      setIsSubmitting(true);
      try {
        await onChallenge(text.trim(), message.id);
        setIsOpen(false);
        setCustomChallenge("");
        setShowCustomInput(false);
      } catch (error) {
        console.error("Failed to submit challenge:", error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [message.id, onChallenge, isSubmitting]
  );

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleChallenge(customChallenge);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isSubmitting}
        className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
          isOpen
            ? "bg-amber-500/20 text-amber-400"
            : "text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title="Challenge this statement"
      >
        <ChallengeIcon className="w-3.5 h-3.5" />
        <span>Challenge</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 bottom-full left-0 mb-1 w-64 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2 border-b border-zinc-700 bg-zinc-800/50">
            <div className="text-xs font-medium text-zinc-300">Challenge this statement</div>
            <div className="text-xs text-zinc-500 truncate">
              Re: "{message.content.slice(0, 50)}..."
            </div>
          </div>

          {/* Quick challenges */}
          {!showCustomInput && (
            <div className="p-1.5">
              <div className="grid grid-cols-2 gap-1">
                {CHALLENGE_TEMPLATES.map((template, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleChallenge(template.text)}
                    disabled={isSubmitting}
                    className="px-2 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-700 rounded transition-colors disabled:opacity-50"
                  >
                    {template.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowCustomInput(true)}
                className="w-full mt-1.5 px-2 py-1.5 text-xs text-purple-400 hover:bg-purple-500/10 rounded transition-colors text-left"
              >
                + Write custom challenge...
              </button>
            </div>
          )}

          {/* Custom input */}
          {showCustomInput && (
            <form onSubmit={handleCustomSubmit} className="p-2">
              <input
                ref={inputRef}
                type="text"
                value={customChallenge}
                onChange={(e) => setCustomChallenge(e.target.value)}
                placeholder="Type your challenge..."
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-600 rounded text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                disabled={isSubmitting}
              />
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomInput(false);
                    setCustomChallenge("");
                  }}
                  className="flex-1 px-2 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                  disabled={isSubmitting}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!customChallenge.trim() || isSubmitting}
                  className="flex-1 px-2 py-1.5 text-xs bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded transition-colors"
                >
                  {isSubmitting ? "Sending..." : "Send"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact inline version for message rows
 */
export function ChallengeButtonCompact({
  messageId,
  onChallenge,
  disabled = false,
}: {
  messageId: string;
  onChallenge: (content: string, targetMessageId: string) => Promise<void>;
  disabled?: boolean;
}) {
  const [isActive, setIsActive] = useState(false);

  const handleQuickChallenge = async () => {
    setIsActive(true);
    try {
      await onChallenge("I'd like to challenge this point. Can you elaborate?", messageId);
    } finally {
      setIsActive(false);
    }
  };

  return (
    <button
      onClick={handleQuickChallenge}
      disabled={disabled || isActive}
      className="p-1 text-zinc-500 hover:text-amber-400 transition-colors disabled:opacity-50"
      title="Quick challenge"
    >
      <ChallengeIcon className={`w-4 h-4 ${isActive ? "animate-pulse" : ""}`} />
    </button>
  );
}

/**
 * Text selection challenge - shows challenge button when text is selected
 */
export function SelectionChallenge({
  containerRef,
  onChallenge,
  messageId,
}: {
  containerRef: React.RefObject<HTMLElement>;
  onChallenge: (content: string, targetMessageId: string, selectedText: string) => Promise<void>;
  messageId: string;
}) {
  const [selection, setSelection] = useState<{
    text: string;
    position: { x: number; y: number };
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseUp = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        setSelection(null);
        return;
      }

      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      setSelection({
        text: sel.toString().trim(),
        position: {
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top,
        },
      });
    };

    container.addEventListener("mouseup", handleMouseUp);
    return () => container.removeEventListener("mouseup", handleMouseUp);
  }, [containerRef]);

  const handleChallenge = async () => {
    if (!selection || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onChallenge(
        `I'd like to challenge this specific claim: "${selection.text}"`,
        messageId,
        selection.text
      );
      setSelection(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!selection) return null;

  return (
    <div
      className="absolute z-50 -translate-x-1/2 -translate-y-full"
      style={{
        left: selection.position.x,
        top: selection.position.y - 8,
      }}
    >
      <button
        onClick={handleChallenge}
        disabled={isSubmitting}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded-lg shadow-lg transition-colors disabled:opacity-50"
      >
        <ChallengeIcon className="w-3.5 h-3.5" />
        {isSubmitting ? "Challenging..." : "Challenge this"}
      </button>
      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-amber-600" />
    </div>
  );
}

// Icon
function ChallengeIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export default ChallengeButton;
