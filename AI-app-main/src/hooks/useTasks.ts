/**
 * useTasks Hook - Task management for teams and apps
 *
 * Provides functionality for creating, updating, and managing tasks.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { TaskService } from '@/services/TaskService';
import { useAuth } from '@/contexts/AuthContext';
import type {
  Task,
  TaskComment,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilters,
  TaskStatus,
  AddCommentInput,
} from '@/types/collaboration';

/**
 * Options for useTasks hook
 */
export interface UseTasksOptions {
  /** Team ID for team tasks */
  teamId?: string | null;
  /** App ID for app tasks */
  appId?: string | null;
  /** Initial filters */
  filters?: Omit<TaskFilters, 'teamId' | 'appId'>;
  /** Whether to auto-load on mount */
  autoLoad?: boolean;
}

/**
 * Return type for useTasks hook
 */
export interface UseTasksReturn {
  // State
  /** All tasks */
  tasks: Task[];
  /** Selected task (for detail view) */
  selectedTask: Task | null;
  /** Comments for selected task */
  comments: TaskComment[];
  /** Whether tasks are loading */
  isLoading: boolean;
  /** Whether creating a task */
  isCreating: boolean;
  /** Whether updating a task */
  isUpdating: boolean;
  /** Whether loading comments */
  isLoadingComments: boolean;
  /** Error message */
  error: string | null;
  /** Total count */
  total: number;
  /** Whether there are more tasks */
  hasMore: boolean;
  /** Current filters */
  filters: TaskFilters;
  /** Task statistics */
  stats: {
    total: number;
    byStatus: Record<TaskStatus, number>;
    byPriority: Record<string, number>;
    overdue: number;
  } | null;

  // Task actions
  /** Load tasks */
  loadTasks: () => Promise<void>;
  /** Load more tasks */
  loadMoreTasks: () => Promise<void>;
  /** Create a new task */
  createTask: (input: Omit<CreateTaskInput, 'teamId' | 'appId'>) => Promise<Task | null>;
  /** Update a task */
  updateTask: (taskId: string, input: UpdateTaskInput) => Promise<boolean>;
  /** Delete a task */
  deleteTask: (taskId: string) => Promise<boolean>;
  /** Update task status */
  updateStatus: (taskId: string, status: TaskStatus) => Promise<boolean>;
  /** Assign task to user */
  assignTask: (taskId: string, userId: string | null) => Promise<boolean>;
  /** Reorder tasks (for drag and drop) */
  reorderTasks: (taskIds: string[]) => Promise<boolean>;

  // Selection
  /** Select a task for detail view */
  selectTask: (taskId: string | null) => void;

  // Comment actions
  /** Load comments for selected task */
  loadComments: () => Promise<void>;
  /** Add a comment */
  addComment: (input: AddCommentInput) => Promise<TaskComment | null>;
  /** Edit a comment */
  editComment: (commentId: string, content: string) => Promise<boolean>;
  /** Delete a comment */
  deleteComment: (commentId: string) => Promise<boolean>;

  // Filter actions
  /** Set filters */
  setFilters: (filters: Partial<TaskFilters>) => void;
  /** Clear filters */
  clearFilters: () => void;

  // Statistics
  /** Load task statistics */
  loadStats: () => Promise<void>;
}

/**
 * Hook for managing tasks
 *
 * @param options - Configuration options
 * @returns Task management methods and state
 *
 * @example
 * ```tsx
 * const { tasks, createTask, updateStatus, isLoading } = useTasks({
 *   teamId: 'team-123',
 *   filters: { status: ['todo', 'in_progress'] },
 * });
 *
 * const handleCreate = async () => {
 *   await createTask({ title: 'New feature', priority: 'high' });
 * };
 * ```
 */
export function useTasks(options: UseTasksOptions): UseTasksReturn {
  const { teamId, appId, filters: initialFilters, autoLoad = true } = options;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [filters, setFiltersState] = useState<TaskFilters>({
    teamId: teamId || undefined,
    appId: appId || undefined,
    ...initialFilters,
  });
  const [stats, setStats] = useState<UseTasksReturn['stats']>(null);
  const [offset, setOffset] = useState(0);

  const serviceRef = useRef<TaskService | null>(null);

  // Get current user from auth context
  const { user: currentUser } = useAuth();

  const LIMIT = 50;

  // Initialize service
  useEffect(() => {
    const supabase = createClient();
    serviceRef.current = new TaskService(supabase);
  }, []);

  // Update filters when teamId/appId changes
  useEffect(() => {
    setFiltersState((prev) => ({
      ...prev,
      teamId: teamId || undefined,
      appId: appId || undefined,
    }));
  }, [teamId, appId]);

  /**
   * Load tasks
   */
  const loadTasks = useCallback(async () => {
    if (!serviceRef.current || (!filters.teamId && !filters.appId)) return;

    setIsLoading(true);
    setError(null);
    setOffset(0);

    try {
      const result = await serviceRef.current.getTasks(filters, {
        limit: LIMIT,
        offset: 0,
      });

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to load tasks');
      }

      setTasks(result.data.items);
      setTotal(result.data.total);
      setHasMore(result.data.hasMore);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load tasks';
      setError(message);
      console.error('Error loading tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  /**
   * Load more tasks
   */
  const loadMoreTasks = useCallback(async () => {
    if (!serviceRef.current || !hasMore || isLoading) return;

    setIsLoading(true);

    try {
      const newOffset = offset + LIMIT;
      const result = await serviceRef.current.getTasks(filters, {
        limit: LIMIT,
        offset: newOffset,
      });

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to load more tasks');
      }

      setTasks((prev) => [...prev, ...result.data.items]);
      setOffset(newOffset);
      setHasMore(result.data.hasMore);
    } catch (err) {
      console.error('Error loading more tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters, hasMore, isLoading, offset]);

  /**
   * Create a new task
   */
  const createTask = useCallback(
    async (input: Omit<CreateTaskInput, 'teamId' | 'appId'>): Promise<Task | null> => {
      if (!serviceRef.current || !currentUser?.id || (!teamId && !appId)) return null;

      setIsCreating(true);
      setError(null);

      try {
        const result = await serviceRef.current.createTask(
          {
            ...input,
            teamId: teamId || undefined,
            appId: appId || undefined,
          },
          currentUser.id
        );

        if (!result.success) {
          throw new Error(result.error?.message || 'Failed to create task');
        }

        // Add to local state
        setTasks((prev) => [...prev, result.data]);
        setTotal((prev) => prev + 1);

        return result.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create task';
        setError(message);
        console.error('Error creating task:', err);
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [teamId, appId, currentUser?.id]
  );

  /**
   * Update a task
   */
  const updateTask = useCallback(
    async (taskId: string, input: UpdateTaskInput): Promise<boolean> => {
      if (!serviceRef.current) return false;

      setIsUpdating(true);
      setError(null);

      try {
        const result = await serviceRef.current.updateTask(taskId, input);

        if (!result.success) {
          throw new Error(result.error?.message || 'Failed to update task');
        }

        // Update local state
        setTasks((prev) => prev.map((t) => (t.id === taskId ? result.data : t)));

        // Update selected task if it's the one being updated
        if (selectedTask?.id === taskId) {
          setSelectedTask(result.data);
        }

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update task';
        setError(message);
        console.error('Error updating task:', err);
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [selectedTask?.id]
  );

  /**
   * Delete a task
   */
  const deleteTask = useCallback(
    async (taskId: string): Promise<boolean> => {
      if (!serviceRef.current) return false;

      setError(null);

      try {
        const result = await serviceRef.current.deleteTask(taskId);

        if (!result.success) {
          throw new Error(result.error?.message || 'Failed to delete task');
        }

        // Remove from local state
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        setTotal((prev) => prev - 1);

        // Clear selection if deleted task was selected
        if (selectedTask?.id === taskId) {
          setSelectedTask(null);
          setComments([]);
        }

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete task';
        setError(message);
        console.error('Error deleting task:', err);
        return false;
      }
    },
    [selectedTask?.id]
  );

  /**
   * Update task status
   */
  const updateStatus = useCallback(
    async (taskId: string, status: TaskStatus): Promise<boolean> => {
      return updateTask(taskId, { status });
    },
    [updateTask]
  );

  /**
   * Assign task to user
   */
  const assignTask = useCallback(
    async (taskId: string, userId: string | null): Promise<boolean> => {
      return updateTask(taskId, { assignedTo: userId });
    },
    [updateTask]
  );

  /**
   * Reorder tasks
   */
  const reorderTasks = useCallback(
    async (taskIds: string[]): Promise<boolean> => {
      if (!serviceRef.current) return false;

      try {
        const result = await serviceRef.current.reorderTasks(taskIds, {
          teamId: teamId || undefined,
          appId: appId || undefined,
        });

        if (!result.success) {
          throw new Error(result.error?.message || 'Failed to reorder tasks');
        }

        // Update local state with new positions
        setTasks((prev) => {
          const taskMap = new Map(prev.map((t) => [t.id, t]));
          return taskIds.map((id, index) => {
            const task = taskMap.get(id);
            return task ? { ...task, position: index } : null;
          }).filter(Boolean) as Task[];
        });

        return true;
      } catch (err) {
        console.error('Error reordering tasks:', err);
        return false;
      }
    },
    [teamId, appId]
  );

  /**
   * Select a task for detail view
   */
  const selectTask = useCallback(
    async (taskId: string | null) => {
      if (!taskId) {
        setSelectedTask(null);
        setComments([]);
        return;
      }

      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        setSelectedTask(task);
      } else if (serviceRef.current) {
        // Fetch task if not in local state
        const result = await serviceRef.current.getTask(taskId);
        if (result.success) {
          setSelectedTask(result.data);
        }
      }
    },
    [tasks]
  );

  /**
   * Load comments for selected task
   */
  const loadComments = useCallback(async () => {
    if (!serviceRef.current || !selectedTask?.id) return;

    setIsLoadingComments(true);

    try {
      const result = await serviceRef.current.getComments(selectedTask.id);

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to load comments');
      }

      setComments(result.data);
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setIsLoadingComments(false);
    }
  }, [selectedTask?.id]);

  /**
   * Add a comment
   */
  const addComment = useCallback(
    async (input: AddCommentInput): Promise<TaskComment | null> => {
      if (!serviceRef.current || !currentUser?.id || !selectedTask?.id) return null;

      try {
        const result = await serviceRef.current.addComment(selectedTask.id, currentUser.id, input);

        if (!result.success) {
          throw new Error(result.error?.message || 'Failed to add comment');
        }

        // Add to local state
        setComments((prev) => [...prev, result.data]);

        // Update comment count on task
        setTasks((prev) =>
          prev.map((t) =>
            t.id === selectedTask.id
              ? { ...t, commentCount: (t.commentCount || 0) + 1 }
              : t
          )
        );

        return result.data;
      } catch (err) {
        console.error('Error adding comment:', err);
        return null;
      }
    },
    [selectedTask?.id, currentUser?.id]
  );

  /**
   * Edit a comment
   */
  const editComment = useCallback(
    async (commentId: string, content: string): Promise<boolean> => {
      if (!serviceRef.current || !currentUser?.id) return false;

      try {
        const result = await serviceRef.current.editComment(commentId, currentUser.id, content);

        if (!result.success) {
          throw new Error(result.error?.message || 'Failed to edit comment');
        }

        // Update local state
        setComments((prev) => prev.map((c) => (c.id === commentId ? result.data : c)));

        return true;
      } catch (err) {
        console.error('Error editing comment:', err);
        return false;
      }
    },
    [currentUser?.id]
  );

  /**
   * Delete a comment
   */
  const deleteComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      if (!serviceRef.current || !currentUser?.id) return false;

      try {
        const result = await serviceRef.current.deleteComment(commentId, currentUser.id);

        if (!result.success) {
          throw new Error(result.error?.message || 'Failed to delete comment');
        }

        // Remove from local state
        setComments((prev) => prev.filter((c) => c.id !== commentId));

        // Update comment count on task
        if (selectedTask) {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === selectedTask.id
                ? { ...t, commentCount: Math.max(0, (t.commentCount || 1) - 1) }
                : t
            )
          );
        }

        return true;
      } catch (err) {
        console.error('Error deleting comment:', err);
        return false;
      }
    },
    [currentUser?.id, selectedTask]
  );

  /**
   * Set filters
   */
  const setFilters = useCallback((newFilters: Partial<TaskFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
    setOffset(0);
  }, []);

  /**
   * Clear filters
   */
  const clearFilters = useCallback(() => {
    setFiltersState({
      teamId: teamId || undefined,
      appId: appId || undefined,
    });
    setOffset(0);
  }, [teamId, appId]);

  /**
   * Load task statistics
   */
  const loadStats = useCallback(async () => {
    if (!serviceRef.current || (!teamId && !appId)) return;

    try {
      const result = await serviceRef.current.getTaskStats({
        teamId: teamId || undefined,
        appId: appId || undefined,
      });

      if (result.success) {
        setStats({
          total: result.data.total,
          byStatus: result.data.byStatus,
          byPriority: result.data.byPriority,
          overdue: result.data.overdue,
        });
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }, [teamId, appId]);

  // Auto-load on mount and when filters change
  useEffect(() => {
    if (autoLoad && (teamId || appId)) {
      loadTasks();
    }
  }, [autoLoad, teamId, appId, filters, loadTasks]);

  // Load comments when selected task changes
  useEffect(() => {
    if (selectedTask) {
      loadComments();
    }
  }, [selectedTask?.id, loadComments]);

  // Clear state when IDs change to null
  useEffect(() => {
    if (!teamId && !appId) {
      setTasks([]);
      setSelectedTask(null);
      setComments([]);
      setTotal(0);
      setHasMore(false);
      setStats(null);
    }
  }, [teamId, appId]);

  return {
    tasks,
    selectedTask,
    comments,
    isLoading,
    isCreating,
    isUpdating,
    isLoadingComments,
    error,
    total,
    hasMore,
    filters,
    stats,
    loadTasks,
    loadMoreTasks,
    createTask,
    updateTask,
    deleteTask,
    updateStatus,
    assignTask,
    reorderTasks,
    selectTask,
    loadComments,
    addComment,
    editComment,
    deleteComment,
    setFilters,
    clearFilters,
    loadStats,
  };
}

export default useTasks;
