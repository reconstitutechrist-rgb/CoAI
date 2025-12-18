/**
 * Provider Registry
 *
 * Factory for creating AI provider instances and managing
 * cost aggregation across multiple providers in a debate session.
 *
 * @module ProviderRegistry
 */

import type { AIProvider } from "./AIProvider";
import { ClaudeOpusProvider, ClaudeSonnetProvider } from "./AnthropicProvider";
import { GPT5Provider, GPT4oProvider } from "./OpenAIProvider";
import { GeminiProProvider, GeminiUltraProvider } from "./GeminiProvider";

export type ProviderId =
  | "claude-opus-4"
  | "claude-sonnet-4"
  | "gpt-5"
  | "gpt-4o"
  | "gemini-pro"
  | "gemini-ultra";

/**
 * All available providers
 */
const providerClasses: Record<ProviderId, new () => AIProvider> = {
  "claude-opus-4": ClaudeOpusProvider,
  "claude-sonnet-4": ClaudeSonnetProvider,
  "gpt-5": GPT5Provider,
  "gpt-4o": GPT4oProvider,
  "gemini-pro": GeminiProProvider,
  "gemini-ultra": GeminiUltraProvider,
};

/**
 * Provider instances cache
 */
const providerInstances: Map<ProviderId, AIProvider> = new Map();

/**
 * Get a provider instance by ID
 */
export function getProvider(providerId: ProviderId): AIProvider {
  let instance = providerInstances.get(providerId);
  if (!instance) {
    const ProviderClass = providerClasses[providerId];
    if (!ProviderClass) {
      throw new Error(`Unknown provider ID: ${providerId}`);
    }
    instance = new ProviderClass();
    providerInstances.set(providerId, instance);
  }
  return instance;
}

/**
 * Get all available providers
 */
export function getAllProviders(): AIProvider[] {
  return Object.keys(providerClasses).map((id) =>
    getProvider(id as ProviderId)
  );
}

/**
 * Get all configured providers (with valid API keys)
 */
export function getConfiguredProviders(): AIProvider[] {
  return getAllProviders().filter((p) => p.isConfigured());
}

/**
 * Check if a specific provider is configured
 */
export function isProviderConfigured(providerId: ProviderId): boolean {
  return getProvider(providerId).isConfigured();
}

/**
 * Default debate participants
 */
export const DEFAULT_DEBATE_PROVIDERS: ProviderId[] = [
  "claude-opus-4",
  "gpt-5",
];

/**
 * Get debate providers (returns configured providers from defaults)
 */
export function getDebateProviders(): AIProvider[] {
  return DEFAULT_DEBATE_PROVIDERS.map((id) => getProvider(id)).filter((p) =>
    p.isConfigured()
  );
}

// ============================================================================
// COST TRACKING
// ============================================================================

export interface ProviderCost {
  providerId: ProviderId;
  displayName: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
}

export interface AggregatedCosts {
  providers: ProviderCost[];
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number;
}

/**
 * Cost aggregator for tracking multi-provider usage
 */
export class CostAggregator {
  private costs: Map<ProviderId, ProviderCost> = new Map();

  addUsage(
    providerId: ProviderId,
    inputTokens: number,
    outputTokens: number
  ): void {
    const provider = getProvider(providerId);
    const existing = this.costs.get(providerId);

    const newInputTokens = (existing?.inputTokens ?? 0) + inputTokens;
    const newOutputTokens = (existing?.outputTokens ?? 0) + outputTokens;
    const newTotalTokens = newInputTokens + newOutputTokens;
    const newCost = provider.calculateCost(newInputTokens, newOutputTokens);

    this.costs.set(providerId, {
      providerId,
      displayName: provider.displayName,
      inputTokens: newInputTokens,
      outputTokens: newOutputTokens,
      totalTokens: newTotalTokens,
      cost: newCost,
    });
  }

  getAggregate(): AggregatedCosts {
    const providers = Array.from(this.costs.values());
    const totalInputTokens = providers.reduce(
      (sum, p) => sum + p.inputTokens,
      0
    );
    const totalOutputTokens = providers.reduce(
      (sum, p) => sum + p.outputTokens,
      0
    );
    const totalTokens = totalInputTokens + totalOutputTokens;
    const totalCost = providers.reduce((sum, p) => sum + p.cost, 0);

    return {
      providers,
      totalInputTokens,
      totalOutputTokens,
      totalTokens,
      totalCost: Math.round(totalCost * 10000) / 10000,
    };
  }

  getCostForProvider(providerId: ProviderId): ProviderCost | undefined {
    return this.costs.get(providerId);
  }

  reset(): void {
    this.costs.clear();
  }
}

/**
 * Format cost as currency string
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }
  return `$${cost.toFixed(2)}`;
}
