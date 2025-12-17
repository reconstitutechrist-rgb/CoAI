'use client';

import React, { useState, useCallback } from 'react';
import {
  ClockIcon,
  RefreshIcon,
  LoaderIcon,
  ChevronDownIcon,
} from '../ui/Icons';
import { ActivityItem } from './ActivityItem';
import { useActivityLog } from '@/hooks/useActivityLog';
import type { ActivityCategory, ActivityLog } from '@/types/collaboration';

// Simple filter icon
const FilterIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

export interface ActivityFeedProps {
  /** Team ID for team activity */
  teamId?: string | null;
  /** App ID for app activity */
  appId?: string | null;
  /** User ID for user activity */
  userId?: string | null;
  /** Title for the feed */
  title?: string;
  /** Whether to show filters */
  showFilters?: boolean;
  /** Whether to show as compact */
  compact?: boolean;
  /** Maximum height */
  maxHeight?: string;
  /** Callback when activity is clicked */
  onActivityClick?: (activity: ActivityLog) => void;
}

const CATEGORY_OPTIONS: { value: ActivityCategory | ''; label: string }[] = [
  { value: '', label: 'All Activity' },
  { value: 'code', label: 'Code Changes' },
  { value: 'phase', label: 'Phase Progress' },
  { value: 'task', label: 'Tasks' },
  { value: 'team', label: 'Team' },
  { value: 'access', label: 'Access' },
  { value: 'chat', label: 'Chat' },
  { value: 'app', label: 'App' },
];

/**
 * ActivityFeed - Timeline view of activity logs
 */
export function ActivityFeed({
  teamId,
  appId,
  userId,
  title = 'Activity',
  showFilters = true,
  compact = false,
  maxHeight = '500px',
  onActivityClick,
}: ActivityFeedProps) {
  const {
    activities,
    isLoading,
    isLoadingMore,
    hasMore,
    total,
    filters,
    loadMoreActivities,
    refresh,
    filterByCategory,
    clearFilters,
  } = useActivityLog({
    teamId,
    appId,
    userId,
    autoLoad: true,
  });

  const [showCategoryMenu, setShowCategoryMenu] = useState(false);

  const handleCategoryChange = useCallback(
    (category: ActivityCategory | '') => {
      if (category === '') {
        clearFilters();
      } else {
        filterByCategory(category);
      }
      setShowCategoryMenu(false);
    },
    [filterByCategory, clearFilters]
  );

  const currentCategoryLabel =
    CATEGORY_OPTIONS.find((opt) => opt.value === (filters.category || ''))?.label || 'All Activity';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <ClockIcon size={18} className="text-zinc-400" />
          <h3 className="font-medium text-zinc-200">{title}</h3>
          {total > 0 && (
            <span className="text-xs text-zinc-500">({total})</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Category filter dropdown */}
          {showFilters && (
            <div className="relative">
              <button
                onClick={() => setShowCategoryMenu(!showCategoryMenu)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  filters.category
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-zinc-200'
                }`}
              >
                <FilterIcon size={12} />
                {currentCategoryLabel}
                <ChevronDownIcon size={12} />
              </button>

              {showCategoryMenu && (
                <div className="absolute right-0 top-full mt-1 z-20 py-1 rounded-lg bg-zinc-800 border border-zinc-700 shadow-lg min-w-[140px]">
                  {CATEGORY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleCategoryChange(option.value)}
                      className={`w-full px-3 py-1.5 text-left text-xs transition-colors ${
                        (filters.category || '') === option.value
                          ? 'bg-blue-600/20 text-blue-400'
                          : 'text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Refresh button */}
          <button
            onClick={refresh}
            disabled={isLoading}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-50 transition-colors"
            title="Refresh"
          >
            <RefreshIcon size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ maxHeight }}
      >
        {/* Loading state */}
        {isLoading && activities.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <LoaderIcon size={24} className="animate-spin text-zinc-500" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && activities.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <ClockIcon size={40} className="text-zinc-600 mb-3" />
            <h4 className="text-zinc-400 font-medium mb-1">No activity yet</h4>
            <p className="text-zinc-500 text-sm">
              Activity will appear here as changes are made.
            </p>
          </div>
        )}

        {/* Activity list */}
        {activities.length > 0 && (
          <div className="p-4">
            {activities.map((activity, index) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                isLast={index === activities.length - 1}
                onClick={onActivityClick ? () => onActivityClick(activity) : undefined}
              />
            ))}

            {/* Load more button */}
            {hasMore && (
              <div className="mt-4 text-center">
                <button
                  onClick={loadMoreActivities}
                  disabled={isLoadingMore}
                  className="px-4 py-2 text-sm rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-50 transition-colors"
                >
                  {isLoadingMore ? (
                    <span className="flex items-center gap-2">
                      <LoaderIcon size={14} className="animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    'Load more'
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ActivityFeed;
