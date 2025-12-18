/**
 * Google Gemini Provider Implementation
 *
 * Implements AIProvider interface for Gemini models.
 * Used for Gemini Pro and Ultra in the debate feature.
 *
 * @module GeminiProvider
 */

import {
  GoogleGenerativeAI,
  type GenerativeModel,
  type Content,
} from "@google/generative-ai";
import {
  BaseAIProvider,
  type GenerationOptions,
  type GenerationResult,
  type StreamChunk,
  type MessageParam,
  type ProviderPricing,
} from "./AIProvider";

/**
 * Gemini Pro Provider
 */
export class GeminiProProvider extends BaseAIProvider {
  readonly modelId = "gemini-pro";
  readonly displayName = "Gemini Pro";
  readonly modelName = "gemini-1.5-pro";
  readonly providerName = "google" as const;
  readonly pricing: ProviderPricing = {
    inputPer1kTokens: 0.00125, // $1.25 per 1M = $0.00125 per 1K
    outputPer1kTokens: 0.005, // $5 per 1M = $0.005 per 1K
    currency: "USD",
  };

  private client: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;

  private getClient(): GoogleGenerativeAI {
    if (!this.client) {
      const apiKey = process.env.GOOGLE_AI_API_KEY;
      if (!apiKey) {
        throw new Error("GOOGLE_AI_API_KEY is not configured");
      }
      this.client = new GoogleGenerativeAI(apiKey);
    }
    return this.client;
  }

  private getModel(systemInstruction?: string): GenerativeModel {
    const client = this.getClient();
    return client.getGenerativeModel({
      model: this.modelName,
      ...(systemInstruction && { systemInstruction }),
    });
  }

  isConfigured(): boolean {
    return !!process.env.GOOGLE_AI_API_KEY;
  }

  /**
   * Convert our message format to Gemini format
   */
  private convertMessages(messages: MessageParam[]): {
    history: Content[];
    systemInstruction?: string;
  } {
    const systemMessage = messages.find((m) => m.role === "system");
    const conversationMessages = messages.filter((m) => m.role !== "system");

    const history: Content[] = conversationMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    return {
      history: history.slice(0, -1), // All but last message
      systemInstruction: systemMessage?.content,
    };
  }

  async generate(
    messages: MessageParam[],
    options: GenerationOptions = {}
  ): Promise<GenerationResult> {
    const { history, systemInstruction } = this.convertMessages(messages);
    const model = this.getModel(options.systemPrompt ?? systemInstruction);

    // Get the last user message
    const lastMessage = messages.filter((m) => m.role !== "system").pop();
    if (!lastMessage) {
      throw new Error("No user message provided");
    }

    try {
      const chat = model.startChat({
        history,
        generationConfig: {
          maxOutputTokens: options.maxTokens ?? 8192,
          temperature: options.temperature ?? 0.7,
        },
      });

      const result = await chat.sendMessage(lastMessage.content);
      const response = result.response;
      const text = response.text();

      // Gemini provides usage metadata
      const usageMetadata = response.usageMetadata;

      return {
        content: text,
        tokensUsed: {
          input: usageMetadata?.promptTokenCount ?? 0,
          output: usageMetadata?.candidatesTokenCount ?? 0,
          total: usageMetadata?.totalTokenCount ?? 0,
        },
        finishReason: "complete",
      };
    } catch (error) {
      console.error("[GeminiProProvider] Generation error:", error);
      throw error;
    }
  }

  async *stream(
    messages: MessageParam[],
    options: GenerationOptions = {}
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const { history, systemInstruction } = this.convertMessages(messages);
    const model = this.getModel(options.systemPrompt ?? systemInstruction);

    // Get the last user message
    const lastMessage = messages.filter((m) => m.role !== "system").pop();
    if (!lastMessage) {
      yield {
        type: "error",
        content: "No user message provided",
      };
      return;
    }

    try {
      const chat = model.startChat({
        history,
        generationConfig: {
          maxOutputTokens: options.maxTokens ?? 8192,
          temperature: options.temperature ?? 0.7,
        },
      });

      const result = await chat.sendMessageStream(lastMessage.content);

      let totalOutputTokens = 0;

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield {
            type: "text",
            content: text,
          };
        }

        // Track token usage from the chunk if available
        if (chunk.usageMetadata?.candidatesTokenCount) {
          totalOutputTokens = chunk.usageMetadata.candidatesTokenCount;
        }
      }

      yield {
        type: "done",
        content: "",
        tokensUsed: totalOutputTokens,
      };
    } catch (error) {
      console.error("[GeminiProProvider] Stream error:", error);
      yield {
        type: "error",
        content: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

/**
 * Gemini Ultra Provider (higher capability, higher cost)
 */
export class GeminiUltraProvider extends BaseAIProvider {
  readonly modelId = "gemini-ultra";
  readonly displayName = "Gemini Ultra";
  readonly modelName = "gemini-1.5-pro"; // Using Pro as Ultra may have different availability
  readonly providerName = "google" as const;
  readonly pricing: ProviderPricing = {
    inputPer1kTokens: 0.00125,
    outputPer1kTokens: 0.005,
    currency: "USD",
  };

  private proProvider: GeminiProProvider;

  constructor() {
    super();
    this.proProvider = new GeminiProProvider();
  }

  isConfigured(): boolean {
    return this.proProvider.isConfigured();
  }

  async generate(
    messages: MessageParam[],
    options: GenerationOptions = {}
  ): Promise<GenerationResult> {
    return this.proProvider.generate(messages, options);
  }

  async *stream(
    messages: MessageParam[],
    options: GenerationOptions = {}
  ): AsyncGenerator<StreamChunk, void, unknown> {
    yield* this.proProvider.stream(messages, options);
  }
}
