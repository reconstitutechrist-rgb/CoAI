/**
 * TemplateSelector Component
 *
 * Allows users to select from predefined debate templates.
 * Templates define participants, styles, and prompts for common scenarios.
 */

"use client";

import React, { useState, useMemo } from "react";
import type { DebateTemplate } from "@/types/aiCollaboration";
import {
  getAllTemplates,
  getPopularTemplates,
  searchTemplates,
} from "@/services/debateTemplateService";

interface TemplateSelectorProps {
  onSelect: (template: DebateTemplate) => void;
  selectedTemplateId?: string;
  className?: string;
}

// Template type icons and colors
const TEMPLATE_TYPE_CONFIG: Record<
  string,
  { icon: React.ReactNode; color: string; bgColor: string }
> = {
  code_review: {
    icon: <CodeIcon />,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  architecture: {
    icon: <ArchitectureIcon />,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
  },
  brainstorming: {
    icon: <LightbulbIcon />,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
  },
  devils_advocate: {
    icon: <DebateIcon />,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
  },
  red_team: {
    icon: <ShieldIcon />,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
  },
  ux_review: {
    icon: <UserIcon />,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
  custom: {
    icon: <CustomIcon />,
    color: "text-zinc-400",
    bgColor: "bg-zinc-500/10",
  },
};

export function TemplateSelector({
  onSelect,
  selectedTemplateId,
  className = "",
}: TemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const templates = useMemo(() => {
    if (searchQuery) {
      return searchTemplates(searchQuery);
    }
    if (showAll) {
      return getAllTemplates();
    }
    return getPopularTemplates(6);
  }, [searchQuery, showAll]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search templates..."
          className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* Templates grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {templates.map((template) => {
          const config =
            TEMPLATE_TYPE_CONFIG[template.templateType] ||
            TEMPLATE_TYPE_CONFIG.custom;
          const isSelected = selectedTemplateId === template.id;

          return (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              className={`
                relative flex items-start gap-3 p-4 rounded-lg text-left
                border transition-all duration-200
                ${
                  isSelected
                    ? "border-purple-500 bg-purple-500/10"
                    : "border-zinc-700 hover:border-zinc-600 bg-zinc-800/50"
                }
              `}
            >
              {/* Icon */}
              <div
                className={`
                  flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
                  ${config.bgColor} ${config.color}
                `}
              >
                {config.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-zinc-100 truncate">
                    {template.name}
                  </h4>
                  {template.useCount > 10 && (
                    <span className="px-1.5 py-0.5 text-xs bg-zinc-700 text-zinc-400 rounded">
                      Popular
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                  {template.description}
                </p>

                {/* Participants preview */}
                <div className="flex items-center gap-1 mt-2">
                  {template.defaultParticipants.map((p, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.5 text-xs bg-zinc-700/50 text-zinc-500 rounded"
                    >
                      {p.modelId.split("-")[0]}
                    </span>
                  ))}
                  <span className="text-xs text-zinc-500 ml-1">
                    · {template.defaultStyle}
                  </span>
                </div>
              </div>

              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <CheckIcon className="w-5 h-5 text-purple-400" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Show all toggle */}
      {!searchQuery && !showAll && getAllTemplates().length > 6 && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full py-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
        >
          Show all templates ({getAllTemplates().length})
        </button>
      )}

      {/* Custom template hint */}
      <p className="text-xs text-zinc-500 text-center">
        Or start without a template for a custom configuration
      </p>
    </div>
  );
}

/**
 * Compact template selector for inline use
 */
export function TemplateSelectorCompact({
  onSelect,
  selectedTemplateId,
}: Omit<TemplateSelectorProps, "className">) {
  const templates = getPopularTemplates(4);

  return (
    <div className="flex flex-wrap gap-2">
      {templates.map((template) => {
        const config =
          TEMPLATE_TYPE_CONFIG[template.templateType] ||
          TEMPLATE_TYPE_CONFIG.custom;
        const isSelected = selectedTemplateId === template.id;

        return (
          <button
            key={template.id}
            onClick={() => onSelect(template)}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-full text-sm
              border transition-all
              ${
                isSelected
                  ? "border-purple-500 bg-purple-500/10 text-purple-300"
                  : "border-zinc-700 hover:border-zinc-600 text-zinc-400"
              }
            `}
          >
            <span className={config.color}>{config.icon}</span>
            <span>{template.name}</span>
          </button>
        );
      })}
    </div>
  );
}

// Icons
function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function ArchitectureIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function LightbulbIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </svg>
  );
}

function DebateIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function CustomIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export default TemplateSelector;
