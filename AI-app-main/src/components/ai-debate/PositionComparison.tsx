/**
 * PositionComparison Component
 *
 * Side-by-side comparison of model positions in a debate.
 * Highlights areas of agreement and disagreement.
 */

"use client";

import React, { useMemo } from "react";
import type { DebateMessage, DebateModelId } from "@/types/aiCollaboration";
import { MODEL_DISPLAY_INFO } from "@/prompts/debatePersonas";

interface PositionComparisonProps {
  messages: DebateMessage[];
  className?: string;
}

interface ModelPosition {
  modelId: DebateModelId;
  displayName: string;
  keyPoints: string[];
  agreements: string[];
  uniquePoints: string[];
  lastMessage: string;
  messageCount: number;
}

/**
 * Extract key points from message content
 */
function extractKeyPoints(content: string): string[] {
  const points: string[] = [];

  // Look for numbered lists
  const numberedMatches = content.match(/^\d+\.\s+(.+)$/gm);
  if (numberedMatches) {
    points.push(...numberedMatches.map((m) => m.replace(/^\d+\.\s+/, "")));
  }

  // Look for bullet points
  const bulletMatches = content.match(/^[-•*]\s+(.+)$/gm);
  if (bulletMatches) {
    points.push(...bulletMatches.map((m) => m.replace(/^[-•*]\s+/, "")));
  }

  // Look for sentences with key phrases
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 20);
  const keyPhrases = [
    "should",
    "recommend",
    "suggest",
    "propose",
    "believe",
    "think",
    "important",
    "critical",
    "essential",
    "agree",
    "disagree",
  ];

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (
      keyPhrases.some((phrase) => trimmed.toLowerCase().includes(phrase)) &&
      points.length < 10
    ) {
      if (!points.includes(trimmed)) {
        points.push(trimmed);
      }
    }
  }

  return points.slice(0, 8);
}

/**
 * Find common themes between point sets
 */
function findAgreements(
  pointsA: string[],
  pointsB: string[]
): { agreements: string[]; uniqueA: string[]; uniqueB: string[] } {
  const agreements: string[] = [];
  const uniqueA: string[] = [];
  const uniqueB: string[] = [];

  // Simple keyword overlap detection
  for (const pointA of pointsA) {
    const wordsA = new Set(
      pointA
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 4)
    );
    let found = false;

    for (const pointB of pointsB) {
      const wordsB = new Set(
        pointB
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 4)
      );

      // Count overlapping words
      let overlap = 0;
      for (const word of wordsA) {
        if (wordsB.has(word)) overlap++;
      }

      // If significant overlap, consider it agreement
      if (overlap >= 2 || overlap / wordsA.size > 0.3) {
        if (!agreements.includes(pointA)) {
          agreements.push(pointA);
        }
        found = true;
        break;
      }
    }

    if (!found) {
      uniqueA.push(pointA);
    }
  }

  // Find unique points in B
  for (const pointB of pointsB) {
    const wordsB = new Set(
      pointB
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 4)
    );
    let found = false;

    for (const pointA of pointsA) {
      const wordsA = new Set(
        pointA
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 4)
      );

      let overlap = 0;
      for (const word of wordsB) {
        if (wordsA.has(word)) overlap++;
      }

      if (overlap >= 2 || overlap / wordsB.size > 0.3) {
        found = true;
        break;
      }
    }

    if (!found) {
      uniqueB.push(pointB);
    }
  }

  return { agreements, uniqueA, uniqueB };
}

export function PositionComparison({
  messages,
  className = "",
}: PositionComparisonProps) {
  // Build position data for each model
  const positions = useMemo(() => {
    const modelMap = new Map<DebateModelId, DebateMessage[]>();

    // Group messages by model
    for (const msg of messages) {
      const existing = modelMap.get(msg.modelId) || [];
      existing.push(msg);
      modelMap.set(msg.modelId, existing);
    }

    // Build positions
    const result: ModelPosition[] = [];

    for (const [modelId, modelMessages] of modelMap) {
      const allContent = modelMessages.map((m) => m.content).join("\n\n");
      const keyPoints = extractKeyPoints(allContent);
      const lastMsg = modelMessages[modelMessages.length - 1];

      result.push({
        modelId,
        displayName: lastMsg.modelDisplayName,
        keyPoints,
        agreements: [], // Will be populated after
        uniquePoints: [], // Will be populated after
        lastMessage: lastMsg.content.slice(0, 500),
        messageCount: modelMessages.length,
      });
    }

    // Find agreements between positions (for 2 models)
    if (result.length === 2) {
      const { agreements, uniqueA, uniqueB } = findAgreements(
        result[0].keyPoints,
        result[1].keyPoints
      );
      result[0].agreements = agreements;
      result[0].uniquePoints = uniqueA;
      result[1].agreements = agreements;
      result[1].uniquePoints = uniqueB;
    }

    return result;
  }, [messages]);

  if (positions.length === 0) {
    return (
      <div className={`p-6 text-center text-zinc-500 ${className}`}>
        No positions to compare yet
      </div>
    );
  }

  // Get model colors
  const getModelColor = (modelId: DebateModelId) => {
    const info = MODEL_DISPLAY_INFO[modelId];
    return info?.color || "zinc";
  };

  return (
    <div className={`bg-zinc-800/50 border border-zinc-700 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-700 bg-zinc-800/50">
        <h3 className="font-medium text-zinc-200">Position Comparison</h3>
        <p className="text-xs text-zinc-500 mt-0.5">
          Side-by-side analysis of model perspectives
        </p>
      </div>

      {/* Comparison grid */}
      <div className={`grid grid-cols-${Math.min(positions.length, 3)} divide-x divide-zinc-700`}>
        {positions.map((position) => {
          const color = getModelColor(position.modelId);
          const isClaudeModel = position.modelId.includes("claude");
          const bgColor = isClaudeModel ? "purple" : "emerald";

          return (
            <div key={position.modelId} className="p-4">
              {/* Model header */}
              <div className="flex items-center gap-2 mb-4">
                <div
                  className={`w-3 h-3 rounded-full bg-${bgColor}-500`}
                />
                <span className="font-medium text-zinc-200">
                  {position.displayName}
                </span>
                <span className="text-xs text-zinc-500">
                  ({position.messageCount} messages)
                </span>
              </div>

              {/* Key points */}
              <div className="space-y-4">
                {/* Unique points */}
                {position.uniquePoints.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-amber-400 mb-2 flex items-center gap-1.5">
                      <UniqueIcon className="w-3.5 h-3.5" />
                      Unique Points
                    </h4>
                    <ul className="space-y-1.5">
                      {position.uniquePoints.slice(0, 4).map((point, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-zinc-300 pl-3 border-l-2 border-amber-500/30"
                        >
                          {point.slice(0, 150)}
                          {point.length > 150 ? "..." : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Agreements (only show in first column) */}
                {position === positions[0] && position.agreements.length > 0 && (
                  <div className="col-span-full">
                    <h4 className="text-xs font-medium text-emerald-400 mb-2 flex items-center gap-1.5">
                      <AgreementIcon className="w-3.5 h-3.5" />
                      Shared Agreements
                    </h4>
                    <ul className="space-y-1.5">
                      {position.agreements.slice(0, 4).map((point, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-zinc-300 pl-3 border-l-2 border-emerald-500/30"
                        >
                          {point.slice(0, 150)}
                          {point.length > 150 ? "..." : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* All key points if no unique/agreement split */}
                {position.uniquePoints.length === 0 && position.agreements.length === 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-zinc-400 mb-2">
                      Key Points
                    </h4>
                    <ul className="space-y-1.5">
                      {position.keyPoints.slice(0, 5).map((point, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-zinc-300 pl-3 border-l-2 border-zinc-600"
                        >
                          {point.slice(0, 150)}
                          {point.length > 150 ? "..." : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Agreement summary */}
      {positions.length === 2 && positions[0].agreements.length > 0 && (
        <div className="px-4 py-3 border-t border-zinc-700 bg-emerald-500/5">
          <div className="flex items-center gap-2">
            <AgreementIcon className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-400">
              {positions[0].agreements.length} areas of agreement found
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version showing just the summary
 */
export function PositionComparisonCompact({
  messages,
}: Omit<PositionComparisonProps, "className">) {
  const modelIds = useMemo(() => {
    const ids = new Set<DebateModelId>();
    messages.forEach((m) => ids.add(m.modelId));
    return Array.from(ids);
  }, [messages]);

  const agreementMessages = messages.filter((m) => m.isAgreement).length;

  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-1.5">
        <span className="text-zinc-500">Participants:</span>
        {modelIds.map((id) => (
          <span
            key={id}
            className={`px-2 py-0.5 rounded text-xs ${
              id.includes("claude")
                ? "bg-purple-500/20 text-purple-300"
                : id.includes("gpt")
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-blue-500/20 text-blue-300"
            }`}
          >
            {id.split("-")[0]}
          </span>
        ))}
      </div>
      {agreementMessages > 0 && (
        <div className="flex items-center gap-1.5 text-emerald-400">
          <AgreementIcon className="w-4 h-4" />
          <span>{agreementMessages} agreements</span>
        </div>
      )}
    </div>
  );
}

// Icons
function UniqueIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function AgreementIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export default PositionComparison;
