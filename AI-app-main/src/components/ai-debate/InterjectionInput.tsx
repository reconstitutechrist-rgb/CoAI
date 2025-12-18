/**
 * InterjectionInput Component
 *
 * Allows users to inject comments, steering, or challenges into an active debate.
 * Supports different interjection types with visual distinction.
 */

"use client";

import React, { useState, useCallback } from "react";
import type { InterjectionType } from "@/types/aiCollaboration";

interface InterjectionInputProps {
  sessionId: string;
  onInterject: (content: string, type: InterjectionType, targetMessageId?: string) => Promise<void>;
  disabled?: boolean;
  targetMessageId?: string;
  className?: string;
}

interface InterjectionTypeOption {
  value: InterjectionType;
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  color: string;
}

const INTERJECTION_TYPES: InterjectionTypeOption[] = [
  {
    value: "comment",
    label: "Comment",
    icon: <MessageIcon />,
    placeholder: "Add a comment to the discussion...",
    color: "zinc",
  },
  {
    value: "steer",
    label: "Steer",
    icon: <CompassIcon />,
    placeholder: "Direct the conversation toward...",
    color: "blue",
  },
  {
    value: "challenge",
    label: "Challenge",
    icon: <AlertIcon />,
    placeholder: "Challenge this point because...",
    color: "amber",
  },
  {
    value: "clarify",
    label: "Clarify",
    icon: <HelpIcon />,
    placeholder: "Please clarify...",
    color: "purple",
  },
];

export function InterjectionInput({
  sessionId,
  onInterject,
  disabled = false,
  targetMessageId,
  className = "",
}: InterjectionInputProps) {
  const [content, setContent] = useState("");
  const [type, setType] = useState<InterjectionType>("comment");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const currentType = INTERJECTION_TYPES.find((t) => t.value === type)!;

  const handleSubmit = useCallback(async () => {
    if (!content.trim() || isSubmitting || disabled) return;

    setIsSubmitting(true);
    try {
      await onInterject(content.trim(), type, targetMessageId);
      setContent("");
      setIsExpanded(false);
    } catch (error) {
      console.error("Failed to submit interjection:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [content, type, targetMessageId, onInterject, isSubmitting, disabled]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg
          bg-zinc-800/50 border border-zinc-700 hover:border-zinc-600
          text-sm text-zinc-400 hover:text-zinc-300
          transition-all duration-200
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          ${className}
        `}
      >
        <MessageIcon />
        <span>Add your input...</span>
      </button>
    );
  }

  return (
    <div
      className={`
        bg-zinc-800/50 border border-zinc-700 rounded-lg overflow-hidden
        ${className}
      `}
    >
      {/* Type selector */}
      <div className="flex border-b border-zinc-700">
        {INTERJECTION_TYPES.map((option) => (
          <button
            key={option.value}
            onClick={() => setType(option.value)}
            className={`
              flex-1 flex items-center justify-center gap-1.5 px-3 py-2
              text-xs font-medium transition-colors
              ${
                type === option.value
                  ? `bg-${option.color}-500/10 text-${option.color}-400 border-b-2 border-${option.color}-500`
                  : "text-zinc-500 hover:text-zinc-400 hover:bg-zinc-700/50"
              }
            `}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className="p-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={currentType.placeholder}
          disabled={disabled || isSubmitting}
          rows={2}
          className={`
            w-full bg-transparent border-none outline-none resize-none
            text-sm text-zinc-200 placeholder-zinc-500
            disabled:opacity-50
          `}
          autoFocus
        />

        {/* Actions */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-700/50">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <kbd className="px-1.5 py-0.5 bg-zinc-700 rounded text-zinc-400">
              ⌘
            </kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 bg-zinc-700 rounded text-zinc-400">
              Enter
            </kbd>
            <span>to send</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsExpanded(false);
                setContent("");
              }}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!content.trim() || isSubmitting || disabled}
              className={`
                px-4 py-1.5 rounded-md text-xs font-medium
                bg-${currentType.color}-500/20 text-${currentType.color}-400
                hover:bg-${currentType.color}-500/30
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
              `}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <SpinnerIcon className="animate-spin" />
                  Sending...
                </span>
              ) : (
                "Send"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact version for inline use (e.g., next to a specific message)
 */
export function InterjectionInputCompact({
  sessionId,
  onInterject,
  targetMessageId,
  disabled = false,
}: Omit<InterjectionInputProps, "className">) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onInterject(content.trim(), "challenge", targetMessageId);
      setContent("");
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to submit challenge:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [content, targetMessageId, onInterject, isSubmitting]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className="p-1 text-zinc-500 hover:text-amber-400 transition-colors"
        title="Challenge this point"
      >
        <AlertIcon />
      </button>
    );
  }

  return (
    <div className="mt-2 flex gap-2">
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        placeholder="Challenge this point..."
        className="flex-1 px-2 py-1 text-xs bg-zinc-800 border border-amber-500/30 rounded"
        autoFocus
      />
      <button
        onClick={handleSubmit}
        disabled={!content.trim() || isSubmitting}
        className="px-2 py-1 text-xs bg-amber-500/20 text-amber-400 rounded hover:bg-amber-500/30 disabled:opacity-50"
      >
        Send
      </button>
      <button
        onClick={() => setIsOpen(false)}
        className="px-2 py-1 text-xs text-zinc-500 hover:text-zinc-400"
      >
        ✕
      </button>
    </div>
  );
}

// Icons
function MessageIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function SpinnerIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-3 h-3 ${className}`} viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export default InterjectionInput;
