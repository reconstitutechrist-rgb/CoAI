/**
 * DebatePanel Component
 *
 * Main UI for the collaborative multi-AI debate feature.
 * Displays a conversation-style view of both models discussing,
 * with streaming updates, cost tracking, and synthesis.
 */

"use client";

import React, { useRef, useEffect } from "react";
import type {
  DebateMessage,
  DebateConsensus,
  DebateCost,
  DebateModelId,
  InterjectionType,
} from "@/types/aiCollaboration";
import { ModelBadge } from "./ModelBadge";
import { CostTracker, CostTrackerCompact } from "./CostTracker";
import { EndDebateButton } from "./EndDebateButton";
import { ConsensusBanner } from "./ConsensusBanner";
import { MessageVoteButtons } from "./MessageVoteButtons";
import { InterjectionInputCompact } from "./InterjectionInput";

interface DebatePanelProps {
  messages: DebateMessage[];
  currentSpeaker: DebateModelId | null;
  cost: DebateCost | null;
  consensus: DebateConsensus | null;
  status:
    | "idle"
    | "starting"
    | "debating"
    | "synthesizing"
    | "complete"
    | "error";
  error: string | null;
  onEndDebate: () => void;
  onImplementConsensus?: () => void;
  isImplementing?: boolean;
  sessionId?: string;
  onInterject?: (
    content: string,
    type: InterjectionType,
    targetMessageId?: string
  ) => Promise<void>;
  showVoting?: boolean;
  /** User question for saving to project */
  userQuestion?: string;
  /** Callback for saving debate to project */
  onSaveToProject?: () => void;
  /** Whether the save to project option should be shown */
  canSaveToProject?: boolean;
}

export function DebatePanel({
  messages,
  currentSpeaker,
  cost,
  consensus,
  status,
  error,
  onEndDebate,
  onImplementConsensus,
  isImplementing = false,
  sessionId,
  onInterject,
  showVoting = true,
  userQuestion,
  onSaveToProject,
  canSaveToProject = false,
}: DebatePanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentSpeaker]);

  const isDebating = status === "debating" || status === "starting";

  return (
    <div className="flex flex-col h-full bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-800/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <h3 className="font-semibold text-zinc-100">AI Debate</h3>
          <StatusBadge status={status} />
        </div>

        <div className="flex items-center gap-3">
          <CostTrackerCompact cost={cost} isDebating={isDebating} />
          <EndDebateButton onClick={onEndDebate} isDebating={isDebating} />
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Starting state */}
        {status === "starting" && messages.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3 text-zinc-400">
              <LoadingSpinner className="w-5 h-5" />
              <span>Starting debate...</span>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((message) => (
          <DebateMessageBubble
            key={message.id}
            message={message}
            showVoting={showVoting}
            sessionId={sessionId}
            onInterject={onInterject}
          />
        ))}

        {/* Typing indicator */}
        {currentSpeaker && status === "debating" && (
          <TypingIndicator modelId={currentSpeaker} />
        )}

        {/* Synthesizing state */}
        {status === "synthesizing" && (
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-zinc-800/50 text-zinc-400">
              <LoadingSpinner className="w-4 h-4" />
              <span className="text-sm">Synthesizing consensus...</span>
            </div>
          </div>
        )}

        {/* Consensus */}
        {consensus && status === "complete" && (
          <div className="space-y-3">
            <ConsensusBanner
              consensus={consensus}
              onImplement={onImplementConsensus}
              isImplementing={isImplementing}
            />
            {/* Save to Project Button */}
            {canSaveToProject && onSaveToProject && (
              <div className="flex justify-end">
                <button
                  onClick={onSaveToProject}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                    />
                  </svg>
                  Save to Project
                </button>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
            <span>⚠️</span>
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Footer with full cost tracker */}
      {cost && (
        <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-800/30">
          <CostTracker cost={cost} isDebating={isDebating} />
        </div>
      )}
    </div>
  );
}

/**
 * Individual message bubble
 */
interface DebateMessageBubbleProps {
  message: DebateMessage;
  showVoting?: boolean;
  sessionId?: string;
  onInterject?: (
    content: string,
    type: InterjectionType,
    targetMessageId?: string
  ) => Promise<void>;
}

function DebateMessageBubble({
  message,
  showVoting = true,
  sessionId,
  onInterject,
}: DebateMessageBubbleProps) {
  const isClaudeModel = message.modelId.includes("claude");

  return (
    <div
      className={`
        flex flex-col gap-2
        ${isClaudeModel ? "items-start" : "items-end"}
      `}
    >
      {/* Model badge */}
      <ModelBadge
        modelId={message.modelId}
        displayName={message.modelDisplayName}
        role={message.role}
        size="sm"
      />

      {/* Message content */}
      <div
        className={`
          max-w-[85%] px-4 py-3 rounded-2xl
          ${
            isClaudeModel
              ? "bg-purple-500/10 border border-purple-500/20 rounded-tl-sm"
              : "bg-emerald-500/10 border border-emerald-500/20 rounded-tr-sm"
          }
        `}
      >
        <div className="prose prose-invert prose-sm max-w-none">
          <div className="text-zinc-200 whitespace-pre-wrap text-sm leading-relaxed">
            {message.content}
          </div>
        </div>

        {/* Agreement indicator */}
        {message.isAgreement && (
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-zinc-700/50">
            <span className="text-emerald-400">🤝</span>
            <span className="text-xs text-emerald-400">
              Expressed agreement
            </span>
          </div>
        )}

        {/* Message actions: voting and challenge */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-700/50">
          {/* Voting buttons */}
          {showVoting && <MessageVoteButtons messageId={message.id} />}

          {/* Challenge button */}
          {sessionId && onInterject && (
            <InterjectionInputCompact
              sessionId={sessionId}
              onInterject={onInterject}
              targetMessageId={message.id}
            />
          )}
        </div>
      </div>

      {/* Timestamp */}
      <span className="text-xs text-zinc-600 px-2">
        {new Date(message.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    </div>
  );
}

/**
 * Typing indicator when a model is responding
 */
function TypingIndicator({ modelId }: { modelId: DebateModelId }) {
  const isClaudeModel = modelId.includes("claude");
  const displayName = isClaudeModel ? "Claude Opus 4.5" : "GPT-5";

  return (
    <div
      className={`
        flex items-center gap-3
        ${isClaudeModel ? "justify-start" : "justify-end"}
      `}
    >
      <div
        className={`
          flex items-center gap-3 px-4 py-2 rounded-full
          ${
            isClaudeModel
              ? "bg-purple-500/10 border border-purple-500/20"
              : "bg-emerald-500/10 border border-emerald-500/20"
          }
        `}
      >
        <span className="text-sm text-zinc-400">{displayName} is typing</span>
        <div className="flex gap-1">
          <span
            className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Status badge
 */
function StatusBadge({ status }: { status: DebatePanelProps["status"] }) {
  const statusConfig = {
    idle: {
      label: "Ready",
      color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
    },
    starting: {
      label: "Starting...",
      color: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    },
    debating: {
      label: "In Progress",
      color: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    },
    synthesizing: {
      label: "Synthesizing",
      color: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    },
    complete: {
      label: "Complete",
      color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    },
    error: {
      label: "Error",
      color: "bg-red-500/10 text-red-400 border-red-500/30",
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5 rounded-full text-xs border
        ${config.color}
      `}
    >
      {status === "debating" && (
        <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />
      )}
      {config.label}
    </span>
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

export default DebatePanel;
