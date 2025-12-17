'use client';

import React, { useState, useCallback } from 'react';
import {
  PlusIcon,
  LoaderIcon,
  RefreshIcon,
  FilterIcon,
} from '../ui/Icons';
import { TaskCard } from './TaskCard';
import { useTasks } from '@/hooks/useTasks';
import type { Task, TaskStatus, TaskPriority, TaskType, UserInfo } from '@/types/collaboration';

// Simple filter icon since it might not exist
const FilterIcon2: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
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

// Simple list icon
const ListIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
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
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

// Simple kanban icon
const KanbanIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
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
    <rect x="3" y="3" width="5" height="18" rx="1" />
    <rect x="10" y="3" width="5" height="12" rx="1" />
    <rect x="17" y="3" width="5" height="8" rx="1" />
  </svg>
);

export interface TaskBoardProps {
  /** Team ID for team tasks */
  teamId?: string | null;
  /** App ID for app tasks */
  appId?: string | null;
  /** Team members for assignment */
  members?: UserInfo[];
  /** Callback when task is selected */
  onTaskSelect?: (task: Task) => void;
  /** Callback when create task is requested */
  onCreateTask?: () => void;
}

interface KanbanColumn {
  status: TaskStatus;
  title: string;
  color: string;
}

const KANBAN_COLUMNS: KanbanColumn[] = [
  { status: 'todo', title: 'To Do', color: 'bg-zinc-500' },
  { status: 'in_progress', title: 'In Progress', color: 'bg-blue-500' },
  { status: 'review', title: 'Review', color: 'bg-purple-500' },
  { status: 'done', title: 'Done', color: 'bg-green-500' },
];

/**
 * TaskBoard - Kanban board and list view for tasks
 */
export function TaskBoard({
  teamId,
  appId,
  members = [],
  onTaskSelect,
  onCreateTask,
}: TaskBoardProps) {
  const {
    tasks,
    isLoading,
    error,
    filters,
    stats,
    loadTasks,
    updateStatus,
    setFilters,
    clearFilters,
    loadStats,
  } = useTasks({
    teamId,
    appId,
    autoLoad: true,
  });

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Group tasks by status for kanban view
  const tasksByStatus = KANBAN_COLUMNS.reduce(
    (acc, col) => {
      acc[col.status] = tasks.filter((t) => t.status === col.status);
      return acc;
    },
    {} as Record<TaskStatus, Task[]>
  );

  // Handle task click
  const handleTaskClick = useCallback(
    (task: Task) => {
      setSelectedTaskId(task.id);
      onTaskSelect?.(task);
    },
    [onTaskSelect]
  );

  // Handle status change (drag and drop or quick action)
  const handleStatusChange = useCallback(
    async (taskId: string, status: TaskStatus) => {
      await updateStatus(taskId, status);
    },
    [updateStatus]
  );

  // Handle filter change
  const handleFilterChange = useCallback(
    (key: string, value: unknown) => {
      setFilters({ [key]: value });
    },
    [setFilters]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-zinc-200">Tasks</h2>

          {/* Stats badges */}
          {stats && (
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs bg-zinc-700 text-zinc-400">
                {stats.total} total
              </span>
              {stats.overdue > 0 && (
                <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">
                  {stats.overdue} overdue
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-lg bg-zinc-800 border border-zinc-700 p-0.5">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-zinc-700 text-zinc-200'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Kanban view"
            >
              <KanbanIcon size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-zinc-700 text-zinc-200'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="List view"
            >
              <ListIcon size={16} />
            </button>
          </div>

          {/* Filter button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg border transition-colors ${
              showFilters || Object.keys(filters).length > 2
                ? 'bg-blue-600/20 border-blue-500/30 text-blue-400'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Filter tasks"
          >
            <FilterIcon2 size={16} />
          </button>

          {/* Refresh */}
          <button
            onClick={() => {
              loadTasks();
              loadStats();
            }}
            disabled={isLoading}
            className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 disabled:opacity-50 transition-colors"
            title="Refresh"
          >
            <RefreshIcon size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>

          {/* Create task */}
          {onCreateTask && (
            <button
              onClick={onCreateTask}
              className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium flex items-center gap-1.5 hover:bg-blue-500 transition-colors"
            >
              <PlusIcon size={14} />
              New Task
            </button>
          )}
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="px-4 py-3 bg-zinc-800/50 border-b border-zinc-700">
          <div className="flex flex-wrap items-center gap-4">
            {/* Priority filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Priority:</span>
              <select
                value={(filters.priority as string) || ''}
                onChange={(e) => handleFilterChange('priority', e.target.value || undefined)}
                className="px-2 py-1 text-sm rounded bg-zinc-800 border border-zinc-700 text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Type filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Type:</span>
              <select
                value={(filters.taskType as string) || ''}
                onChange={(e) => handleFilterChange('taskType', e.target.value || undefined)}
                className="px-2 py-1 text-sm rounded bg-zinc-800 border border-zinc-700 text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="feature">Feature</option>
                <option value="bug">Bug</option>
                <option value="research">Research</option>
                <option value="documentation">Documentation</option>
                <option value="review">Review</option>
              </select>
            </div>

            {/* Assignee filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Assignee:</span>
              <select
                value={filters.assignedTo === null ? 'unassigned' : filters.assignedTo || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') handleFilterChange('assignedTo', undefined);
                  else if (val === 'unassigned') handleFilterChange('assignedTo', null);
                  else handleFilterChange('assignedTo', val);
                }}
                className="px-2 py-1 text-sm rounded bg-zinc-800 border border-zinc-700 text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="unassigned">Unassigned</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.fullName || member.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search tasks..."
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value || undefined)}
                className="px-3 py-1 text-sm rounded bg-zinc-800 border border-zinc-700 text-zinc-300 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48"
              />
            </div>

            {/* Clear filters */}
            <button
              onClick={clearFilters}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Clear filters
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mx-4 my-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'kanban' ? (
          // Kanban view
          <div className="h-full overflow-x-auto">
            <div className="flex gap-4 p-4 h-full min-w-min">
              {KANBAN_COLUMNS.map((column) => (
                <div
                  key={column.status}
                  className="flex flex-col w-72 flex-shrink-0 bg-zinc-800/30 rounded-xl"
                >
                  {/* Column header */}
                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-700/50">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${column.color}`} />
                      <h3 className="text-sm font-medium text-zinc-300">{column.title}</h3>
                      <span className="text-xs text-zinc-500">
                        {tasksByStatus[column.status]?.length || 0}
                      </span>
                    </div>
                  </div>

                  {/* Column content */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {isLoading && tasksByStatus[column.status]?.length === 0 ? (
                      <div className="flex justify-center py-4">
                        <LoaderIcon size={20} className="animate-spin text-zinc-500" />
                      </div>
                    ) : tasksByStatus[column.status]?.length === 0 ? (
                      <div className="text-center py-8 text-zinc-500 text-sm">No tasks</div>
                    ) : (
                      tasksByStatus[column.status]?.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          isSelected={task.id === selectedTaskId}
                          onClick={() => handleTaskClick(task)}
                          onStatusChange={(status) => handleStatusChange(task.id, status)}
                        />
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // List view
          <div className="h-full overflow-y-auto p-4">
            {isLoading && tasks.length === 0 ? (
              <div className="flex justify-center py-12">
                <LoaderIcon size={24} className="animate-spin text-zinc-500" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-zinc-500">No tasks found</p>
                {onCreateTask && (
                  <button
                    onClick={onCreateTask}
                    className="mt-2 text-blue-400 hover:text-blue-300 text-sm transition-colors"
                  >
                    Create your first task
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isSelected={task.id === selectedTaskId}
                    onClick={() => handleTaskClick(task)}
                    onStatusChange={(status) => handleStatusChange(task.id, status)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TaskBoard;
