'use client';

import React, { useState, useCallback } from 'react';
import {
  UserIcon,
  ClockIcon,
  MessageSquareIcon,
  CheckCircleIcon,
  AlertCircleIcon,
} from '../ui/Icons';
import type { Task, TaskPriority, TaskStatus, TaskType } from '@/types/collaboration';

// Simple flag icon for priority
const FlagIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
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
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </svg>
);

export interface TaskCardProps {
  /** The task to display */
  task: Task;
  /** Whether the card is selected */
  isSelected?: boolean;
  /** Callback when card is clicked */
  onClick?: () => void;
  /** Callback when status is changed (for quick actions) */
  onStatusChange?: (status: TaskStatus) => void;
  /** Whether to show compact view */
  compact?: boolean;
  /** Whether card is being dragged */
  isDragging?: boolean;
}

const priorityColors: Record<TaskPriority, string> = {
  low: 'text-zinc-400',
  medium: 'text-blue-400',
  high: 'text-amber-400',
  urgent: 'text-red-400',
};

const priorityBgColors: Record<TaskPriority, string> = {
  low: 'bg-zinc-500/20',
  medium: 'bg-blue-500/20',
  high: 'bg-amber-500/20',
  urgent: 'bg-red-500/20',
};

const statusColors: Record<TaskStatus, string> = {
  todo: 'bg-zinc-500',
  in_progress: 'bg-blue-500',
  review: 'bg-purple-500',
  done: 'bg-green-500',
  blocked: 'bg-red-500',
  cancelled: 'bg-zinc-600',
};

const typeLabels: Record<TaskType, string> = {
  feature: 'Feature',
  bug: 'Bug',
  research: 'Research',
  documentation: 'Docs',
  review: 'Review',
  other: 'Other',
};

const typeColors: Record<TaskType, string> = {
  feature: 'bg-blue-500/20 text-blue-300',
  bug: 'bg-red-500/20 text-red-300',
  research: 'bg-purple-500/20 text-purple-300',
  documentation: 'bg-green-500/20 text-green-300',
  review: 'bg-amber-500/20 text-amber-300',
  other: 'bg-zinc-500/20 text-zinc-300',
};

/**
 * TaskCard - Displays a task in a card format
 */
export function TaskCard({
  task,
  isSelected = false,
  onClick,
  onStatusChange,
  compact = false,
  isDragging = false,
}: TaskCardProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== 'done' &&
    task.status !== 'cancelled';

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `${Math.abs(diffDays)}d overdue`;
    } else if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else if (diffDays < 7) {
      return `${diffDays}d left`;
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const handleStatusClick = useCallback(
    (e: React.MouseEvent, status: TaskStatus) => {
      e.stopPropagation();
      onStatusChange?.(status);
      setShowStatusMenu(false);
    },
    [onStatusChange]
  );

  return (
    <div
      onClick={onClick}
      className={`group relative p-3 rounded-lg border transition-all cursor-pointer ${
        isSelected
          ? 'bg-blue-600/10 border-blue-500/50'
          : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800'
      } ${isDragging ? 'opacity-50 rotate-2 scale-105' : ''}`}
    >
      {/* Status indicator */}
      <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r ${statusColors[task.status]}`} />

      <div className="pl-2">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          {/* Type badge */}
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${typeColors[task.taskType]}`}>
            {typeLabels[task.taskType]}
          </span>

          {/* Priority flag */}
          <div
            className={`p-1 rounded ${priorityBgColors[task.priority]}`}
            title={`${task.priority} priority`}
          >
            <FlagIcon size={12} className={priorityColors[task.priority]} />
          </div>
        </div>

        {/* Title */}
        <h4 className="text-sm font-medium text-zinc-200 mb-1 line-clamp-2">{task.title}</h4>

        {/* Description (if not compact) */}
        {!compact && task.description && (
          <p className="text-xs text-zinc-500 mb-2 line-clamp-2">{task.description}</p>
        )}

        {/* Labels */}
        {task.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {task.labels.slice(0, 3).map((label) => (
              <span
                key={label}
                className="px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400 text-xs"
              >
                {label}
              </span>
            ))}
            {task.labels.length > 3 && (
              <span className="px-1.5 py-0.5 text-zinc-500 text-xs">
                +{task.labels.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-700/50">
          <div className="flex items-center gap-2">
            {/* Due date */}
            {task.dueDate && (
              <div
                className={`flex items-center gap-1 text-xs ${
                  isOverdue ? 'text-red-400' : 'text-zinc-500'
                }`}
                title={new Date(task.dueDate).toLocaleDateString()}
              >
                {isOverdue ? <AlertCircleIcon size={12} /> : <ClockIcon size={12} />}
                <span>{formatDueDate(task.dueDate)}</span>
              </div>
            )}

            {/* Comment count */}
            {task.commentCount !== undefined && task.commentCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-zinc-500">
                <MessageSquareIcon size={12} />
                <span>{task.commentCount}</span>
              </div>
            )}
          </div>

          {/* Assignee */}
          {task.assignee ? (
            <div
              className="w-6 h-6 rounded-full bg-zinc-600 flex items-center justify-center"
              title={task.assignee.fullName || task.assignee.email}
            >
              {task.assignee.avatarUrl ? (
                <img
                  src={task.assignee.avatarUrl}
                  alt=""
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-xs text-zinc-300">
                  {(task.assignee.fullName || task.assignee.email || '?')[0].toUpperCase()}
                </span>
              )}
            </div>
          ) : (
            <div
              className="w-6 h-6 rounded-full border border-dashed border-zinc-600 flex items-center justify-center"
              title="Unassigned"
            >
              <UserIcon size={12} className="text-zinc-600" />
            </div>
          )}
        </div>

        {/* Quick status change menu (on hover) */}
        {onStatusChange && (
          <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowStatusMenu(!showStatusMenu);
                }}
                className="p-1 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-400 hover:text-zinc-200 transition-colors"
                title="Change status"
              >
                <CheckCircleIcon size={14} />
              </button>

              {showStatusMenu && (
                <div className="absolute right-0 top-full mt-1 z-20 py-1 rounded-lg bg-zinc-800 border border-zinc-700 shadow-lg min-w-[120px]">
                  {(['todo', 'in_progress', 'review', 'done', 'blocked'] as TaskStatus[]).map((status) => (
                    <button
                      key={status}
                      onClick={(e) => handleStatusClick(e, status)}
                      className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 hover:bg-zinc-700 transition-colors ${
                        task.status === status ? 'text-blue-400' : 'text-zinc-300'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
                      {status.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TaskCard;
