'use client';

import React, { useState, useCallback } from 'react';
import {
  UserIcon,
  CodeIcon,
  CheckCircleIcon,
  UsersIcon,
  MessageSquareIcon,
  LockIcon,
  FileIcon,
  LayersIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '../ui/Icons';
import type { ActivityLog, ActivityCategory, DiffData } from '@/types/collaboration';

// Category icons
const categoryIcons: Record<ActivityCategory, React.FC<{ size?: number; className?: string }>> = {
  app: LayersIcon,
  code: CodeIcon,
  phase: LayersIcon,
  task: CheckCircleIcon,
  team: UsersIcon,
  access: LockIcon,
  chat: MessageSquareIcon,
  documentation: FileIcon,
};

// Category colors
const categoryColors: Record<ActivityCategory, string> = {
  app: 'bg-blue-500/20 text-blue-400',
  code: 'bg-purple-500/20 text-purple-400',
  phase: 'bg-amber-500/20 text-amber-400',
  task: 'bg-green-500/20 text-green-400',
  team: 'bg-cyan-500/20 text-cyan-400',
  access: 'bg-red-500/20 text-red-400',
  chat: 'bg-pink-500/20 text-pink-400',
  documentation: 'bg-zinc-500/20 text-zinc-400',
};

export interface ActivityItemProps {
  /** The activity to display */
  activity: ActivityLog;
  /** Whether to show expanded diff */
  showDiff?: boolean;
  /** Callback when activity is clicked */
  onClick?: () => void;
  /** Whether this is the last item */
  isLast?: boolean;
}

/**
 * ActivityItem - Renders a single activity log entry
 */
export function ActivityItem({
  activity,
  showDiff: initialShowDiff = false,
  onClick,
  isLast = false,
}: ActivityItemProps) {
  const [showDiff, setShowDiff] = useState(initialShowDiff);

  const IconComponent = categoryIcons[activity.actionCategory] || FileIcon;
  const colorClass = categoryColors[activity.actionCategory] || categoryColors.documentation;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const handleToggleDiff = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDiff((prev) => !prev);
  }, []);

  return (
    <div
      onClick={onClick}
      className={`relative pl-8 pb-4 ${onClick ? 'cursor-pointer hover:bg-zinc-800/30' : ''}`}
    >
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-[15px] top-8 bottom-0 w-px bg-zinc-700" />
      )}

      {/* Icon */}
      <div className={`absolute left-0 w-8 h-8 rounded-lg flex items-center justify-center ${colorClass}`}>
        <IconComponent size={16} />
      </div>

      {/* Content */}
      <div className="ml-2">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          {/* User */}
          {activity.user && (
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden">
                {activity.user.avatarUrl ? (
                  <img
                    src={activity.user.avatarUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserIcon size={12} className="text-zinc-400" />
                )}
              </div>
              <span className="text-sm font-medium text-zinc-300">
                {activity.user.fullName || activity.user.email}
              </span>
            </div>
          )}

          {/* Time */}
          <span className="text-xs text-zinc-500">{formatTime(activity.createdAt)}</span>

          {/* Category badge */}
          <span className={`px-1.5 py-0.5 rounded text-xs ${colorClass}`}>
            {activity.actionCategory}
          </span>
        </div>

        {/* Summary */}
        <p className="text-sm text-zinc-400 mb-1">{activity.summary}</p>

        {/* Target info */}
        {activity.targetName && (
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            {activity.targetType === 'file' && <FileIcon size={12} />}
            {activity.targetType === 'task' && <CheckCircleIcon size={12} />}
            {activity.targetType === 'member' && <UserIcon size={12} />}
            <span className="truncate max-w-xs">{activity.targetName}</span>
          </div>
        )}

        {/* Diff preview toggle */}
        {activity.diffData && (
          <button
            onClick={handleToggleDiff}
            className="mt-2 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            {showDiff ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
            {showDiff ? 'Hide diff' : 'Show diff'}
          </button>
        )}

        {/* Diff viewer */}
        {showDiff && activity.diffData && (
          <SimpleDiffViewer diff={activity.diffData} />
        )}
      </div>
    </div>
  );
}

/**
 * Simple diff viewer component
 */
function SimpleDiffViewer({ diff }: { diff: DiffData }) {
  const [view, setView] = useState<'before' | 'after'>('after');

  // Simple line-by-line diff display
  const beforeLines = diff.before.split('\n');
  const afterLines = diff.after.split('\n');

  return (
    <div className="mt-2 rounded-lg bg-zinc-900 border border-zinc-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-800/50 border-b border-zinc-700">
        {diff.filePath && (
          <span className="text-xs text-zinc-400 truncate">{diff.filePath}</span>
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setView('before')}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              view === 'before'
                ? 'bg-red-500/20 text-red-400'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Before
          </button>
          <button
            onClick={() => setView('after')}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              view === 'after'
                ? 'bg-green-500/20 text-green-400'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            After
          </button>
        </div>
      </div>

      {/* Code content */}
      <div className="overflow-x-auto max-h-64 overflow-y-auto">
        <pre className="p-3 text-xs font-mono text-zinc-300">
          {view === 'before' ? (
            beforeLines.map((line, i) => (
              <div key={i} className="flex">
                <span className="w-8 text-right pr-2 text-zinc-600 select-none">{i + 1}</span>
                <span className="flex-1 text-red-300/70">{line || ' '}</span>
              </div>
            ))
          ) : (
            afterLines.map((line, i) => (
              <div key={i} className="flex">
                <span className="w-8 text-right pr-2 text-zinc-600 select-none">{i + 1}</span>
                <span className="flex-1 text-green-300/70">{line || ' '}</span>
              </div>
            ))
          )}
        </pre>
      </div>
    </div>
  );
}

export default ActivityItem;
