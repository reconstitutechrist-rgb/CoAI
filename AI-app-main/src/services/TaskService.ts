/**
 * TaskService - Task management service
 *
 * Provides CRUD operations for tasks, comments, and task workflow management.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type {
  Task,
  TaskComment,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilters,
  AddCommentInput,
  TaskStatus,
  ServiceResult,
  PaginatedResult,
} from '@/types/collaboration';

// Database row types
interface TaskRow {
  id: string;
  team_id: string | null;
  app_id: string | null;
  title: string;
  description: string | null;
  task_type: string;
  status: string;
  priority: string;
  created_by: string;
  assigned_to: string | null;
  due_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  linked_phase_id: string | null;
  linked_feature_name: string | null;
  linked_file_paths: string[] | null;
  labels: string[] | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  position: number;
  created_at: string;
  updated_at: string;
}

interface TaskCommentRow {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  mentions: string[] | null;
  created_at: string;
  edited_at: string | null;
}

interface UserProfileRow {
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

/**
 * Service for managing tasks
 */
export class TaskService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Transform database row to Task type
   */
  private transformTask(row: TaskRow, creator?: UserProfileRow, assignee?: UserProfileRow, commentCount?: number): Task {
    return {
      id: row.id,
      teamId: row.team_id || undefined,
      appId: row.app_id || undefined,
      title: row.title,
      description: row.description || undefined,
      taskType: row.task_type as Task['taskType'],
      status: row.status as Task['status'],
      priority: row.priority as Task['priority'],
      createdBy: row.created_by,
      assignedTo: row.assigned_to || undefined,
      dueDate: row.due_date || undefined,
      startedAt: row.started_at || undefined,
      completedAt: row.completed_at || undefined,
      linkedPhaseId: row.linked_phase_id || undefined,
      linkedFeatureName: row.linked_feature_name || undefined,
      linkedFilePaths: row.linked_file_paths || [],
      labels: row.labels || [],
      estimatedHours: row.estimated_hours || undefined,
      actualHours: row.actual_hours || undefined,
      position: row.position,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      creator: creator
        ? {
            id: creator.user_id,
            email: creator.email,
            fullName: creator.full_name || undefined,
            avatarUrl: creator.avatar_url || undefined,
          }
        : undefined,
      assignee: assignee
        ? {
            id: assignee.user_id,
            email: assignee.email,
            fullName: assignee.full_name || undefined,
            avatarUrl: assignee.avatar_url || undefined,
          }
        : undefined,
      commentCount,
    };
  }

  /**
   * Transform database row to TaskComment type
   */
  private transformComment(row: TaskCommentRow, user?: UserProfileRow): TaskComment {
    return {
      id: row.id,
      taskId: row.task_id,
      userId: row.user_id,
      content: row.content,
      mentions: row.mentions || [],
      createdAt: row.created_at,
      editedAt: row.edited_at || undefined,
      user: user
        ? {
            id: user.user_id,
            email: user.email,
            fullName: user.full_name || undefined,
            avatarUrl: user.avatar_url || undefined,
          }
        : undefined,
    };
  }

  /**
   * Create a new task
   */
  async createTask(input: CreateTaskInput, userId: string): Promise<ServiceResult<Task>> {
    try {
      // Get max position for ordering
      let maxPosition = 0;
      let positionQuery = this.supabase
        .from('tasks')
        .select('position');

      // Apply team or app filter for position calculation
      if (input.teamId) {
        positionQuery = positionQuery.eq('team_id', input.teamId);
      } else if (input.appId) {
        positionQuery = positionQuery.eq('app_id', input.appId);
      }

      const { data: positionData } = await positionQuery
        .order('position', { ascending: false })
        .limit(1)
        .single();

      if (positionData) {
        maxPosition = positionData.position + 1;
      }

      const { data, error } = await this.supabase
        .from('tasks')
        .insert({
          team_id: input.teamId || null,
          app_id: input.appId || null,
          title: input.title,
          description: input.description || null,
          task_type: input.taskType || 'feature',
          status: 'todo',
          priority: input.priority || 'medium',
          created_by: userId,
          assigned_to: input.assignedTo || null,
          due_date: input.dueDate || null,
          linked_phase_id: input.linkedPhaseId || null,
          linked_feature_name: input.linkedFeatureName || null,
          labels: input.labels || [],
          estimated_hours: input.estimatedHours || null,
          position: maxPosition,
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: { code: 'CREATE_FAILED', message: error.message },
        };
      }

      // Fetch creator info
      const { data: creator } = await this.supabase
        .from('user_profiles')
        .select('user_id, email, full_name, avatar_url')
        .eq('user_id', userId)
        .single();

      return {
        success: true,
        data: this.transformTask(data as TaskRow, creator as UserProfileRow),
      };
    } catch (err) {
      return {
        success: false,
        error: { code: 'CREATE_FAILED', message: err instanceof Error ? err.message : 'Unknown error' },
      };
    }
  }

  /**
   * Get a single task by ID
   */
  async getTask(taskId: string): Promise<ServiceResult<Task>> {
    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (error) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Task not found' },
        };
      }

      // Fetch related users
      const taskRow = data as TaskRow;
      const userIds = [taskRow.created_by, taskRow.assigned_to].filter(Boolean) as string[];

      let users: UserProfileRow[] = [];
      if (userIds.length > 0) {
        const { data: userData } = await this.supabase
          .from('user_profiles')
          .select('user_id, email, full_name, avatar_url')
          .in('user_id', userIds);
        users = (userData || []) as UserProfileRow[];
      }

      // Get comment count
      const { count } = await this.supabase
        .from('task_comments')
        .select('*', { count: 'exact', head: true })
        .eq('task_id', taskId);

      const creator = users.find((u) => u.user_id === taskRow.created_by);
      const assignee = taskRow.assigned_to ? users.find((u) => u.user_id === taskRow.assigned_to) : undefined;

      return {
        success: true,
        data: this.transformTask(taskRow, creator, assignee, count || 0),
      };
    } catch (err) {
      return {
        success: false,
        error: { code: 'FETCH_FAILED', message: err instanceof Error ? err.message : 'Unknown error' },
      };
    }
  }

  /**
   * Get tasks with filters
   */
  async getTasks(
    filters: TaskFilters,
    options: { limit?: number; offset?: number; orderBy?: string; orderDir?: 'asc' | 'desc' } = {}
  ): Promise<ServiceResult<PaginatedResult<Task>>> {
    try {
      const { limit = 50, offset = 0, orderBy = 'position', orderDir = 'asc' } = options;

      let query = this.supabase.from('tasks').select('*', { count: 'exact' });

      // Apply filters
      if (filters.teamId) {
        query = query.eq('team_id', filters.teamId);
      }
      if (filters.appId) {
        query = query.eq('app_id', filters.appId);
      }
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }
      if (filters.priority) {
        if (Array.isArray(filters.priority)) {
          query = query.in('priority', filters.priority);
        } else {
          query = query.eq('priority', filters.priority);
        }
      }
      if (filters.assignedTo !== undefined) {
        if (filters.assignedTo === null) {
          query = query.is('assigned_to', null);
        } else {
          query = query.eq('assigned_to', filters.assignedTo);
        }
      }
      if (filters.createdBy) {
        query = query.eq('created_by', filters.createdBy);
      }
      if (filters.taskType) {
        if (Array.isArray(filters.taskType)) {
          query = query.in('task_type', filters.taskType);
        } else {
          query = query.eq('task_type', filters.taskType);
        }
      }
      if (filters.labels && filters.labels.length > 0) {
        query = query.overlaps('labels', filters.labels);
      }
      if (filters.dueBefore) {
        query = query.lte('due_date', filters.dueBefore);
      }
      if (filters.dueAfter) {
        query = query.gte('due_date', filters.dueAfter);
      }
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Apply ordering and pagination
      query = query
        .order(orderBy, { ascending: orderDir === 'asc' })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        return {
          success: false,
          error: { code: 'FETCH_FAILED', message: error.message },
        };
      }

      // Fetch user info for all tasks
      const taskRows = (data || []) as TaskRow[];
      const userIds = [...new Set(taskRows.flatMap((t) => [t.created_by, t.assigned_to].filter(Boolean)))];

      let users: UserProfileRow[] = [];
      if (userIds.length > 0) {
        const { data: userData } = await this.supabase
          .from('user_profiles')
          .select('user_id, email, full_name, avatar_url')
          .in('user_id', userIds);
        users = (userData || []) as UserProfileRow[];
      }

      // Get comment counts for all tasks
      const taskIds = taskRows.map((t) => t.id);
      const commentCounts: Record<string, number> = {};

      if (taskIds.length > 0) {
        const { data: comments } = await this.supabase
          .from('task_comments')
          .select('task_id')
          .in('task_id', taskIds);

        (comments || []).forEach((c: { task_id: string }) => {
          commentCounts[c.task_id] = (commentCounts[c.task_id] || 0) + 1;
        });
      }

      const tasks = taskRows.map((row) => {
        const creator = users.find((u) => u.user_id === row.created_by);
        const assignee = row.assigned_to ? users.find((u) => u.user_id === row.assigned_to) : undefined;
        return this.transformTask(row, creator, assignee, commentCounts[row.id] || 0);
      });

      return {
        success: true,
        data: {
          items: tasks,
          total: count || 0,
          hasMore: (count || 0) > offset + limit,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: { code: 'FETCH_FAILED', message: err instanceof Error ? err.message : 'Unknown error' },
      };
    }
  }

  /**
   * Update a task
   */
  async updateTask(taskId: string, input: UpdateTaskInput): Promise<ServiceResult<Task>> {
    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.taskType !== undefined) updateData.task_type = input.taskType;
      if (input.status !== undefined) {
        updateData.status = input.status;
        // Set started_at when moving to in_progress
        if (input.status === 'in_progress') {
          updateData.started_at = new Date().toISOString();
        }
        // Set completed_at when moving to done
        if (input.status === 'done') {
          updateData.completed_at = new Date().toISOString();
        }
      }
      if (input.priority !== undefined) updateData.priority = input.priority;
      if (input.assignedTo !== undefined) updateData.assigned_to = input.assignedTo;
      if (input.dueDate !== undefined) updateData.due_date = input.dueDate;
      if (input.linkedPhaseId !== undefined) updateData.linked_phase_id = input.linkedPhaseId;
      if (input.linkedFeatureName !== undefined) updateData.linked_feature_name = input.linkedFeatureName;
      if (input.linkedFilePaths !== undefined) updateData.linked_file_paths = input.linkedFilePaths;
      if (input.labels !== undefined) updateData.labels = input.labels;
      if (input.estimatedHours !== undefined) updateData.estimated_hours = input.estimatedHours;
      if (input.actualHours !== undefined) updateData.actual_hours = input.actualHours;
      if (input.position !== undefined) updateData.position = input.position;

      const { data, error } = await this.supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: { code: 'UPDATE_FAILED', message: error.message },
        };
      }

      // Fetch full task with relations
      return this.getTask(taskId);
    } catch (err) {
      return {
        success: false,
        error: { code: 'UPDATE_FAILED', message: err instanceof Error ? err.message : 'Unknown error' },
      };
    }
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await this.supabase.from('tasks').delete().eq('id', taskId);

      if (error) {
        return {
          success: false,
          error: { code: 'DELETE_FAILED', message: error.message },
        };
      }

      return { success: true, data: undefined };
    } catch (err) {
      return {
        success: false,
        error: { code: 'DELETE_FAILED', message: err instanceof Error ? err.message : 'Unknown error' },
      };
    }
  }

  /**
   * Update task status (convenience method)
   */
  async updateStatus(taskId: string, status: TaskStatus): Promise<ServiceResult<Task>> {
    return this.updateTask(taskId, { status });
  }

  /**
   * Assign task to user
   */
  async assignTask(taskId: string, userId: string | null): Promise<ServiceResult<Task>> {
    return this.updateTask(taskId, { assignedTo: userId });
  }

  /**
   * Reorder tasks (for drag and drop)
   */
  async reorderTasks(
    taskIds: string[],
    filters: { teamId?: string; appId?: string }
  ): Promise<ServiceResult<void>> {
    try {
      // Update positions based on array order
      const updates = taskIds.map((id, index) => ({
        id,
        position: index,
        updated_at: new Date().toISOString(),
      }));

      for (const update of updates) {
        const { error } = await this.supabase
          .from('tasks')
          .update({ position: update.position, updated_at: update.updated_at })
          .eq('id', update.id);

        if (error) {
          return {
            success: false,
            error: { code: 'REORDER_FAILED', message: error.message },
          };
        }
      }

      return { success: true, data: undefined };
    } catch (err) {
      return {
        success: false,
        error: { code: 'REORDER_FAILED', message: err instanceof Error ? err.message : 'Unknown error' },
      };
    }
  }

  // ============================================================================
  // COMMENT METHODS
  // ============================================================================

  /**
   * Add a comment to a task
   */
  async addComment(taskId: string, userId: string, input: AddCommentInput): Promise<ServiceResult<TaskComment>> {
    try {
      const { data, error } = await this.supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          user_id: userId,
          content: input.content,
          mentions: input.mentions || [],
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: { code: 'ADD_COMMENT_FAILED', message: error.message },
        };
      }

      // Fetch user info
      const { data: user } = await this.supabase
        .from('user_profiles')
        .select('user_id, email, full_name, avatar_url')
        .eq('user_id', userId)
        .single();

      return {
        success: true,
        data: this.transformComment(data as TaskCommentRow, user as UserProfileRow),
      };
    } catch (err) {
      return {
        success: false,
        error: { code: 'ADD_COMMENT_FAILED', message: err instanceof Error ? err.message : 'Unknown error' },
      };
    }
  }

  /**
   * Get comments for a task
   */
  async getComments(taskId: string): Promise<ServiceResult<TaskComment[]>> {
    try {
      const { data, error } = await this.supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) {
        return {
          success: false,
          error: { code: 'FETCH_FAILED', message: error.message },
        };
      }

      const commentRows = (data || []) as TaskCommentRow[];
      const userIds = [...new Set(commentRows.map((c) => c.user_id))];

      let users: UserProfileRow[] = [];
      if (userIds.length > 0) {
        const { data: userData } = await this.supabase
          .from('user_profiles')
          .select('user_id, email, full_name, avatar_url')
          .in('user_id', userIds);
        users = (userData || []) as UserProfileRow[];
      }

      const comments = commentRows.map((row) => {
        const user = users.find((u) => u.user_id === row.user_id);
        return this.transformComment(row, user);
      });

      return { success: true, data: comments };
    } catch (err) {
      return {
        success: false,
        error: { code: 'FETCH_FAILED', message: err instanceof Error ? err.message : 'Unknown error' },
      };
    }
  }

  /**
   * Edit a comment
   */
  async editComment(commentId: string, userId: string, content: string): Promise<ServiceResult<TaskComment>> {
    try {
      const { data, error } = await this.supabase
        .from('task_comments')
        .update({
          content,
          edited_at: new Date().toISOString(),
        })
        .eq('id', commentId)
        .eq('user_id', userId) // Only owner can edit
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: { code: 'EDIT_FAILED', message: error.message },
        };
      }

      // Fetch user info
      const { data: user } = await this.supabase
        .from('user_profiles')
        .select('user_id, email, full_name, avatar_url')
        .eq('user_id', userId)
        .single();

      return {
        success: true,
        data: this.transformComment(data as TaskCommentRow, user as UserProfileRow),
      };
    } catch (err) {
      return {
        success: false,
        error: { code: 'EDIT_FAILED', message: err instanceof Error ? err.message : 'Unknown error' },
      };
    }
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string, userId: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await this.supabase
        .from('task_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', userId); // Only owner can delete

      if (error) {
        return {
          success: false,
          error: { code: 'DELETE_FAILED', message: error.message },
        };
      }

      return { success: true, data: undefined };
    } catch (err) {
      return {
        success: false,
        error: { code: 'DELETE_FAILED', message: err instanceof Error ? err.message : 'Unknown error' },
      };
    }
  }

  // ============================================================================
  // STATISTICS METHODS
  // ============================================================================

  /**
   * Get task statistics for a team or app
   */
  async getTaskStats(filters: { teamId?: string; appId?: string }): Promise<
    ServiceResult<{
      total: number;
      byStatus: Record<TaskStatus, number>;
      byPriority: Record<string, number>;
      byAssignee: Record<string, number>;
      overdue: number;
      completedThisWeek: number;
    }>
  > {
    try {
      let query = this.supabase.from('tasks').select('status, priority, assigned_to, due_date, completed_at');

      if (filters.teamId) {
        query = query.eq('team_id', filters.teamId);
      }
      if (filters.appId) {
        query = query.eq('app_id', filters.appId);
      }

      const { data, error } = await query;

      if (error) {
        return {
          success: false,
          error: { code: 'FETCH_FAILED', message: error.message },
        };
      }

      const tasks = data || [];
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const stats = {
        total: tasks.length,
        byStatus: {} as Record<TaskStatus, number>,
        byPriority: {} as Record<string, number>,
        byAssignee: {} as Record<string, number>,
        overdue: 0,
        completedThisWeek: 0,
      };

      tasks.forEach((task) => {
        // By status
        stats.byStatus[task.status as TaskStatus] = (stats.byStatus[task.status as TaskStatus] || 0) + 1;

        // By priority
        stats.byPriority[task.priority] = (stats.byPriority[task.priority] || 0) + 1;

        // By assignee
        const assignee = task.assigned_to || 'unassigned';
        stats.byAssignee[assignee] = (stats.byAssignee[assignee] || 0) + 1;

        // Overdue
        if (
          task.due_date &&
          new Date(task.due_date) < now &&
          task.status !== 'done' &&
          task.status !== 'cancelled'
        ) {
          stats.overdue++;
        }

        // Completed this week
        if (task.completed_at && new Date(task.completed_at) >= weekAgo) {
          stats.completedThisWeek++;
        }
      });

      return { success: true, data: stats };
    } catch (err) {
      return {
        success: false,
        error: { code: 'FETCH_FAILED', message: err instanceof Error ? err.message : 'Unknown error' },
      };
    }
  }
}

export default TaskService;
