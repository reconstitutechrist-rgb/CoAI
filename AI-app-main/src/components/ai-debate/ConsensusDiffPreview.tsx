/**
 * ConsensusDiffPreview Component
 *
 * Displays generated code diffs from a debate consensus.
 * Allows users to preview and apply changes to their codebase.
 */

"use client";

import React, { useState, useCallback } from "react";
import type { DebateConsensus } from "@/types/aiCollaboration";
import type { FileDiff, DiffChange } from "@/app/api/ai-debate/generate-diff/route";

interface ConsensusDiffPreviewProps {
  consensus: DebateConsensus;
  sessionId: string;
  targetFiles?: { path: string; content: string }[];
  onApply?: (diffs: FileDiff[]) => Promise<void>;
  className?: string;
}

export function ConsensusDiffPreview({
  consensus,
  sessionId,
  targetFiles,
  onApply,
  className = "",
}: ConsensusDiffPreviewProps) {
  const [diffs, setDiffs] = useState<FileDiff[]>([]);
  const [explanation, setExplanation] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const generateDiffs = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/ai-debate/generate-diff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          consensus,
          targetFiles,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate diffs");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.explanation || "Failed to generate diffs");
      }

      setDiffs(data.diffs);
      setExplanation(data.explanation);

      // Select all files by default
      setSelectedFiles(new Set(data.diffs.map((d: FileDiff) => d.path)));
      // Expand first file
      if (data.diffs.length > 0) {
        setExpandedFiles(new Set([data.diffs[0].path]));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsGenerating(false);
    }
  }, [sessionId, consensus, targetFiles]);

  const handleApply = useCallback(async () => {
    if (!onApply || selectedFiles.size === 0) return;

    setIsApplying(true);
    try {
      const selectedDiffs = diffs.filter((d) => selectedFiles.has(d.path));
      await onApply(selectedDiffs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply changes");
    } finally {
      setIsApplying(false);
    }
  }, [diffs, selectedFiles, onApply]);

  const toggleFileSelection = (path: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const toggleFileExpansion = (path: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // Initial state - show generate button
  if (diffs.length === 0 && !isGenerating) {
    return (
      <div className={`bg-zinc-800/50 border border-zinc-700 rounded-lg p-6 ${className}`}>
        <div className="text-center">
          <CodeIcon className="w-12 h-12 mx-auto text-zinc-600 mb-4" />
          <h3 className="text-lg font-medium text-zinc-200 mb-2">
            Generate Code Changes
          </h3>
          <p className="text-sm text-zinc-400 mb-4 max-w-md mx-auto">
            Convert the consensus into actionable code diffs that you can review
            and apply to your codebase.
          </p>
          <button
            onClick={generateDiffs}
            disabled={isGenerating}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <LoadingSpinner className="w-4 h-4" />
                Generating...
              </span>
            ) : (
              "Generate Diffs"
            )}
          </button>
          {error && (
            <p className="mt-4 text-sm text-red-400">{error}</p>
          )}
        </div>
      </div>
    );
  }

  // Loading state
  if (isGenerating) {
    return (
      <div className={`bg-zinc-800/50 border border-zinc-700 rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-center gap-3">
          <LoadingSpinner className="w-6 h-6 text-purple-400" />
          <span className="text-zinc-300">Analyzing consensus and generating code changes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-zinc-800/50 border border-zinc-700 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700 bg-zinc-800/50">
        <div>
          <h3 className="font-medium text-zinc-200">Generated Code Changes</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {diffs.length} file{diffs.length !== 1 ? "s" : ""} to change
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={generateDiffs}
            className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-300 border border-zinc-700 rounded-md"
          >
            Regenerate
          </button>
          {onApply && (
            <button
              onClick={handleApply}
              disabled={isApplying || selectedFiles.size === 0}
              className="px-3 py-1.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded-md disabled:opacity-50 transition-colors"
            >
              {isApplying ? "Applying..." : `Apply ${selectedFiles.size} Changes`}
            </button>
          )}
        </div>
      </div>

      {/* Explanation */}
      {explanation && (
        <div className="px-4 py-3 border-b border-zinc-700 bg-zinc-800/30">
          <p className="text-sm text-zinc-400">{explanation}</p>
        </div>
      )}

      {/* Diff list */}
      <div className="divide-y divide-zinc-700">
        {diffs.map((diff) => (
          <DiffFileItem
            key={diff.path}
            diff={diff}
            isSelected={selectedFiles.has(diff.path)}
            isExpanded={expandedFiles.has(diff.path)}
            onToggleSelect={() => toggleFileSelection(diff.path)}
            onToggleExpand={() => toggleFileExpansion(diff.path)}
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 bg-red-500/10 border-t border-red-500/30">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Individual diff file item
 */
interface DiffFileItemProps {
  diff: FileDiff;
  isSelected: boolean;
  isExpanded: boolean;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
}

function DiffFileItem({
  diff,
  isSelected,
  isExpanded,
  onToggleSelect,
  onToggleExpand,
}: DiffFileItemProps) {
  const additions = diff.hunks.reduce(
    (sum, h) => sum + h.changes.filter((c) => c.type === "add").length,
    0
  );
  const deletions = diff.hunks.reduce(
    (sum, h) => sum + h.changes.filter((c) => c.type === "remove").length,
    0
  );

  return (
    <div className="bg-zinc-900/30">
      {/* File header */}
      <div className="flex items-center gap-3 px-4 py-2 hover:bg-zinc-700/30">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-purple-500 focus:ring-purple-500"
        />

        <button
          onClick={onToggleExpand}
          className="flex-1 flex items-center gap-2 text-left"
        >
          <ChevronIcon
            className={`w-4 h-4 text-zinc-500 transition-transform ${
              isExpanded ? "rotate-90" : ""
            }`}
          />
          <span className={`text-sm ${getFileTypeColor(diff.type)}`}>
            {getFileTypeIcon(diff.type)}
          </span>
          <span className="text-sm text-zinc-300 font-mono">{diff.path}</span>
        </button>

        <div className="flex items-center gap-2 text-xs">
          {additions > 0 && (
            <span className="text-emerald-400">+{additions}</span>
          )}
          {deletions > 0 && <span className="text-red-400">-{deletions}</span>}
        </div>
      </div>

      {/* Diff content */}
      {isExpanded && (
        <div className="border-t border-zinc-700 bg-zinc-900/50 overflow-x-auto">
          <pre className="text-xs font-mono p-4">
            {diff.hunks.map((hunk, hunkIdx) => (
              <div key={hunkIdx} className="mb-4 last:mb-0">
                {/* Hunk header */}
                <div className="text-zinc-500 mb-1">
                  @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
                </div>
                {/* Changes */}
                {hunk.changes.map((change, changeIdx) => (
                  <DiffLine key={changeIdx} change={change} />
                ))}
              </div>
            ))}
          </pre>
        </div>
      )}
    </div>
  );
}

/**
 * Individual diff line
 */
function DiffLine({ change }: { change: DiffChange }) {
  const bgColor =
    change.type === "add"
      ? "bg-emerald-500/10"
      : change.type === "remove"
      ? "bg-red-500/10"
      : "";
  const textColor =
    change.type === "add"
      ? "text-emerald-300"
      : change.type === "remove"
      ? "text-red-300"
      : "text-zinc-400";
  const prefix =
    change.type === "add" ? "+" : change.type === "remove" ? "-" : " ";

  return (
    <div className={`${bgColor} -mx-4 px-4`}>
      <span className={textColor}>
        {prefix}
        {change.content}
      </span>
    </div>
  );
}

// Helper functions
function getFileTypeIcon(type: FileDiff["type"]): string {
  switch (type) {
    case "create":
      return "+";
    case "delete":
      return "-";
    default:
      return "~";
  }
}

function getFileTypeColor(type: FileDiff["type"]): string {
  switch (type) {
    case "create":
      return "text-emerald-400";
    case "delete":
      return "text-red-400";
    default:
      return "text-amber-400";
  }
}

// Icons
function CodeIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function LoadingSpinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
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

function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export default ConsensusDiffPreview;
