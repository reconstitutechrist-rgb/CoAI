/**
 * Debate Template Service
 *
 * Manages debate templates - predefined configurations for common debate scenarios.
 * Templates define participants, styles, prompts, and other settings.
 */

import type {
  DebateTemplate,
  DebateStyle,
  DebateModelId,
  DebateRole,
  DebateParticipant,
} from "@/types/aiCollaboration";
import { createParticipant } from "@/prompts/debatePersonas";

// ============================================================================
// BUILT-IN TEMPLATES
// ============================================================================

export const BUILT_IN_TEMPLATES: DebateTemplate[] = [
  {
    id: "template_code_review",
    name: "Code Review",
    description:
      "Two perspectives reviewing code: one focused on quality/maintainability, one on performance/security.",
    templateType: "code_review",
    defaultStyle: "cooperative",
    defaultMaxRounds: 3,
    defaultParticipants: [
      { modelId: "claude-opus-4", role: "code-quality-expert" },
      { modelId: "gpt-5", role: "security-analyst" },
    ],
    systemPromptOverrides: {
      "claude-opus-4":
        "You are a code quality expert. Focus on readability, maintainability, SOLID principles, and best practices. Look for code smells and suggest refactoring opportunities.",
      "gpt-5":
        "You are a security and performance analyst. Focus on potential vulnerabilities, performance bottlenecks, and edge cases. Suggest hardening measures.",
    },
    useCount: 0,
    isPublic: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "template_architecture_decision",
    name: "Architecture Decision",
    description:
      "Panel discussion for major architectural decisions with multiple perspectives.",
    templateType: "architecture",
    defaultStyle: "panel",
    defaultMaxRounds: 4,
    defaultParticipants: [
      { modelId: "claude-opus-4", role: "strategic-architect" },
      { modelId: "gpt-5", role: "practical-evaluator" },
      { modelId: "gemini-pro", role: "innovation-catalyst" },
    ],
    systemPromptOverrides: {},
    useCount: 0,
    isPublic: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "template_brainstorming",
    name: "Brainstorming",
    description:
      "Generate diverse ideas with a creative thinker and a practical evaluator.",
    templateType: "brainstorming",
    defaultStyle: "cooperative",
    defaultMaxRounds: 5,
    defaultParticipants: [
      { modelId: "claude-opus-4", role: "creative-thinker" },
      { modelId: "gpt-5", role: "practical-evaluator" },
    ],
    systemPromptOverrides: {
      "claude-opus-4":
        "You are a creative brainstormer. Generate innovative, unconventional ideas. Think outside the box. Build on ideas expansively before narrowing down.",
      "gpt-5":
        "You are a practical evaluator. Assess feasibility, identify implementation challenges, and suggest how to make creative ideas actionable. Be supportive while grounding ideas in reality.",
    },
    useCount: 0,
    isPublic: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "template_devils_advocate",
    name: "Devil's Advocate",
    description:
      "Stress-test ideas with rigorous criticism and defense.",
    templateType: "devils_advocate",
    defaultStyle: "adversarial",
    defaultMaxRounds: 4,
    defaultParticipants: [
      { modelId: "claude-opus-4", role: "proposer" },
      { modelId: "gpt-5", role: "devils-advocate" },
    ],
    systemPromptOverrides: {
      "claude-opus-4":
        "You are the proposer defending an idea or approach. Present your position clearly and defend it against criticism. Acknowledge valid points while explaining why your approach is still sound.",
      "gpt-5":
        "You are the devil's advocate. Challenge every assumption. Find weaknesses, edge cases, and potential failures. Be thorough but constructive - your goal is to strengthen the idea, not destroy it.",
    },
    useCount: 0,
    isPublic: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "template_red_team",
    name: "Security Red Team",
    description:
      "Find vulnerabilities and security issues through adversarial analysis.",
    templateType: "red_team",
    defaultStyle: "red_team",
    defaultMaxRounds: 4,
    defaultParticipants: [
      { modelId: "claude-opus-4", role: "security-analyst" },
      { modelId: "gpt-5", role: "implementation-specialist" },
    ],
    systemPromptOverrides: {
      "claude-opus-4":
        "You are a security red teamer. Your job is to find vulnerabilities, attack vectors, and security weaknesses. Think like a malicious attacker. Identify what could go wrong.",
      "gpt-5":
        "You are a security engineer. Respond to identified vulnerabilities with mitigation strategies, patches, and security improvements. Prioritize fixes by severity.",
    },
    useCount: 0,
    isPublic: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "template_ux_review",
    name: "UX Review",
    description:
      "Evaluate user experience from technical and user-centric perspectives.",
    templateType: "ux_review",
    defaultStyle: "cooperative",
    defaultMaxRounds: 3,
    defaultParticipants: [
      { modelId: "claude-opus-4", role: "ux-advocate" },
      { modelId: "gpt-5", role: "implementation-specialist" },
    ],
    systemPromptOverrides: {
      "claude-opus-4":
        "You are a UX advocate. Focus on user experience, accessibility, intuitive design, and user journey. Consider edge cases from the user's perspective.",
      "gpt-5":
        "You are a frontend engineer. Consider implementation feasibility, performance implications, and technical constraints while supporting good UX decisions.",
    },
    useCount: 0,
    isPublic: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// In-memory storage for custom templates (replace with database in production)
let customTemplates: DebateTemplate[] = [];

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

/**
 * Get all available templates (built-in + custom)
 */
export function getAllTemplates(): DebateTemplate[] {
  return [...BUILT_IN_TEMPLATES, ...customTemplates];
}

/**
 * Get templates by type
 */
export function getTemplatesByType(
  templateType: DebateTemplate["templateType"]
): DebateTemplate[] {
  return getAllTemplates().filter((t) => t.templateType === templateType);
}

/**
 * Get a template by ID
 */
export function getTemplateById(id: string): DebateTemplate | undefined {
  return getAllTemplates().find((t) => t.id === id);
}

/**
 * Create a custom template
 */
export function createTemplate(
  template: Omit<DebateTemplate, "id" | "createdAt" | "updatedAt" | "useCount">
): DebateTemplate {
  const newTemplate: DebateTemplate = {
    ...template,
    id: `template_custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    useCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  customTemplates.push(newTemplate);
  return newTemplate;
}

/**
 * Update a custom template
 */
export function updateTemplate(
  id: string,
  updates: Partial<Omit<DebateTemplate, "id" | "createdAt">>
): DebateTemplate | null {
  const index = customTemplates.findIndex((t) => t.id === id);
  if (index === -1) return null;

  customTemplates[index] = {
    ...customTemplates[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  return customTemplates[index];
}

/**
 * Delete a custom template
 */
export function deleteTemplate(id: string): boolean {
  const index = customTemplates.findIndex((t) => t.id === id);
  if (index === -1) return false;

  customTemplates.splice(index, 1);
  return true;
}

/**
 * Increment template use count
 */
export function incrementTemplateUsage(id: string): void {
  const template = getAllTemplates().find((t) => t.id === id);
  if (template) {
    template.useCount++;
    template.updatedAt = new Date().toISOString();
  }
}

/**
 * Build participants from a template
 */
export function buildParticipantsFromTemplate(
  template: DebateTemplate
): DebateParticipant[] {
  return template.defaultParticipants.map((p) => {
    const participant = createParticipant(p.modelId, p.role);

    // Apply system prompt override if exists
    const override = template.systemPromptOverrides?.[p.modelId];
    if (override) {
      return {
        ...participant,
        systemPrompt: override,
      };
    }

    return participant;
  });
}

/**
 * Get popular templates (sorted by use count)
 */
export function getPopularTemplates(limit: number = 5): DebateTemplate[] {
  return getAllTemplates()
    .sort((a, b) => b.useCount - a.useCount)
    .slice(0, limit);
}

/**
 * Search templates by name or description
 */
export function searchTemplates(query: string): DebateTemplate[] {
  const lowerQuery = query.toLowerCase();
  return getAllTemplates().filter(
    (t) =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description?.toLowerCase().includes(lowerQuery)
  );
}
