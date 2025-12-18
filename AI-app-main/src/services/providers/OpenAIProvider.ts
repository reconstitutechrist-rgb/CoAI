/**
 * OpenAI Provider Implementation
 *
 * Implements AIProvider interface for OpenAI models.
 * Used for GPT-5 in the debate feature.
 *
 * @module OpenAIProvider
 */

import OpenAI from "openai";
import {
  BaseAIProvider,
  type GenerationOptions,
  type GenerationResult,
  type StreamChunk,
  type MessageParam,
  type ProviderPricing,
} from "./AIProvider";

/**
 * GPT-5 Provider
 */
export class GPT5Provider extends BaseAIProvider {
  readonly modelId = "gpt-5";
  readonly displayName = "GPT-5";
  readonly modelName = "gpt-4o"; // Using available model, update to gpt-5 when available
  readonly providerName = "openai" as const;
  readonly pricing: ProviderPricing = {
    inputPer1kTokens: 0.005, // $5 per 1M
    outputPer1kTokens: 0.015, // $15 per 1M
    currency: "USD",
  };

  private client: OpenAI | null = null;

  private getClient(): OpenAI {
    if (!this.client) {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    return this.client;
  }

  isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  async generate(
    messages: MessageParam[],
    options: GenerationOptions = {}
  ): Promise<GenerationResult> {
    const client = this.getClient();

    // Convert messages to OpenAI format
    const openaiMessages: OpenAI.ChatCompletionMessageParam[] = messages.map(
      (m) => {
        if (m.role === "system") {
          return { role: "system" as const, content: m.content };
        } else if (m.role === "assistant") {
          return { role: "assistant" as const, content: m.content };
        } else {
          return { role: "user" as const, content: m.content };
        }
      }
    );

    // Add system prompt if provided and not already in messages
    if (options.systemPrompt && !messages.some((m) => m.role === "system")) {
      openaiMessages.unshift({
        role: "system",
        content: options.systemPrompt,
      });
    }

    try {
      const response = await client.chat.completions.create({
        model: this.modelName,
        max_tokens: options.maxTokens ?? 8192,
        temperature: options.temperature ?? 0.7,
        messages: openaiMessages,
      });

      const choice = response.choices[0];
      const usage = response.usage;

      return {
        content: choice.message.content ?? "",
        tokensUsed: {
          input: usage?.prompt_tokens ?? 0,
          output: usage?.completion_tokens ?? 0,
          total: usage?.total_tokens ?? 0,
        },
        finishReason:
          choice.finish_reason === "stop" ? "complete" : "max_tokens",
      };
    } catch (error) {
      console.error("[GPT5Provider] Generation error:", error);
      throw error;
    }
  }

  async *stream(
    messages: MessageParam[],
    options: GenerationOptions = {}
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const client = this.getClient();

    // Convert messages to OpenAI format
    const openaiMessages: OpenAI.ChatCompletionMessageParam[] = messages.map(
      (m) => {
        if (m.role === "system") {
          return { role: "system" as const, content: m.content };
        } else if (m.role === "assistant") {
          return { role: "assistant" as const, content: m.content };
        } else {
          return { role: "user" as const, content: m.content };
        }
      }
    );

    // Add system prompt if provided
    if (options.systemPrompt && !messages.some((m) => m.role === "system")) {
      openaiMessages.unshift({
        role: "system",
        content: options.systemPrompt,
      });
    }

    try {
      const stream = await client.chat.completions.create({
        model: this.modelName,
        max_tokens: options.maxTokens ?? 8192,
        temperature: options.temperature ?? 0.7,
        messages: openaiMessages,
        stream: true,
        stream_options: { include_usage: true },
      });

      let totalTokens = 0;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          yield {
            type: "text",
            content: delta.content,
          };
        }

        // Capture usage from final chunk
        if (chunk.usage) {
          totalTokens = chunk.usage.total_tokens;
        }
      }

      yield {
        type: "done",
        content: "",
        tokensUsed: totalTokens,
      };
    } catch (error) {
      console.error("[GPT5Provider] Stream error:", error);
      yield {
        type: "error",
        content: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

/**
 * GPT-4o Provider (current fallback)
 */
export class GPT4oProvider extends BaseAIProvider {
  readonly modelId = "gpt-4o";
  readonly displayName = "GPT-4o";
  readonly modelName = "gpt-4o";
  readonly providerName = "openai" as const;
  readonly pricing: ProviderPricing = {
    inputPer1kTokens: 0.0025, // $2.50 per 1M
    outputPer1kTokens: 0.01, // $10 per 1M
    currency: "USD",
  };

  private client: OpenAI | null = null;

  private getClient(): OpenAI {
    if (!this.client) {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    return this.client;
  }

  isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  async generate(
    messages: MessageParam[],
    options: GenerationOptions = {}
  ): Promise<GenerationResult> {
    const gpt5Provider = new GPT5Provider();
    return gpt5Provider.generate(messages, options);
  }

  async *stream(
    messages: MessageParam[],
    options: GenerationOptions = {}
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const gpt5Provider = new GPT5Provider();
    yield* gpt5Provider.stream(messages, options);
  }
}
