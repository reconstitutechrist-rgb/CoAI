/**
 * TemplateEditor Component
 *
 * Form for creating and editing custom debate templates.
 * Allows configuration of style, participants, max rounds, and system prompt overrides.
 */

"use client";

import React, { useState, useCallback } from "react";
import type {
  DebateTemplate,
  DebateStyle,
  DebateModelId,
  DebateParticipant,
} from "@/types/aiCollaboration";
import { MODEL_DISPLAY_INFO } from "@/prompts/debatePersonas";
import type { DebateRole } from "@/types/aiCollaboration";

interface TemplateEditorProps {
  template?: DebateTemplate | null;
  onSave: (template: Omit<DebateTemplate, "id" | "createdAt" | "updatedAt" | "useCount">) => void;
  onCancel: () => void;
  className?: string;
}

const AVAILABLE_MODELS: DebateModelId[] = [
  "claude-opus-4",
  "claude-sonnet-4",
  "gpt-5",
  "gpt-4o",
  "gemini-pro",
  "gemini-ultra",
];

const DEBATE_STYLES: { value: DebateStyle; label: string; description: string }[] = [
  { value: "cooperative", label: "Cooperative", description: "Build consensus collaboratively" },
  { value: "adversarial", label: "Adversarial", description: "Challenge assumptions vigorously" },
  { value: "red_team", label: "Red Team", description: "Find vulnerabilities and edge cases" },
  { value: "panel", label: "Panel", description: "Multiple unique perspectives" },
];

const AVAILABLE_ROLES: DebateRole[] = [
  "strategic-architect",
  "implementation-specialist",
  "security-analyst",
  "ux-advocate",
  "devils-advocate",
  "code-quality-expert",
  "creative-thinker",
  "practical-evaluator",
  "innovation-catalyst",
  "proposer",
];

export function TemplateEditor({
  template,
  onSave,
  onCancel,
  className = "",
}: TemplateEditorProps) {
  const [name, setName] = useState(template?.name || "");
  const [description, setDescription] = useState(template?.description || "");
  const [templateType, setTemplateType] = useState<DebateTemplate["templateType"]>(
    template?.templateType || "general"
  );
  const [defaultStyle, setDefaultStyle] = useState<DebateStyle>(
    template?.defaultStyle || "cooperative"
  );
  const [defaultMaxRounds, setDefaultMaxRounds] = useState(template?.defaultMaxRounds || 5);
  const [participants, setParticipants] = useState<DebateTemplate["defaultParticipants"]>(
    template?.defaultParticipants || [
      { modelId: "claude-opus-4", role: "architect" },
      { modelId: "gpt-4o", role: "code-reviewer" },
    ]
  );
  const [isPublic, setIsPublic] = useState(template?.isPublic || false);
  const [systemPromptOverrides, setSystemPromptOverrides] = useState<Record<string, string>>(
    template?.systemPromptOverrides || {}
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Template name is required";
    }
    if (name.length > 100) {
      newErrors.name = "Name must be 100 characters or less";
    }
    if (participants.length < 2) {
      newErrors.participants = "At least 2 participants are required";
    }
    if (defaultMaxRounds < 1 || defaultMaxRounds > 20) {
      newErrors.maxRounds = "Max rounds must be between 1 and 20";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, participants, defaultMaxRounds]);

  const handleAddParticipant = () => {
    if (participants.length >= 6) return;

    // Find a model not already used
    const usedModels = new Set(participants.map((p) => p.modelId));
    const availableModel = AVAILABLE_MODELS.find((m) => !usedModels.has(m));

    if (availableModel) {
      setParticipants([
        ...participants,
        { modelId: availableModel, role: "architect" },
      ]);
    }
  };

  const handleRemoveParticipant = (index: number) => {
    if (participants.length <= 2) return;
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const handleUpdateParticipant = (
    index: number,
    field: "modelId" | "role",
    value: string
  ) => {
    const updated = [...participants];
    updated[index] = { ...updated[index], [field]: value };
    setParticipants(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      templateType,
      defaultStyle,
      defaultMaxRounds,
      defaultParticipants: participants,
      systemPromptOverrides:
        Object.keys(systemPromptOverrides).length > 0 ? systemPromptOverrides : undefined,
      isPublic,
      teamId: undefined,
      createdBy: undefined,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`bg-zinc-800/50 border border-zinc-700 rounded-lg ${className}`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-700">
        <h3 className="font-medium text-zinc-200">
          {template ? "Edit Template" : "Create New Template"}
        </h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            Template Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Code Review, Architecture Decision"
            className={`w-full px-3 py-2 bg-zinc-900 border rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
              errors.name ? "border-red-500" : "border-zinc-600"
            }`}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-400">{errors.name}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of what this template is for..."
            rows={2}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          />
        </div>

        {/* Template Type */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            Template Type
          </label>
          <select
            value={templateType}
            onChange={(e) => setTemplateType(e.target.value as DebateTemplate["templateType"])}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-lg text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="general">General</option>
            <option value="code_review">Code Review</option>
            <option value="architecture">Architecture</option>
            <option value="brainstorm">Brainstorm</option>
            <option value="security">Security</option>
          </select>
        </div>

        {/* Debate Style */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            Default Style
          </label>
          <div className="grid grid-cols-2 gap-2">
            {DEBATE_STYLES.map((style) => (
              <button
                key={style.value}
                type="button"
                onClick={() => setDefaultStyle(style.value)}
                className={`px-3 py-2 rounded-lg border text-left transition-colors ${
                  defaultStyle === style.value
                    ? "bg-purple-500/20 border-purple-500 text-purple-300"
                    : "bg-zinc-900 border-zinc-600 text-zinc-400 hover:border-zinc-500"
                }`}
              >
                <div className="text-sm font-medium">{style.label}</div>
                <div className="text-xs opacity-70">{style.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Max Rounds */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            Max Rounds: {defaultMaxRounds}
          </label>
          <input
            type="range"
            min={1}
            max={15}
            value={defaultMaxRounds}
            onChange={(e) => setDefaultMaxRounds(parseInt(e.target.value))}
            className="w-full accent-purple-500"
          />
          {errors.maxRounds && (
            <p className="mt-1 text-xs text-red-400">{errors.maxRounds}</p>
          )}
        </div>

        {/* Participants */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-zinc-300">
              Participants ({participants.length})
            </label>
            {participants.length < 6 && (
              <button
                type="button"
                onClick={handleAddParticipant}
                className="text-xs text-purple-400 hover:text-purple-300"
              >
                + Add Participant
              </button>
            )}
          </div>

          <div className="space-y-2">
            {participants.map((participant, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 bg-zinc-900 border border-zinc-700 rounded-lg"
              >
                <select
                  value={participant.modelId}
                  onChange={(e) =>
                    handleUpdateParticipant(index, "modelId", e.target.value)
                  }
                  className="flex-1 px-2 py-1.5 bg-zinc-800 border border-zinc-600 rounded text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  {AVAILABLE_MODELS.map((modelId) => (
                    <option key={modelId} value={modelId}>
                      {MODEL_DISPLAY_INFO[modelId]?.name || modelId}
                    </option>
                  ))}
                </select>

                <select
                  value={participant.role}
                  onChange={(e) =>
                    handleUpdateParticipant(index, "role", e.target.value)
                  }
                  className="flex-1 px-2 py-1.5 bg-zinc-800 border border-zinc-600 rounded text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  {AVAILABLE_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role.replace(/-/g, " ")}
                    </option>
                  ))}
                </select>

                {participants.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveParticipant(index)}
                    className="p-1 text-zinc-500 hover:text-red-400"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {errors.participants && (
            <p className="mt-1 text-xs text-red-400">{errors.participants}</p>
          )}
        </div>

        {/* Public Toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            className={`relative w-10 h-5 rounded-full transition-colors ${
              isPublic ? "bg-purple-500" : "bg-zinc-600"
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                isPublic ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </div>
          <span className="text-sm text-zinc-300">Make template public</span>
        </label>

        {/* Advanced Options */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-300"
          >
            <ChevronIcon
              className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-90" : ""}`}
            />
            Advanced Options
          </button>

          {showAdvanced && (
            <div className="mt-3 p-3 bg-zinc-900 border border-zinc-700 rounded-lg">
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                System Prompt Overrides
              </label>
              <p className="text-xs text-zinc-500 mb-2">
                Add custom instructions for specific roles (JSON format)
              </p>
              <textarea
                value={JSON.stringify(systemPromptOverrides, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    setSystemPromptOverrides(parsed);
                  } catch {
                    // Invalid JSON, ignore
                  }
                }}
                placeholder='{\n  "architect": "Focus on scalability...",\n  "code-reviewer": "Emphasize security..."\n}'
                rows={4}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-xs text-zinc-300 font-mono focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-zinc-700 bg-zinc-800/30">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {template ? "Save Changes" : "Create Template"}
        </button>
      </div>
    </form>
  );
}

/**
 * Compact version for quick template creation
 */
export function TemplateEditorCompact({
  onSave,
  className = "",
}: {
  onSave: (name: string, style: DebateStyle) => void;
  className?: string;
}) {
  const [name, setName] = useState("");
  const [style, setStyle] = useState<DebateStyle>("cooperative");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim(), style);
      setName("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`flex items-center gap-2 ${className}`}>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Template name..."
        className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-600 rounded text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
      />
      <select
        value={style}
        onChange={(e) => setStyle(e.target.value as DebateStyle)}
        className="px-2 py-1.5 bg-zinc-900 border border-zinc-600 rounded text-sm text-zinc-200 focus:outline-none"
      >
        <option value="cooperative">Cooperative</option>
        <option value="adversarial">Adversarial</option>
        <option value="red_team">Red Team</option>
        <option value="panel">Panel</option>
      </select>
      <button
        type="submit"
        disabled={!name.trim()}
        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm rounded transition-colors"
      >
        Save
      </button>
    </form>
  );
}

// Icons
function XIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
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

export default TemplateEditor;
