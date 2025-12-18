/**
 * DebateHistoryDrawer Component
 *
 * Sidebar showing past debates for the current app.
 * Allows reviewing previous discussions and their implementation status.
 * Includes search and filter functionality.
 */

"use client";

import React, { useState, useMemo } from "react";
import type { DebateSession, DebateStyle, DebateModelId } from "@/types/aiCollaboration";
import { downloadDebate } from "@/utils/debateExport";

interface DebateHistoryDrawerProps {
  debates: DebateSession[];
  isOpen: boolean;
  onClose: () => void;
  onSelectDebate: (debate: DebateSession) => void;
  selectedDebateId?: string;
  onDeleteDebate?: (debateId: string) => void;
}

type StatusFilter = "all" | "agreed" | "user-ended" | "pending";
type DateFilter = "all" | "today" | "week" | "month";

export function DebateHistoryDrawer({
  debates,
  isOpen,
  onClose,
  onSelectDebate,
  selectedDebateId,
  onDeleteDebate,
}: DebateHistoryDrawerProps) {
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [styleFilter, setStyleFilter] = useState<DebateStyle | "all">("all");
  const [showFilters, setShowFilters] = useState(false);

  // Filter debates
  const filteredDebates = useMemo(() => {
    let result = [...debates];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.userQuestion.toLowerCase().includes(query) ||
          d.messages.some((m) => m.content.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "pending") {
        result = result.filter(
          (d) => d.status !== "agreed" && d.status !== "user-ended"
        );
      } else {
        result = result.filter((d) => d.status === statusFilter);
      }
    }

    // Style filter
    if (styleFilter !== "all") {
      result = result.filter((d) => d.style === styleFilter);
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      let cutoff: Date;

      switch (dateFilter) {
        case "today":
          cutoff = new Date(now.setHours(0, 0, 0, 0));
          break;
        case "week":
          cutoff = new Date(now.setDate(now.getDate() - 7));
          break;
        case "month":
          cutoff = new Date(now.setMonth(now.getMonth() - 1));
          break;
        default:
          cutoff = new Date(0);
      }

      result = result.filter((d) => new Date(d.createdAt) >= cutoff);
    }

    // Sort by date (newest first)
    result.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return result;
  }, [debates, searchQuery, statusFilter, dateFilter, styleFilter]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setDateFilter("all");
    setStyleFilter("all");
  };

  const hasActiveFilters =
    searchQuery || statusFilter !== "all" || dateFilter !== "all" || styleFilter !== "all";

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Drawer */}
      <div
        className={`
          fixed right-0 top-0 h-full w-96 z-50
          bg-zinc-900 border-l border-zinc-800
          shadow-2xl shadow-black/50
          transform transition-transform duration-300
          ${isOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Past Debates</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {filteredDebates.length} of {debates.length} debates
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Search and filters */}
        <div className="px-4 py-3 border-b border-zinc-800 space-y-3">
          {/* Search */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search debates..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 text-xs ${
                hasActiveFilters ? "text-purple-400" : "text-zinc-400"
              } hover:text-zinc-300`}
            >
              <FilterIcon className="w-4 h-4" />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="px-1.5 py-0.5 bg-purple-500/20 rounded text-purple-300">
                  Active
                </span>
              )}
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Filter options */}
          {showFilters && (
            <div className="space-y-2 pt-2">
              {/* Status filter */}
              <div className="flex flex-wrap gap-1.5">
                {(["all", "agreed", "user-ended", "pending"] as StatusFilter[]).map(
                  (status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-2 py-1 text-xs rounded-full transition-colors ${
                        statusFilter === status
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/50"
                          : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600"
                      }`}
                    >
                      {status === "all"
                        ? "All Status"
                        : status === "agreed"
                        ? "Completed"
                        : status === "user-ended"
                        ? "Ended"
                        : "Pending"}
                    </button>
                  )
                )}
              </div>

              {/* Date filter */}
              <div className="flex flex-wrap gap-1.5">
                {(["all", "today", "week", "month"] as DateFilter[]).map((date) => (
                  <button
                    key={date}
                    onClick={() => setDateFilter(date)}
                    className={`px-2 py-1 text-xs rounded-full transition-colors ${
                      dateFilter === date
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/50"
                        : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600"
                    }`}
                  >
                    {date === "all"
                      ? "Any Time"
                      : date === "today"
                      ? "Today"
                      : date === "week"
                      ? "This Week"
                      : "This Month"}
                  </button>
                ))}
              </div>

              {/* Style filter */}
              <div className="flex flex-wrap gap-1.5">
                {(["all", "cooperative", "adversarial", "red_team", "panel"] as (DebateStyle | "all")[]).map(
                  (style) => (
                    <button
                      key={style}
                      onClick={() => setStyleFilter(style)}
                      className={`px-2 py-1 text-xs rounded-full transition-colors ${
                        styleFilter === style
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/50"
                          : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600"
                      }`}
                    >
                      {style === "all"
                        ? "Any Style"
                        : style === "red_team"
                        ? "Red Team"
                        : style.charAt(0).toUpperCase() + style.slice(1)}
                    </button>
                  )
                )}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-12rem)]">
          {filteredDebates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              {debates.length === 0 ? (
                <>
                  <span className="text-4xl mb-3">💬</span>
                  <p className="text-zinc-400 text-sm">No debates yet</p>
                  <p className="text-zinc-500 text-xs mt-1">
                    Start a debate by toggling &quot;Ask Both AIs&quot; mode
                  </p>
                </>
              ) : (
                <>
                  <SearchIcon className="w-12 h-12 text-zinc-700 mb-4" />
                  <p className="text-zinc-400 text-sm">No matching debates</p>
                  <button
                    onClick={clearFilters}
                    className="text-xs text-purple-400 hover:text-purple-300 mt-2"
                  >
                    Clear filters
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {filteredDebates.map((debate) => (
                <DebateHistoryItem
                  key={debate.id}
                  debate={debate}
                  isSelected={debate.id === selectedDebateId}
                  onClick={() => onSelectDebate(debate)}
                  onDelete={onDeleteDebate ? () => onDeleteDebate(debate.id) : undefined}
                  onExport={(format) => downloadDebate(debate, format)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

interface DebateHistoryItemProps {
  debate: DebateSession;
  isSelected: boolean;
  onClick: () => void;
  onDelete?: () => void;
  onExport?: (format: "markdown" | "html" | "json") => void;
}

function DebateHistoryItem({
  debate,
  isSelected,
  onClick,
  onDelete,
  onExport,
}: DebateHistoryItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const isImplemented = !!debate.consensus?.implementedAt;
  const formattedDate = new Date(debate.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  return (
    <div className="relative">
      <button
        onClick={onClick}
        className={`
          w-full text-left px-4 py-3 transition-colors
          hover:bg-zinc-800/50
          ${isSelected ? "bg-zinc-800" : ""}
        `}
      >
        <div className="flex items-start gap-3">
          {/* Style indicator */}
          <div
            className={`w-1 h-12 rounded-full ${
              debate.style === "adversarial"
                ? "bg-red-500"
                : debate.style === "red_team"
                ? "bg-orange-500"
                : debate.style === "panel"
                ? "bg-blue-500"
                : "bg-emerald-500"
            }`}
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Question preview */}
            <p className="text-sm text-zinc-200 line-clamp-2">
              {debate.userQuestion}
            </p>

            {/* Meta */}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-xs text-zinc-500">{formattedDate}</span>
              <span className="text-zinc-700">•</span>
              <span className="text-xs text-zinc-500">
                {debate.messages.length} msgs
              </span>
              {debate.style && debate.style !== "cooperative" && (
                <>
                  <span className="text-zinc-700">•</span>
                  <span className="text-xs text-zinc-500 capitalize">
                    {debate.style.replace("_", " ")}
                  </span>
                </>
              )}
              {debate.cost?.totalCost && (
                <>
                  <span className="text-zinc-700">•</span>
                  <span className="text-xs text-zinc-500">
                    ${debate.cost.totalCost.toFixed(3)}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Status and menu */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Status */}
            {isImplemented ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs">
                <CheckIcon className="w-3 h-3" />
                Done
              </span>
            ) : debate.status === "agreed" ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs">
                Agreed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs">
                <ClockIcon className="w-3 h-3" />
              </span>
            )}

            {/* Menu button */}
            <button
              onClick={handleMenuClick}
              className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <MoreIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </button>

      {/* Dropdown menu */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-4 top-12 z-20 w-40 py-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl">
            {onExport && (
              <>
                <button
                  onClick={() => {
                    onExport("markdown");
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm text-zinc-300 hover:bg-zinc-700"
                >
                  Export as Markdown
                </button>
                <button
                  onClick={() => {
                    onExport("html");
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm text-zinc-300 hover:bg-zinc-700"
                >
                  Export as HTML
                </button>
                <button
                  onClick={() => {
                    onExport("json");
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm text-zinc-300 hover:bg-zinc-700"
                >
                  Export as JSON
                </button>
              </>
            )}
            {onDelete && (
              <>
                <div className="my-1 border-t border-zinc-700" />
                <button
                  onClick={() => {
                    onDelete();
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-zinc-700"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx="11" cy="11" r="8" />
      <path strokeLinecap="round" d="m21 21-4.3-4.3" />
    </svg>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  );
}

export default DebateHistoryDrawer;
