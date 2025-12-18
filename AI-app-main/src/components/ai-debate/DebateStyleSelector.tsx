/**
 * DebateStyleSelector Component
 *
 * Allows users to select the debate style before starting a debate.
 * Different styles affect how AI models interact with each other.
 */

"use client";

import React from "react";
import type { DebateStyle } from "@/types/aiCollaboration";

interface DebateStyleSelectorProps {
  selectedStyle: DebateStyle;
  onStyleChange: (style: DebateStyle) => void;
  disabled?: boolean;
}

interface StyleOption {
  value: DebateStyle;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const STYLE_OPTIONS: StyleOption[] = [
  {
    value: "cooperative",
    label: "Cooperative",
    description: "Build consensus together",
    icon: <HandshakeIcon />,
    color: "emerald",
  },
  {
    value: "adversarial",
    label: "Adversarial",
    description: "Challenge & stress-test",
    icon: <SwordsIcon />,
    color: "amber",
  },
  {
    value: "red_team",
    label: "Red Team",
    description: "Find vulnerabilities",
    icon: <ShieldAlertIcon />,
    color: "red",
  },
  {
    value: "panel",
    label: "Panel",
    description: "Multiple perspectives",
    icon: <UsersIcon />,
    color: "blue",
  },
];

export function DebateStyleSelector({
  selectedStyle,
  onStyleChange,
  disabled = false,
}: DebateStyleSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-400">Debate Style</label>
      <div className="grid grid-cols-2 gap-2">
        {STYLE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onStyleChange(option.value)}
            disabled={disabled}
            className={`
              relative flex flex-col items-start p-3 rounded-lg border transition-all
              ${
                selectedStyle === option.value
                  ? `border-${option.color}-500/50 bg-${option.color}-500/10`
                  : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            {/* Icon */}
            <div
              className={`
                p-1.5 rounded-md mb-2
                ${
                  selectedStyle === option.value
                    ? `bg-${option.color}-500/20 text-${option.color}-400`
                    : "bg-zinc-700/50 text-zinc-400"
                }
              `}
            >
              {option.icon}
            </div>

            {/* Label */}
            <span
              className={`
                text-sm font-medium
                ${selectedStyle === option.value ? "text-white" : "text-zinc-300"}
              `}
            >
              {option.label}
            </span>

            {/* Description */}
            <span className="text-xs text-zinc-500 mt-0.5">
              {option.description}
            </span>

            {/* Selected indicator */}
            {selectedStyle === option.value && (
              <div
                className={`absolute top-2 right-2 w-2 h-2 rounded-full bg-${option.color}-400`}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// Icon components
function HandshakeIcon() {
  return (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 17a4 4 0 0 1-4-4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a4 4 0 0 1-4 4h-1" />
      <path d="M7 21v-4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4" />
      <circle cx="12" cy="9" r="2" />
    </svg>
  );
}

function SwordsIcon() {
  return (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
      <line x1="13" y1="19" x2="19" y2="13" />
      <line x1="16" y1="16" x2="20" y2="20" />
      <line x1="19" y1="21" x2="21" y2="19" />
      <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" />
      <line x1="5" y1="14" x2="9" y2="18" />
      <line x1="7" y1="17" x2="4" y2="20" />
      <line x1="3" y1="19" x2="5" y2="21" />
    </svg>
  );
}

function ShieldAlertIcon() {
  return (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export default DebateStyleSelector;
