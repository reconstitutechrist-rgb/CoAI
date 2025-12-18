/**
 * CostTracker Component
 *
 * Displays live-updating cost information for the debate session.
 * Shows per-model breakdown and total cost.
 */

"use client";

import React from "react";
import type { DebateCost, DebateModelId } from "@/types/aiCollaboration";
import { formatCost } from "@/services/providers/ProviderRegistry";

interface CostTrackerProps {
  cost: DebateCost | null;
  isDebating?: boolean;
}

const MODEL_LABELS: Record<DebateModelId, string> = {
  "claude-opus-4": "Claude",
  "claude-sonnet-4": "Claude",
  "gpt-5": "GPT-5",
  "gpt-4o": "GPT-4o",
};

export function CostTracker({ cost, isDebating = false }: CostTrackerProps) {
  if (!cost) {
    return null;
  }

  const modelEntries = Object.entries(cost.byModel) as [
    DebateModelId,
    (typeof cost.byModel)[DebateModelId]
  ][];

  return (
    <div className="flex items-center gap-4 text-xs text-zinc-400">
      {/* Total cost */}
      <div className="flex items-center gap-1.5">
        <span className="text-zinc-500">💰</span>
        <span className="font-mono font-medium text-zinc-300">
          {formatCost(cost.totalCost)}
        </span>
        {isDebating && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        )}
      </div>

      {/* Divider */}
      <span className="text-zinc-600">│</span>

      {/* Per-model breakdown */}
      <div className="flex items-center gap-3">
        {modelEntries.map(([modelId, modelCost]) => (
          <div key={modelId} className="flex items-center gap-1">
            <span
              className={`w-2 h-2 rounded-full ${
                modelId.includes("claude") ? "bg-purple-400" : "bg-emerald-400"
              }`}
            />
            <span className="text-zinc-500">{MODEL_LABELS[modelId]}:</span>
            <span className="font-mono">{formatCost(modelCost.cost)}</span>
          </div>
        ))}
      </div>

      {/* Token count */}
      <span className="text-zinc-600">│</span>
      <div className="flex items-center gap-1">
        <span className="text-zinc-500">Tokens:</span>
        <span className="font-mono">
          {cost.totalInputTokens.toLocaleString()} in /{" "}
          {cost.totalOutputTokens.toLocaleString()} out
        </span>
      </div>
    </div>
  );
}

/**
 * Compact version for inline display
 */
export function CostTrackerCompact({
  cost,
  isDebating = false,
}: CostTrackerProps) {
  if (!cost) {
    return null;
  }

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 px-2 py-1 rounded-full
        bg-zinc-800/50 border border-zinc-700/50 text-xs
        ${isDebating ? "animate-pulse" : ""}
      `}
    >
      <span>💰</span>
      <span className="font-mono font-medium text-zinc-300">
        {formatCost(cost.totalCost)}
      </span>
    </div>
  );
}

export default CostTracker;
