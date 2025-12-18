/**
 * AI Provider Interface
 *
 * Abstract interface for AI model providers (Anthropic, OpenAI, etc.)
 * Enables the collaborative debate feature to work with multiple models.
 *
 * @module AIProvider
 */

export interface GenerationOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  thinkingBudget?: number;
  signal?: AbortSignal;
}

export interface StreamChunk {
  type: "text" | "thinking" | "error" | "done";
  content: string;
  tokensUsed?: number;
}

export interface GenerationResult {
  content: string;
  thinking?: string;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  finishReason: "complete" | "max_tokens" | "error";
}

export interface ProviderPricing {
  inputPer1kTokens: number;
  outputPer1kTokens: number;
  currency: "USD";
}

export interface MessageParam {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Base interface for all AI providers
 */
export interface AIProvider {
  /** Unique identifier for this provider/model combo */
  readonly modelId: string;

  /** Human-readable display name */
  readonly displayName: string;

  /** Model name used in API calls */
  readonly modelName: string;

  /** Provider name (anthropic, openai, google) */
  readonly providerName: "anthropic" | "openai" | "google";

  /** Pricing info for cost tracking */
  readonly pricing: ProviderPricing;

  /**
   * Generate a complete response (non-streaming)
   */
  generate(
    messages: MessageParam[],
    options?: GenerationOptions
  ): Promise<GenerationResult>;

  /**
   * Stream a response chunk by chunk
   */
  stream(
    messages: MessageParam[],
    options?: GenerationOptions
  ): AsyncGenerator<StreamChunk, void, unknown>;

  /**
   * Calculate cost for a given token count
   */
  calculateCost(inputTokens: number, outputTokens: number): number;

  /**
   * Check if this provider is properly configured (API key exists)
   */
  isConfigured(): boolean;
}

/**
 * Base class with common functionality
 */
export abstract class BaseAIProvider implements AIProvider {
  abstract readonly modelId: string;
  abstract readonly displayName: string;
  abstract readonly modelName: string;
  abstract readonly providerName: "anthropic" | "openai" | "google";
  abstract readonly pricing: ProviderPricing;

  abstract generate(
    messages: MessageParam[],
    options?: GenerationOptions
  ): Promise<GenerationResult>;

  abstract stream(
    messages: MessageParam[],
    options?: GenerationOptions
  ): AsyncGenerator<StreamChunk, void, unknown>;

  abstract isConfigured(): boolean;

  calculateCost(inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1000) * this.pricing.inputPer1kTokens;
    const outputCost = (outputTokens / 1000) * this.pricing.outputPer1kTokens;
    return Math.round((inputCost + outputCost) * 10000) / 10000; // Round to 4 decimal places
  }
}

/**
 * Persona configuration for debate participants
 */
export interface DebatePersona {
  modelId: string;
  role: "strategic-architect" | "implementation-specialist";
  displayName: string;
  systemPrompt: string;
  color: string; // For UI badge
}
