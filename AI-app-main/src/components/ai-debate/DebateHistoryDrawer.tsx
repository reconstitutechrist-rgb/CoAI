/**
 * DebateHistoryDrawer Component
 *
 * Sidebar showing past debates for the current app.
 * Allows reviewing previous discussions and their implementation status.
 */

"use client";

import React from "react";
import type { DebateSession } from "@/types/aiCollaboration";

interface DebateHistoryDrawerProps {
  debates: DebateSession[];
  isOpen: boolean;
  onClose: () => void;
  onSelectDebate: (debate: DebateSession) => void;
  selectedDebateId?: string;
}

export function DebateHistoryDrawer({
  debates,
  isOpen,
  onClose,
  onSelectDebate,
  selectedDebateId,
}: DebateHistoryDrawerProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Drawer */}
      <div
        className={`
          fixed right-0 top-0 h-full w-80 z-50
          bg-zinc-900 border-l border-zinc-800
          shadow-2xl shadow-black/50
          transform transition-transform duration-300
          ${isOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100">Past Debates</h2>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-4rem)]">
          {debates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <span className="text-4xl mb-3">💬</span>
              <p className="text-zinc-400 text-sm">No debates yet</p>
              <p className="text-zinc-500 text-xs mt-1">
                Start a debate by toggling &quot;Ask Both AIs&quot; mode
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {debates.map((debate) => (
                <DebateHistoryItem
                  key={debate.id}
                  debate={debate}
                  isSelected={debate.id === selectedDebateId}
                  onClick={() => onSelectDebate(debate)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

interface DebateHistoryItemProps {
  debate: DebateSession;
  isSelected: boolean;
  onClick: () => void;
}

function DebateHistoryItem({
  debate,
  isSelected,
  onClick,
}: DebateHistoryItemProps) {
  const isImplemented = !!debate.consensus?.implementedAt;
  const formattedDate = new Date(debate.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left px-4 py-3 transition-colors
        hover:bg-zinc-800/50
        ${isSelected ? "bg-zinc-800" : ""}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <span className="text-lg mt-0.5">📝</span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Question preview */}
          <p className="text-sm text-zinc-200 truncate">
            {debate.userQuestion}
          </p>

          {/* Meta */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-zinc-500">{formattedDate}</span>
            <span className="text-zinc-700">•</span>
            <span className="text-xs text-zinc-500">
              {debate.messages.length} messages
            </span>
          </div>
        </div>

        {/* Status */}
        <div className="flex-shrink-0">
          {isImplemented ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs">
              <CheckIcon className="w-3 h-3" />
              Done
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs">
              <ClockIcon className="w-3 h-3" />
              Pending
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function CloseIcon({ className }: { className?: string }) {
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
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
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
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

export default DebateHistoryDrawer;
