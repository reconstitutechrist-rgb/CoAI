/**
 * AI Debate Streaming Route
 *
 * Orchestrates collaborative debates between AI models (Claude Opus 4.5 + GPT-5).
 * Models respond to user questions, then review and build on each other's suggestions
 * in a natural conversational flow until agreement is reached or user ends the debate.
 *
 * SSE Stream Events:
 * - debate_start: Debate session initialized
 * - model_start: A model is about to respond
 * - model_chunk: Streaming text chunk from a model
 * - model_complete: Model finished responding
 * - agreement_detected: Models have reached agreement
 * - synthesis_start: Generating final consensus
 * - synthesis_complete: Consensus ready
 * - cost_update: Updated cost information
 * - debate_complete: Debate finished
 * - debate_error: Error occurred
 */

import {
  getProvider,
  CostAggregator,
  type ProviderId,
} from "@/services/providers";
import type { MessageParam } from "@/services/providers/AIProvider";
import {
  DEFAULT_DEBATE_PARTICIPANTS,
  getParticipant,
  buildInitialDebatePrompt,
  buildOtherModelContext,
  buildSynthesisPrompt,
  buildStyledSystemPrompt,
  createParticipant,
} from "@/prompts/debatePersonas";
import {
  getPendingInterjections,
  acknowledgeInterjection,
  buildInterjectionContext,
} from "../interject/route";
import type {
  DebateMessage,
  DebateSession,
  DebateConsensus,
  DebateCost,
  DebateStreamEvent,
  DebateModelId,
  DebateStyle,
  DebateParticipant,
  StartDebateRequest,
  EndDebateRequest,
} from "@/types/aiCollaboration";
import { detectAgreement } from "@/types/aiCollaboration";

// Vercel serverless function config
export const maxDuration = 300;
export const dynamic = "force-dynamic";

// ============================================================================
// HELPERS
// ============================================================================

function generateId(): string {
  return `debate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function formatSSE(event: DebateStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function buildCostObject(aggregator: CostAggregator): DebateCost {
  const aggregate = aggregator.getAggregate();
  const byModel: DebateCost["byModel"] = {} as DebateCost["byModel"];

  for (const providerCost of aggregate.providers) {
    byModel[providerCost.providerId as DebateModelId] = {
      inputTokens: providerCost.inputTokens,
      outputTokens: providerCost.outputTokens,
      cost: providerCost.cost,
    };
  }

  return {
    byModel,
    totalInputTokens: aggregate.totalInputTokens,
    totalOutputTokens: aggregate.totalOutputTokens,
    totalCost: aggregate.totalCost,
  };
}

function buildAppContext(
  currentAppState?: StartDebateRequest["currentAppState"]
): string {
  if (!currentAppState?.files?.length) return "";

  return `
===CURRENT APP CONTEXT===
App Name: ${currentAppState.name || "Unnamed App"}
Files: ${currentAppState.files.map((f) => f.path).join(", ")}

FILE CONTENTS:
${currentAppState.files
  .slice(0, 5) // Limit to first 5 files to manage context size
  .map(
    (f) =>
      `--- ${f.path} ---\n${f.content.slice(0, 2000)}\n--- END ${f.path} ---`
  )
  .join("\n\n")}
===END CURRENT APP CONTEXT===`;
}

// ============================================================================
// MAIN ROUTE HANDLER
// ============================================================================

export async function POST(request: Request) {
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();
  let writerClosed = false;

  const writeEvent = async (event: DebateStreamEvent) => {
    if (!writerClosed) {
      try {
        await writer.write(encoder.encode(formatSSE(event)));
      } catch {
        writerClosed = true;
      }
    }
  };

  const closeWriter = async () => {
    if (!writerClosed) {
      writerClosed = true;
      try {
        await writer.close();
      } catch {
        // Already closed
      }
    }
  };

  // Run debate in background
  (async () => {
    const costAggregator = new CostAggregator();
    let sessionId = "";

    try {
      // Parse request
      const body: StartDebateRequest | EndDebateRequest = await request.json();

      // Handle end debate request
      if ("reason" in body && body.reason) {
        // This is an EndDebateRequest - we'd handle this differently
        // For now, we'll focus on StartDebateRequest
        await writeEvent({
          type: "debate_complete",
          timestamp: Date.now(),
          sessionId: (body as EndDebateRequest).sessionId,
        });
        await closeWriter();
        return;
      }

      // Start debate request
      const startRequest = body as StartDebateRequest;
      const {
        appId,
        userQuestion,
        maxRounds = 3,
        currentAppState,
        style = "cooperative",
        participants: customParticipants,
      } = startRequest;

      sessionId = generateId();

      // Build participants list - use custom if provided, otherwise default
      const participants: DebateParticipant[] = customParticipants?.length
        ? customParticipants.map((p) => {
            const participant = createParticipant(p.modelId, p.role);
            // Apply style modifier to system prompt
            return {
              ...participant,
              systemPrompt: buildStyledSystemPrompt(participant.systemPrompt, style),
            };
          })
        : DEFAULT_DEBATE_PARTICIPANTS.map((p) => ({
            ...p,
            systemPrompt: buildStyledSystemPrompt(p.systemPrompt, style),
          }));

      const messages: DebateMessage[] = [];
      let turnNumber = 0;

      // Track agreements per model for multi-party consensus
      const modelAgreements = new Map<DebateModelId, boolean>();
      participants.forEach((p) => modelAgreements.set(p.modelId, false));

      // For panel mode, we need more agreements
      const isPanelMode = participants.length > 2;
      const agreementThreshold = isPanelMode
        ? Math.ceil(participants.length * 0.75) // 75% of models must agree
        : 2; // Both models for standard debates

      // Send debate start event
      await writeEvent({
        type: "debate_start",
        timestamp: Date.now(),
        sessionId,
      });

      // Build app context
      const appContext = buildAppContext(currentAppState);

      // ========================================================================
      // ROUND 1: Initial parallel responses from both models
      // ========================================================================

      const initialPrompt = buildInitialDebatePrompt(userQuestion, appContext);

      // Get responses from both models (could be parallelized, but sequential for streaming)
      for (const participant of participants) {
        const provider = getProvider(participant.modelId as ProviderId);

        if (!provider.isConfigured()) {
          await writeEvent({
            type: "debate_error",
            timestamp: Date.now(),
            sessionId,
            error: {
              code: "PROVIDER_NOT_CONFIGURED",
              message: `${participant.displayName} is not configured. Please add the API key.`,
            },
          });
          continue;
        }

        // Signal model starting
        await writeEvent({
          type: "model_start",
          timestamp: Date.now(),
          sessionId,
          modelId: participant.modelId,
          modelDisplayName: participant.displayName,
          turnNumber,
        });

        // Build messages for this model
        const modelMessages: MessageParam[] = [
          { role: "system", content: participant.systemPrompt },
          { role: "user", content: initialPrompt },
        ];

        // Stream response
        let fullContent = "";
        let inputTokens = 0;
        let outputTokens = 0;

        try {
          for await (const chunk of provider.stream(modelMessages, {
            maxTokens: 4096,
            temperature: 0.7,
          })) {
            if (chunk.type === "text") {
              fullContent += chunk.content;
              await writeEvent({
                type: "model_chunk",
                timestamp: Date.now(),
                sessionId,
                modelId: participant.modelId,
                content: chunk.content,
              });
            } else if (chunk.type === "done" && chunk.tokensUsed) {
              outputTokens = chunk.tokensUsed;
            }
          }

          // Estimate input tokens (rough)
          inputTokens = Math.ceil(
            (participant.systemPrompt.length + initialPrompt.length) / 4
          );

          // Update costs
          costAggregator.addUsage(
            participant.modelId as ProviderId,
            inputTokens,
            outputTokens
          );

          // Check for agreement
          const isAgreement = detectAgreement(fullContent);
          if (isAgreement) {
            modelAgreements.set(participant.modelId, true);
          }

          // Store message
          const debateMessage: DebateMessage = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            modelId: participant.modelId,
            modelDisplayName: participant.displayName,
            role: participant.role,
            content: fullContent,
            turnNumber,
            isAgreement,
            tokensUsed: { input: inputTokens, output: outputTokens },
            timestamp: new Date().toISOString(),
          };
          messages.push(debateMessage);

          // Signal model complete
          await writeEvent({
            type: "model_complete",
            timestamp: Date.now(),
            sessionId,
            modelId: participant.modelId,
            turnNumber,
          });

          // Send cost update
          await writeEvent({
            type: "cost_update",
            timestamp: Date.now(),
            sessionId,
            cost: buildCostObject(costAggregator),
          });
        } catch (error) {
          console.error(
            `[Debate] Error from ${participant.displayName}:`,
            error
          );
          await writeEvent({
            type: "debate_error",
            timestamp: Date.now(),
            sessionId,
            error: {
              code: "MODEL_ERROR",
              message: `${participant.displayName} encountered an error: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
            },
          });
        }
      }

      turnNumber++;

      // ========================================================================
      // ROUNDS 2+: Models review and respond to each other
      // ========================================================================

      // Helper to count agreements
      const countAgreements = () =>
        Array.from(modelAgreements.values()).filter(Boolean).length;

      for (let round = 1; round < maxRounds && countAgreements() < agreementThreshold; round++) {
        for (let i = 0; i < participants.length; i++) {
          const participant = participants[i];

          // For panel mode, respond to ALL other participants, not just one
          // For standard mode, respond to the single other participant
          const otherParticipants = participants.filter(
            (p) => p.modelId !== participant.modelId
          );

          // Get recent messages from other participants
          const recentOtherMessages = otherParticipants.map((other) => {
            const msgs = messages.filter((m) => m.modelId === other.modelId);
            return msgs[msgs.length - 1];
          }).filter(Boolean);

          if (recentOtherMessages.length === 0) continue;

          const provider = getProvider(participant.modelId as ProviderId);

          // Check for pending user interjections
          const pendingInterjections = getPendingInterjections(sessionId);
          const interjectionContext = buildInterjectionContext(pendingInterjections);

          // Signal model starting
          await writeEvent({
            type: "model_start",
            timestamp: Date.now(),
            sessionId,
            modelId: participant.modelId,
            modelDisplayName: participant.displayName,
            turnNumber,
          });

          // Build conversation history for this model
          const conversationHistory: MessageParam[] = [
            { role: "system", content: participant.systemPrompt },
            {
              role: "user",
              content: buildInitialDebatePrompt(userQuestion, appContext),
            },
          ];

          // Add all previous messages as context
          for (const msg of messages) {
            if (msg.modelId === participant.modelId) {
              conversationHistory.push({
                role: "assistant",
                content: msg.content,
              });
            } else {
              // Format other model's message as user input
              const context = buildOtherModelContext(
                msg.modelDisplayName,
                msg.role.replace("-", " "),
                msg.content
              );
              conversationHistory.push({ role: "user", content: context });
            }
          }

          // Build response prompt based on mode
          let responsePrompt: string;
          if (isPanelMode) {
            const otherNames = otherParticipants.map((p) => p.displayName).join(", ");
            responsePrompt = `Please review and respond to the perspectives shared by the other panelists (${otherNames}). Consider all viewpoints, build on good ideas, offer improvements, or signal agreement where you're aligned.`;
          } else {
            const otherParticipant = otherParticipants[0];
            responsePrompt = `Please review and respond to the above input from ${otherParticipant.displayName}. Build on good ideas, offer improvements, or signal agreement if you're aligned.`;
          }

          // Add interjection context if any
          if (interjectionContext) {
            responsePrompt = interjectionContext + "\n\n" + responsePrompt;
            // Mark interjections as acknowledged by this model
            for (const interjection of pendingInterjections) {
              acknowledgeInterjection(sessionId, interjection.id, participant.modelId);
            }
          }

          conversationHistory.push({
            role: "user",
            content: responsePrompt,
          });

          // Stream response
          let fullContent = "";
          let inputTokens = 0;
          let outputTokens = 0;

          try {
            for await (const chunk of provider.stream(conversationHistory, {
              maxTokens: 3072,
              temperature: 0.7,
            })) {
              if (chunk.type === "text") {
                fullContent += chunk.content;
                await writeEvent({
                  type: "model_chunk",
                  timestamp: Date.now(),
                  sessionId,
                  modelId: participant.modelId,
                  content: chunk.content,
                });
              } else if (chunk.type === "done" && chunk.tokensUsed) {
                outputTokens = chunk.tokensUsed;
              }
            }

            // Estimate input tokens
            inputTokens = Math.ceil(
              conversationHistory.reduce(
                (sum, m) => sum + m.content.length,
                0
              ) / 4
            );

            // Update costs
            costAggregator.addUsage(
              participant.modelId as ProviderId,
              inputTokens,
              outputTokens
            );

            // Check for agreement
            const isAgreement = detectAgreement(fullContent);
            if (isAgreement) {
              modelAgreements.set(participant.modelId, true);

              // Check if we've reached consensus threshold
              const currentAgreementCount = countAgreements();
              if (currentAgreementCount >= agreementThreshold) {
                const agreementReason = isPanelMode
                  ? `${currentAgreementCount} of ${participants.length} panelists have reached consensus`
                  : "Both models expressed agreement";
                await writeEvent({
                  type: "agreement_detected",
                  timestamp: Date.now(),
                  sessionId,
                  agreementDetected: true,
                  agreementReason,
                });
              }
            }

            // Store message
            const debateMessage: DebateMessage = {
              id: `msg_${Date.now()}_${Math.random()
                .toString(36)
                .substr(2, 6)}`,
              modelId: participant.modelId,
              modelDisplayName: participant.displayName,
              role: participant.role,
              content: fullContent,
              turnNumber,
              isAgreement,
              tokensUsed: { input: inputTokens, output: outputTokens },
              timestamp: new Date().toISOString(),
            };
            messages.push(debateMessage);

            // Signal model complete
            await writeEvent({
              type: "model_complete",
              timestamp: Date.now(),
              sessionId,
              modelId: participant.modelId,
              turnNumber,
            });

            // Send cost update
            await writeEvent({
              type: "cost_update",
              timestamp: Date.now(),
              sessionId,
              cost: buildCostObject(costAggregator),
            });

            turnNumber++;
          } catch (error) {
            console.error(
              `[Debate] Error from ${participant.displayName}:`,
              error
            );
          }

          // Check if we've reached consensus
          if (countAgreements() >= agreementThreshold) break;
        }
      }

      // ========================================================================
      // SYNTHESIS: Generate final consensus
      // ========================================================================

      await writeEvent({
        type: "synthesis_start",
        timestamp: Date.now(),
        sessionId,
      });

      // Use the first participant to synthesize (Claude)
      const synthesizer = participants[0];
      const synthProvider = getProvider(synthesizer.modelId as ProviderId);

      const debateHistory = messages.map((m) => ({
        modelName: m.modelDisplayName,
        role: m.role.replace("-", " "),
        content: m.content,
      }));

      const synthesisPrompt = buildSynthesisPrompt(userQuestion, debateHistory);

      let consensusSummary = "";
      let synthInputTokens = 0;
      let synthOutputTokens = 0;

      try {
        const synthMessages: MessageParam[] = [
          { role: "system", content: synthesizer.systemPrompt },
          { role: "user", content: synthesisPrompt },
        ];

        for await (const chunk of synthProvider.stream(synthMessages, {
          maxTokens: 4096,
          temperature: 0.5, // Lower temperature for synthesis
        })) {
          if (chunk.type === "text") {
            consensusSummary += chunk.content;
            await writeEvent({
              type: "model_chunk",
              timestamp: Date.now(),
              sessionId,
              modelId: synthesizer.modelId,
              content: chunk.content,
            });
          } else if (chunk.type === "done" && chunk.tokensUsed) {
            synthOutputTokens = chunk.tokensUsed;
          }
        }

        synthInputTokens = Math.ceil(synthesisPrompt.length / 4);
        costAggregator.addUsage(
          synthesizer.modelId as ProviderId,
          synthInputTokens,
          synthOutputTokens
        );
      } catch (error) {
        console.error("[Debate] Synthesis error:", error);
        consensusSummary =
          "Unable to generate synthesis. Please review the discussion above.";
      }

      // Build consensus object
      const consensus: DebateConsensus = {
        summary: consensusSummary,
        actionItems: [], // Could parse from summary in future
        keyDecisions: [],
        implementable: true,
      };

      // Send synthesis complete
      await writeEvent({
        type: "synthesis_complete",
        timestamp: Date.now(),
        sessionId,
        consensus,
      });

      // Final cost update
      await writeEvent({
        type: "cost_update",
        timestamp: Date.now(),
        sessionId,
        cost: buildCostObject(costAggregator),
      });

      // Send debate complete
      await writeEvent({
        type: "debate_complete",
        timestamp: Date.now(),
        sessionId,
        consensus,
        cost: buildCostObject(costAggregator),
      });

      await closeWriter();
    } catch (error) {
      console.error("[Debate] Fatal error:", error);
      await writeEvent({
        type: "debate_error",
        timestamp: Date.now(),
        sessionId,
        error: {
          code: "FATAL_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      });
      await closeWriter();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
