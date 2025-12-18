/**
 * ConsensusBanner Component
 *
 * Displays the final consensus/synthesis from the debate.
 * Includes "Implement This" button to apply the agreed approach.
 */

"use client";

import React, { useState } from "react";
import type { DebateConsensus } from "@/types/aiCollaboration";

interface ConsensusBannerProps {
  consensus: DebateConsensus;
  onImplement?: () => void;
  isImplementing?: boolean;
}

export function ConsensusBanner({
  consensus,
  onImplement,
  isImplementing = false,
}: ConsensusBannerProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div
      className={`
        rounded-xl border overflow-hidden
        bg-gradient-to-r from-purple-500/5 via-zinc-800/50 to-emerald-500/5
        border-zinc-700/50
      `}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-zinc-800/50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🤝</span>
          <div>
            <h3 className="font-semibold text-zinc-100">Consensus Reached</h3>
            <p className="text-xs text-zinc-400">
              Both AI models have aligned on an approach
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Implement button */}
          {onImplement &&
            consensus.implementable &&
            !consensus.implementedAt && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onImplement();
                }}
                disabled={isImplementing}
                className={`
                flex items-center gap-2 px-4 py-2 rounded-lg
                bg-gradient-to-r from-purple-500 to-emerald-500
                text-white text-sm font-medium
                hover:from-purple-400 hover:to-emerald-400
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              >
                {isImplementing ? (
                  <>
                    <LoadingSpinner className="w-4 h-4" />
                    <span>Implementing...</span>
                  </>
                ) : (
                  <>
                    <RocketIcon className="w-4 h-4" />
                    <span>Implement This</span>
                  </>
                )}
              </button>
            )}

          {/* Already implemented badge */}
          {consensus.implementedAt && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm">
              <CheckIcon className="w-4 h-4" />
              Implemented
            </span>
          )}

          {/* Expand/collapse */}
          <button className="p-1 text-zinc-400 hover:text-zinc-200">
            <ChevronIcon
              className={`w-5 h-5 transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 py-4 space-y-4">
          {/* Summary */}
          <div className="prose prose-invert prose-sm max-w-none">
            <div className="text-zinc-300 whitespace-pre-wrap">
              {consensus.summary}
            </div>
          </div>

          {/* Action items */}
          {consensus.actionItems.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-zinc-400">
                Action Items
              </h4>
              <ul className="space-y-1">
                {consensus.actionItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-2 text-sm text-zinc-300"
                  >
                    <span
                      className={`
                        mt-1 w-2 h-2 rounded-full flex-shrink-0
                        ${item.priority === "high" ? "bg-red-400" : ""}
                        ${item.priority === "medium" ? "bg-amber-400" : ""}
                        ${item.priority === "low" ? "bg-zinc-400" : ""}
                      `}
                    />
                    <span>{item.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Key decisions */}
          {consensus.keyDecisions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-zinc-400">
                Key Decisions
              </h4>
              <ul className="space-y-1">
                {consensus.keyDecisions.map((decision, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-zinc-300"
                  >
                    <span className="text-emerald-400">✓</span>
                    <span>{decision}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RocketIcon({ className }: { className?: string }) {
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
        d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
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

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      fill="none"
      viewBox="0 0 24 24"
    >
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

export default ConsensusBanner;
