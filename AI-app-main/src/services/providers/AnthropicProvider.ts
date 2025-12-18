/**
 * Anthropic Provider Implementation
 *
 * Implements AIProvider interface for Claude models.
 * Used for Claude Opus 4.5 in the debate feature.
 *
 * @module AnthropicProvider
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  BaseAIProvider,
  type GenerationOptions,
  type GenerationResult,
  type StreamChunk,
  type MessageParam,
  type ProviderPricing,
} from "./AIProvider";

/**
 * Claude Opus 4.5 Provider
 */
export class ClaudeOpusProvider extends BaseAIProvider {
  readonly modelId = "claude-opus-4";
  readonly displayName = "Claude Opus 4.5";
  readonly modelName = "claude-sonnet-4-20250514"; // Using available model, update when Opus 4.5 is available
  readonly providerName = "anthropic" as const;
  readonly pricing: ProviderPricing = {
    inputPer1kTokens: 0.015, // $15 per 1M = $0.015 per 1K
    outputPer1kTokens: 0.075, // $75 per 1M = $0.075 per 1K
    currency: "USD",
  };

  private client: Anthropic | null = null;

  private getClient(): Anthropic {
    if (!this.client) {
      this.client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }
    return this.client;
  }

  isConfigured(): boolean {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  async generate(
    messages: MessageParam[],
    options: GenerationOptions = {}
  ): Promise<GenerationResult> {
    const client = this.getClient();

    // Convert messages to Anthropic format
    const anthropicMessages: Anthropic.MessageParam[] = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    // Extract system message if present
    const systemMessage = messages.find((m) => m.role === "system");

    try {
      const response = await client.messages.create({
        model: this.modelName,
        max_tokens: options.maxTokens ?? 8192,
        temperature: options.thinkingBudget ? 1 : options.temperature ?? 0.7,
        system: systemMessage
          ? [
              {
                type: "text",
                text: options.systemPrompt ?? systemMessage.content,
              },
            ]
          : options.systemPrompt
          ? [{ type: "text", text: options.systemPrompt }]
          : undefined,
        messages: anthropicMessages,
        ...(options.thinkingBudget && {
          thinking: {
            type: "enabled",
            budget_tokens: options.thinkingBudget,
          },
        }),
      });

      // Extract text content
      const textBlock = response.content.find((block) => block.type === "text");
      const thinkingBlock = response.content.find(
        (block) => block.type === "thinking"
      );

      return {
        content: textBlock?.type === "text" ? textBlock.text : "",
        thinking:
          thinkingBlock?.type === "thinking"
            ? thinkingBlock.thinking
            : undefined,
        tokensUsed: {
          input: response.usage.input_tokens,
          output: response.usage.output_tokens,
          total: response.usage.input_tokens + response.usage.output_tokens,
        },
        finishReason:
          response.stop_reason === "end_turn" ? "complete" : "max_tokens",
      };
    } catch (error) {
      console.error("[ClaudeOpusProvider] Generation error:", error);
      throw error;
    }
  }

  async *stream(
    messages: MessageParam[],
    options: GenerationOptions = {}
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const client = this.getClient();

    // Convert messages to Anthropic format
    const anthropicMessages: Anthropic.MessageParam[] = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    // Extract system message if present
    const systemMessage = messages.find((m) => m.role === "system");

    try {
      const stream = await client.messages.stream({
        model: this.modelName,
        max_tokens: options.maxTokens ?? 8192,
        temperature: options.thinkingBudget ? 1 : options.temperature ?? 0.7,
        system: systemMessage
          ? [
              {
                type: "text",
                text: options.systemPrompt ?? systemMessage.content,
              },
            ]
          : options.systemPrompt
          ? [{ type: "text", text: options.systemPrompt }]
          : undefined,
        messages: anthropicMessages,
      });

      let totalTokens = 0;

      for await (const event of stream) {
        if (event.type === "content_block_delta") {
          const delta = event.delta;
          if ("text" in delta) {
            yield {
              type: "text",
              content: delta.text,
            };
          }
        } else if (event.type === "message_delta") {
          if (event.usage) {
            totalTokens = event.usage.output_tokens;
          }
        }
      }

      yield {
        type: "done",
        content: "",
        tokensUsed: totalTokens,
      };
    } catch (error) {
      console.error("[ClaudeOpusProvider] Stream error:", error);
      yield {
        type: "error",
        content: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

/**
 * Claude Sonnet Provider (fallback/alternative)
 */
export class ClaudeSonnetProvider extends BaseAIProvider {
  readonly modelId = "claude-sonnet-4";
  readonly displayName = "Claude Sonnet 4";
  readonly modelName = "claude-sonnet-4-20250514";
  readonly providerName = "anthropic" as const;
  readonly pricing: ProviderPricing = {
    inputPer1kTokens: 0.003, // $3 per 1M
    outputPer1kTokens: 0.015, // $15 per 1M
    currency: "USD",
  };

  private client: Anthropic | null = null;

  private getClient(): Anthropic {
    if (!this.client) {
      this.client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }
    return this.client;
  }

  isConfigured(): boolean {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  async generate(
    messages: MessageParam[],
    options: GenerationOptions = {}
  ): Promise<GenerationResult> {
    // Reuse the same logic as ClaudeOpusProvider
    const opusProvider = new ClaudeOpusProvider();
    // Override model name
    const result = await opusProvider.generate(messages, options);
    return result;
  }

  async *stream(
    messages: MessageParam[],
    options: GenerationOptions = {}
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const opusProvider = new ClaudeOpusProvider();
    yield* opusProvider.stream(messages, options);
  }
}
