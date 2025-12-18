/**
 * useDebateChat Hook
 *
 * Manages the collaborative multi-AI debate feature.
 * Handles SSE streaming from the debate API, state updates,
 * and integration with the app store.
 *
 * @module useDebateChat
 */

import { useCallback, useRef, useState } from "react";
import { useAppStore, useDebateState } from "@/store/useAppStore";
import type {
  DebateMessage,
  DebateSession,
  DebateConsensus,
  DebateCost,
  DebateStreamEvent,
  DebateModelId,
  StartDebateRequest,
  InterjectionType,
  DebateInterjection,
} from "@/types/aiCollaboration";
import { DEFAULT_DEBATE_PARTICIPANTS } from "@/prompts/debatePersonas";

interface UseDebateChatOptions {
  appId: string;
  maxRounds?: number;
  onDebateComplete?: (session: DebateSession) => void;
  onError?: (error: string) => void;
}

interface UseDebateChatReturn {
  // State
  isDebating: boolean;
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
  debateMode: boolean;

  // Actions
  startDebate: (
    question: string,
    appState?: StartDebateRequest["currentAppState"]
  ) => Promise<void>;
  endDebate: () => void;
  toggleDebateMode: () => void;
  clearDebate: () => void;

  // User Interjections
  interject: (
    content: string,
    type?: InterjectionType,
    targetMessageId?: string
  ) => Promise<DebateInterjection | null>;
  challenge: (
    messageId: string,
    reason: string
  ) => Promise<DebateInterjection | null>;
  pendingInterjections: DebateInterjection[];

  // History
  debateHistory: DebateSession[];
  loadDebateHistory: () => Promise<void>;
}

/**
 * Hook for managing collaborative AI debates
 */
export function useDebateChat(
  options: UseDebateChatOptions
): UseDebateChatReturn {
  const { appId, maxRounds = 3, onDebateComplete, onError } = options;

  // Local state
  const [status, setStatus] = useState<UseDebateChatReturn["status"]>("idle");
  const [error, setError] = useState<string | null>(null);
  const [consensus, setConsensus] = useState<DebateConsensus | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pendingInterjections, setPendingInterjections] = useState<DebateInterjection[]>([]);

  // Abort controller for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Store state and actions
  const debateState = useDebateState();
  const {
    setIsDebating,
    addDebateMessage,
    setDebateMessages,
    setCurrentSpeaker,
    setDebateCost,
    setDebateHistory,
    addDebateToHistory,
    setDebateMode,
    clearActiveDebate,
    setActiveDebate,
  } = useAppStore();

  /**
   * Start a new debate
   */
  const startDebate = useCallback(
    async (
      question: string,
      appState?: StartDebateRequest["currentAppState"]
    ) => {
      // Reset state
      setError(null);
      setConsensus(null);
      setStatus("starting");
      setIsDebating(true);
      setDebateMessages([]);
      setDebateCost(null);

      // Create abort controller
      abortControllerRef.current = new AbortController();

      // Build request
      const requestBody: StartDebateRequest = {
        appId,
        userQuestion: question,
        maxRounds,
        currentAppState: appState,
      };

      try {
        const response = await fetch("/api/ai-debate/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`Debate API error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";
        const messages: DebateMessage[] = [];
        let currentMessageContent = "";
        let currentModelId: DebateModelId | null = null;
        let currentTurnNumber = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const event: DebateStreamEvent = JSON.parse(line.slice(6));
                await handleStreamEvent(event);
              } catch (e) {
                console.warn("[useDebateChat] Failed to parse event:", e);
              }
            }
          }
        }

        // Process any remaining buffer
        if (buffer.startsWith("data: ")) {
          try {
            const event: DebateStreamEvent = JSON.parse(buffer.slice(6));
            await handleStreamEvent(event);
          } catch (e) {
            // Ignore incomplete event
          }
        }

        async function handleStreamEvent(event: DebateStreamEvent) {
          switch (event.type) {
            case "debate_start":
              setStatus("debating");
              setSessionId(event.sessionId);
              break;

            case "model_start":
              setCurrentSpeaker(event.modelId || null);
              currentModelId = event.modelId || null;
              currentTurnNumber = event.turnNumber || 0;
              currentMessageContent = "";
              break;

            case "model_chunk":
              if (event.content) {
                currentMessageContent += event.content;
              }
              break;

            case "model_complete":
              if (currentModelId && currentMessageContent) {
                const participant = DEFAULT_DEBATE_PARTICIPANTS.find(
                  (p) => p.modelId === currentModelId
                );
                const message: DebateMessage = {
                  id: `msg_${Date.now()}_${Math.random()
                    .toString(36)
                    .substr(2, 6)}`,
                  modelId: currentModelId,
                  modelDisplayName: participant?.displayName || currentModelId,
                  role: participant?.role || "strategic-architect",
                  content: currentMessageContent,
                  turnNumber: currentTurnNumber,
                  isAgreement: false, // Will be set by API
                  tokensUsed: { input: 0, output: 0 },
                  timestamp: new Date().toISOString(),
                };
                messages.push(message);
                addDebateMessage(message);
              }
              currentMessageContent = "";
              break;

            case "agreement_detected":
              // Could update UI to show agreement indicator
              break;

            case "synthesis_start":
              setStatus("synthesizing");
              setCurrentSpeaker(null);
              currentMessageContent = "";
              break;

            case "synthesis_complete":
              if (event.consensus) {
                setConsensus(event.consensus);
              }
              break;

            case "cost_update":
              if (event.cost) {
                setDebateCost(event.cost);
              }
              break;

            case "debate_complete":
              setStatus("complete");
              setIsDebating(false);
              setCurrentSpeaker(null);

              // Build complete session
              const session: DebateSession = {
                id: event.sessionId,
                appId,
                userQuestion: question,
                messages,
                participants: DEFAULT_DEBATE_PARTICIPANTS.map((p) => ({
                  modelId: p.modelId,
                  displayName: p.displayName,
                  role: p.role,
                })),
                status: "agreed",
                roundCount: Math.ceil(messages.length / 2),
                maxRounds,
                consensus: event.consensus,
                cost: event.cost || {
                  byModel: {} as DebateCost["byModel"],
                  totalInputTokens: 0,
                  totalOutputTokens: 0,
                  totalCost: 0,
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };

              setActiveDebate(session);
              addDebateToHistory(session);
              onDebateComplete?.(session);
              break;

            case "debate_error":
              const errorMessage = event.error?.message || "Unknown error";
              setError(errorMessage);
              setStatus("error");
              setIsDebating(false);
              onError?.(errorMessage);
              break;
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // User cancelled
          setStatus("idle");
        } else {
          const errorMessage =
            err instanceof Error ? err.message : "Unknown error";
          setError(errorMessage);
          setStatus("error");
          onError?.(errorMessage);
        }
        setIsDebating(false);
      }
    },
    [
      appId,
      maxRounds,
      onDebateComplete,
      onError,
      setIsDebating,
      addDebateMessage,
      setDebateMessages,
      setCurrentSpeaker,
      setDebateCost,
      setActiveDebate,
      addDebateToHistory,
    ]
  );

  /**
   * End the current debate early
   */
  const endDebate = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsDebating(false);
    setCurrentSpeaker(null);
    setStatus("complete");
  }, [setIsDebating, setCurrentSpeaker]);

  /**
   * Toggle debate mode (Ask Both AIs)
   */
  const toggleDebateMode = useCallback(() => {
    setDebateMode(!debateState.debateMode);
  }, [debateState.debateMode, setDebateMode]);

  /**
   * Clear the active debate
   */
  const clearDebate = useCallback(() => {
    clearActiveDebate();
    setStatus("idle");
    setError(null);
    setConsensus(null);
    setSessionId(null);
    setPendingInterjections([]);
  }, [clearActiveDebate]);

  /**
   * Submit a user interjection during the debate
   */
  const interject = useCallback(
    async (
      content: string,
      type: InterjectionType = "comment",
      targetMessageId?: string
    ): Promise<DebateInterjection | null> => {
      if (!sessionId) {
        console.warn("[useDebateChat] Cannot interject: no active session");
        return null;
      }

      try {
        const response = await fetch("/api/ai-debate/interject", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            content,
            interjectionType: type,
            targetMessageId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to submit interjection");
        }

        const data = await response.json();
        const interjection = data.interjection as DebateInterjection;

        // Add to pending interjections
        setPendingInterjections((prev) => [...prev, interjection]);

        return interjection;
      } catch (err) {
        console.error("[useDebateChat] Interjection failed:", err);
        return null;
      }
    },
    [sessionId]
  );

  /**
   * Challenge a specific message in the debate
   */
  const challenge = useCallback(
    async (
      messageId: string,
      reason: string
    ): Promise<DebateInterjection | null> => {
      return interject(reason, "challenge", messageId);
    },
    [interject]
  );

  /**
   * Load debate history for the current app
   */
  const loadDebateHistory = useCallback(async () => {
    // For now, debate history is stored in memory via Zustand
    // In the future, this could load from a database
    // setDebateHistoryLoading(true);
    // const history = await fetchDebateHistory(appId);
    // setDebateHistory(history);
    // setDebateHistoryLoading(false);
  }, []);

  return {
    // State
    isDebating: debateState.isDebating,
    messages: debateState.debateMessages,
    currentSpeaker: debateState.currentSpeaker,
    cost: debateState.debateCost,
    consensus,
    status,
    error,
    debateMode: debateState.debateMode,

    // Actions
    startDebate,
    endDebate,
    toggleDebateMode,
    clearDebate,

    // User Interjections
    interject,
    challenge,
    pendingInterjections,

    // History
    debateHistory: debateState.debateHistory,
    loadDebateHistory,
  };
}

export default useDebateChat;
