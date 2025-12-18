/**
 * EndDebateButton Component
 *
 * Button to end the debate early and get the synthesis.
 * Shows "That's enough, give me the answer" style messaging.
 */

"use client";

import React from "react";

interface EndDebateButtonProps {
  onClick: () => void;
  isDebating: boolean;
  disabled?: boolean;
}

export function EndDebateButton({
  onClick,
  isDebating,
  disabled = false,
}: EndDebateButtonProps) {
  if (!isDebating) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg
        bg-amber-500/10 border border-amber-500/30
        text-amber-400 text-sm font-medium
        hover:bg-amber-500/20 hover:border-amber-500/50
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
    >
      <StopIcon className="w-4 h-4" />
      <span>That&apos;s enough, give me the answer</span>
    </button>
  );
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
      />
    </svg>
  );
}

export default EndDebateButton;
