/**
 * AgreementProgress Component
 *
 * Visual indicator showing progress toward consensus in a debate.
 * Uses a gradient progress bar that fills as models agree.
 */

"use client";

import React from "react";
import type { DebateMessage } from "@/types/aiCollaboration";

interface AgreementProgressProps {
  messages: DebateMessage[];
  threshold?: number; // Number of agreements needed for consensus
  className?: string;
}

/**
 * Calculate agreement score from messages
 */
function calculateAgreementScore(
  messages: DebateMessage[],
  threshold: number
): { score: number; percentage: number; agreementCount: number } {
  // Count messages that express agreement
  const agreementCount = messages.filter((m) => m.isAgreement).length;

  // Need consecutive agreements from different models for consensus
  const uniqueModelAgreements = new Set(
    messages.filter((m) => m.isAgreement).map((m) => m.modelId)
  ).size;

  // Score is based on unique model agreements toward threshold
  const score = Math.min(uniqueModelAgreements, threshold);
  const percentage = (score / threshold) * 100;

  return { score, percentage, agreementCount };
}

export function AgreementProgress({
  messages,
  threshold = 2, // Default: both models need to agree
  className = "",
}: AgreementProgressProps) {
  const { score, percentage, agreementCount } = calculateAgreementScore(
    messages,
    threshold
  );

  const isComplete = score >= threshold;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Label */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-400">Agreement Progress</span>
        <span
          className={`font-medium ${
            isComplete ? "text-emerald-400" : "text-zinc-400"
          }`}
        >
          {score}/{threshold} models aligned
          {agreementCount > 0 && (
            <span className="ml-1 text-zinc-500">
              ({agreementCount} agreement{agreementCount !== 1 ? "s" : ""})
            </span>
          )}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 via-zinc-500/30 to-emerald-500/30" />
        </div>

        {/* Progress fill */}
        <div
          className={`
            absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out
            ${
              isComplete
                ? "bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-lg shadow-emerald-500/30"
                : "bg-gradient-to-r from-purple-500 via-violet-500 to-emerald-500"
            }
          `}
          style={{ width: `${percentage}%` }}
        />

        {/* Milestone markers */}
        {threshold > 2 &&
          Array.from({ length: threshold - 1 }).map((_, i) => (
            <div
              key={i}
              className={`
                absolute top-1/2 -translate-y-1/2 w-0.5 h-3 rounded-full
                ${score > i + 1 ? "bg-white/40" : "bg-zinc-600"}
              `}
              style={{ left: `${((i + 1) / threshold) * 100}%` }}
            />
          ))}
      </div>

      {/* Status message */}
      {isComplete && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
          <CheckCircleIcon className="w-3.5 h-3.5" />
          <span>Consensus reached! Generating synthesis...</span>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for inline display
 */
export function AgreementProgressCompact({
  messages,
  threshold = 2,
}: AgreementProgressProps) {
  const { score, percentage } = calculateAgreementScore(messages, threshold);
  const isComplete = score >= threshold;

  return (
    <div className="flex items-center gap-2">
      {/* Mini progress bar */}
      <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`
            h-full rounded-full transition-all duration-500
            ${isComplete ? "bg-emerald-500" : "bg-violet-500"}
          `}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Status icon */}
      {isComplete ? (
        <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
      ) : (
        <span className="text-xs text-zinc-500">
          {score}/{threshold}
        </span>
      )}
    </div>
  );
}

// Check circle icon
function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

export default AgreementProgress;
