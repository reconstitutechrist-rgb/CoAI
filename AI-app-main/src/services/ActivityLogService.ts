/**
 * ActivityLogService - Activity tracking and changelog service
 *
 * Features:
 * - Log all types of activities (code changes, tasks, team events, etc.)
 * - Store code diffs for version history
 * - Query activity feeds with filtering
 * - Real-time activity updates
 *
 * @example Browser (Client Component)
 * ```typescript
 * import { createClient } from '@/utils/supabase/client';
 * const supabase = createClient();
 * const activityService = new ActivityLogService(supabase);
 * const result = await activityService.getActivityFeed({ appId: 'xxx' });
 * ```
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import {
  ActivityLog,
  ActivityCategory,
  ActivityFilters,
  ActivityFeedOptions,
  LogActivityInput,
  DiffData,
  ServiceResult,
  PaginatedResult,
  UserInfo,
  createServiceError,
} from '@/types/collaboration';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * Action type descriptions for human-readable summaries
 */
const ACTION_DESCRIPTIONS: Record<string, Record<string, string>> = {
  app: {
    created: 'created app',
    updated: 'updated app',
    deleted: 'deleted app',
    exported: 'exported app',
    deployed: 'deployed app',
  },
  code: {
    generated: 'generated code',
    modified: 'modified code',
    reverted: 'reverted changes',
    validated: 'validated code',
    fixed: 'applied fix',
  },
  phase: {
    started: 'started phase',
    completed: 'completed phase',
    failed: 'failed phase',
    skipped: 'skipped phase',
  },
  task: {
    created: 'created task',
    updated: 'updated task',
    assigned: 'assigned task',
    completed: 'completed task',
    commented: 'commented on task',
  },
  team: {
    created: 'created team',
    updated: 'updated team',
    member_added: 'added member',
    member_removed: 'removed member',
    member_role_changed: 'changed member role',
    invite_created: 'created invite',
    invite_accepted: 'accepted invite',
  },
  access: {
    visibility_changed: 'changed visibility',
    collaborator_added: 'added collaborator',
    collaborator_removed: 'removed collaborator',
    share_link_created: 'created share link',
    share_link_revoked: 'revoked share link',
  },
  chat: {
    message_sent: 'sent message',
    summary_generated: 'generated AI summary',
    meeting_notes_created: 'created meeting notes',
  },
  documentation: {
    updated: 'updated documentation',
    exported: 'exported documentation',
  },
  artifact: {
    created: 'saved artifact',
    updated: 'updated artifact',
    deleted: 'deleted artifact',
    archived: 'archived artifact',
  },
};

// ============================================================================
// ACTIVITYLOGSERVICE CLASS
// ============================================================================

export class ActivityLogService {
  private client: SupabaseClient<Database>;

  /**
   * Create a new ActivityLogService instance
   * @param client - Supabase client (browser or server)
   */
  constructor(client: SupabaseClient<Database>) {
    this.client = client;
  }

  // ==========================================================================
  // LOGGING METHODS
  // ==========================================================================

  /**
   * Log an activity
   * @param userId - User performing the action
   * @param input - Activity data
   */
  async log(userId: string, input: LogActivityInput): Promise<ServiceResult<ActivityLog>> {
    try {
      const { data, error } = await this.client
        .from('activity_log')
        .insert({
          team_id: input.teamId || null,
          app_id: input.appId || null,
          user_id: userId,
          action_type: input.actionType,
          action_category: input.actionCategory,
          target_type: input.targetType || null,
          target_id: input.targetId || null,
          target_name: input.targetName || null,
          summary: input.summary,
          details: input.details || {},
          diff_data: input.diffData || null,
          metadata: input.metadata || {},
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: createServiceError('LOG_FAILED', `Failed to log activity: ${error.message}`),
        };
      }

      return { success: true, data: this.mapActivityFromDb(data) };
    } catch (err) {
      return {
        success: false,
        error: createServiceError('UNEXPECTED_ERROR', 'An unexpected error occurred'),
      };
    }
  }

  /**
   * Log a code change with diff
   * @param userId - User making the change
   * @param appId - App ID
   * @param change - Change details
   */
  async logCodeChange(
    userId: string,
    appId: string,
    change: {
      actionType: 'generated' | 'modified' | 'reverted' | 'validated' | 'fixed';
      filePath?: string;
      beforeCode?: string;
      afterCode?: string;
      summary?: string;
      details?: Record<string, unknown>;
    }
  ): Promise<ServiceResult<ActivityLog>> {
    const defaultSummary =
      ACTION_DESCRIPTIONS.code[change.actionType] || `${change.actionType} code`;

    let summary = change.summary || defaultSummary;
    if (change.filePath) {
      summary += ` in ${change.filePath}`;
    }

    const diffData: DiffData | undefined =
      change.beforeCode !== undefined || change.afterCode !== undefined
        ? {
            before: change.beforeCode || '',
            after: change.afterCode || '',
            filePath: change.filePath,
            language: this.detectLanguage(change.filePath),
          }
        : undefined;

    return this.log(userId, {
      appId,
      actionType: change.actionType,
      actionCategory: 'code',
      targetType: 'file',
      targetName: change.filePath,
      summary,
      details: change.details,
      diffData,
    });
  }

  /**
   * Log a phase event
   * @param userId - User ID
   * @param appId - App ID
   * @param event - Phase event data
   */
  async logPhaseEvent(
    userId: string,
    appId: string,
    event: {
      actionType: 'started' | 'completed' | 'failed' | 'skipped';
      phaseId: string;
      phaseName: string;
      phaseNumber: number;
      details?: Record<string, unknown>;
    }
  ): Promise<ServiceResult<ActivityLog>> {
    const actionDesc = ACTION_DESCRIPTIONS.phase[event.actionType] || event.actionType;
    const summary = `${actionDesc} "${event.phaseName}" (Phase ${event.phaseNumber})`;

    return this.log(userId, {
      appId,
      actionType: event.actionType,
      actionCategory: 'phase',
      targetType: 'phase',
      targetId: event.phaseId,
      targetName: event.phaseName,
      summary,
      details: {
        phaseNumber: event.phaseNumber,
        ...event.details,
      },
    });
  }

  /**
   * Log a task event
   * @param userId - User ID
   * @param event - Task event data
   */
  async logTaskEvent(
    userId: string,
    event: {
      actionType: 'created' | 'updated' | 'assigned' | 'completed' | 'commented';
      teamId?: string;
      appId?: string;
      taskId: string;
      taskTitle: string;
      assigneeId?: string;
      details?: Record<string, unknown>;
    }
  ): Promise<ServiceResult<ActivityLog>> {
    let summary = `${ACTION_DESCRIPTIONS.task[event.actionType] || event.actionType} "${event.taskTitle}"`;

    if (event.actionType === 'assigned' && event.assigneeId) {
      summary = `assigned task "${event.taskTitle}"`;
    }

    return this.log(userId, {
      teamId: event.teamId,
      appId: event.appId,
      actionType: event.actionType,
      actionCategory: 'task',
      targetType: 'task',
      targetId: event.taskId,
      targetName: event.taskTitle,
      summary,
      details: {
        assigneeId: event.assigneeId,
        ...event.details,
      },
    });
  }

  /**
   * Log a team event
   * @param userId - User ID
   * @param event - Team event data
   */
  async logTeamEvent(
    userId: string,
    event: {
      actionType:
        | 'created'
        | 'updated'
        | 'member_added'
        | 'member_removed'
        | 'member_role_changed'
        | 'invite_created'
        | 'invite_accepted';
      teamId: string;
      teamName: string;
      targetUserId?: string;
      targetUserName?: string;
      oldRole?: string;
      newRole?: string;
      details?: Record<string, unknown>;
    }
  ): Promise<ServiceResult<ActivityLog>> {
    let summary = ACTION_DESCRIPTIONS.team[event.actionType] || event.actionType;

    if (event.targetUserName) {
      if (event.actionType === 'member_role_changed') {
        summary = `changed ${event.targetUserName}'s role from ${event.oldRole} to ${event.newRole}`;
      } else if (event.actionType === 'member_added') {
        summary = `added ${event.targetUserName} to the team`;
      } else if (event.actionType === 'member_removed') {
        summary = `removed ${event.targetUserName} from the team`;
      }
    }

    return this.log(userId, {
      teamId: event.teamId,
      actionType: event.actionType,
      actionCategory: 'team',
      targetType: event.targetUserId ? 'member' : 'team',
      targetId: event.targetUserId || event.teamId,
      targetName: event.targetUserName || event.teamName,
      summary,
      details: {
        teamName: event.teamName,
        targetUserId: event.targetUserId,
        oldRole: event.oldRole,
        newRole: event.newRole,
        ...event.details,
      },
    });
  }

  /**
   * Log an access change event
   * @param userId - User ID
   * @param appId - App ID
   * @param event - Access event data
   */
  async logAccessEvent(
    userId: string,
    appId: string,
    event: {
      actionType:
        | 'visibility_changed'
        | 'collaborator_added'
        | 'collaborator_removed'
        | 'share_link_created'
        | 'share_link_revoked';
      oldVisibility?: string;
      newVisibility?: string;
      collaboratorEmail?: string;
      collaboratorPermission?: string;
      details?: Record<string, unknown>;
    }
  ): Promise<ServiceResult<ActivityLog>> {
    let summary = ACTION_DESCRIPTIONS.access[event.actionType] || event.actionType;

    if (event.actionType === 'visibility_changed') {
      summary = `changed visibility from ${event.oldVisibility} to ${event.newVisibility}`;
    } else if (event.collaboratorEmail) {
      if (event.actionType === 'collaborator_added') {
        summary = `added ${event.collaboratorEmail} as collaborator (${event.collaboratorPermission})`;
      } else if (event.actionType === 'collaborator_removed') {
        summary = `removed ${event.collaboratorEmail} as collaborator`;
      }
    }

    return this.log(userId, {
      appId,
      actionType: event.actionType,
      actionCategory: 'access',
      targetType: event.collaboratorEmail ? 'collaborator' : 'access',
      targetName: event.collaboratorEmail,
      summary,
      details: {
        oldVisibility: event.oldVisibility,
        newVisibility: event.newVisibility,
        collaboratorEmail: event.collaboratorEmail,
        collaboratorPermission: event.collaboratorPermission,
        ...event.details,
      },
    });
  }

  // ==========================================================================
  // RETRIEVAL METHODS
  // ==========================================================================

  /**
   * Get activity feed with pagination
   * @param options - Feed options including filters
   */
  async getActivityFeed(
    options: ActivityFeedOptions = {}
  ): Promise<ServiceResult<PaginatedResult<ActivityLog>>> {
    try {
      const limit = Math.min(options.limit || DEFAULT_LIMIT, MAX_LIMIT);

      let query = this.client
        .from('activity_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(limit);

      // Apply filters
      if (options.teamId) {
        query = query.eq('team_id', options.teamId);
      }
      if (options.appId) {
        query = query.eq('app_id', options.appId);
      }
      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }
      if (options.category) {
        if (Array.isArray(options.category)) {
          query = query.in('action_category', options.category);
        } else {
          query = query.eq('action_category', options.category);
        }
      }
      if (options.actionType) {
        if (Array.isArray(options.actionType)) {
          query = query.in('action_type', options.actionType);
        } else {
          query = query.eq('action_type', options.actionType);
        }
      }
      if (options.after) {
        query = query.gt('created_at', options.after);
      }
      if (options.before) {
        query = query.lt('created_at', options.before);
      }
      if (options.cursor) {
        query = query.lt('created_at', options.cursor);
      }

      const { data, error, count } = await query;

      if (error) {
        return {
          success: false,
          error: createServiceError('FETCH_FAILED', `Failed to fetch activity: ${error.message}`),
        };
      }

      // Fetch user details for activities
      const userIds = [...new Set(data.map((a) => a.user_id).filter(Boolean))];
      const userMap = await this.fetchUserMap(userIds as string[]);

      const activities = data.map((row) => {
        const activity = this.mapActivityFromDb(row);
        if (activity.userId && userMap.has(activity.userId)) {
          activity.user = userMap.get(activity.userId);
        }
        return activity;
      });

      const hasMore = data.length === limit;
      const nextCursor = hasMore ? data[data.length - 1].created_at : undefined;

      return {
        success: true,
        data: {
          items: activities,
          total: count || 0,
          hasMore,
          nextCursor,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: createServiceError('UNEXPECTED_ERROR', 'An unexpected error occurred'),
      };
    }
  }

  /**
   * Get changelog for an app (code changes only)
   * @param appId - App ID
   * @param limit - Maximum items to return
   */
  async getAppChangelog(
    appId: string,
    limit = 50
  ): Promise<ServiceResult<PaginatedResult<ActivityLog>>> {
    return this.getActivityFeed({
      appId,
      category: 'code',
      limit,
    });
  }

  /**
   * Get activity for a specific user
   * @param userId - User ID
   * @param limit - Maximum items to return
   */
  async getUserActivity(
    userId: string,
    limit = 50
  ): Promise<ServiceResult<PaginatedResult<ActivityLog>>> {
    return this.getActivityFeed({
      userId,
      limit,
    });
  }

  /**
   * Get a specific activity with its diff
   * @param activityId - Activity ID
   */
  async getActivity(activityId: string): Promise<ServiceResult<ActivityLog>> {
    try {
      const { data, error } = await this.client
        .from('activity_log')
        .select('*')
        .eq('id', activityId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: createServiceError('NOT_FOUND', 'Activity not found'),
          };
        }
        return {
          success: false,
          error: createServiceError('FETCH_FAILED', `Failed to fetch activity: ${error.message}`),
        };
      }

      const activity = this.mapActivityFromDb(data);

      // Fetch user info
      if (activity.userId) {
        const userMap = await this.fetchUserMap([activity.userId]);
        activity.user = userMap.get(activity.userId);
      }

      return { success: true, data: activity };
    } catch (err) {
      return {
        success: false,
        error: createServiceError('UNEXPECTED_ERROR', 'An unexpected error occurred'),
      };
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Fetch user info for a list of user IDs
   */
  private async fetchUserMap(userIds: string[]): Promise<Map<string, UserInfo>> {
    if (userIds.length === 0) return new Map();

    const { data } = await this.client
      .from('user_profiles')
      .select('user_id, email, full_name, avatar_url')
      .in('user_id', userIds);

    return new Map(
      data?.map((u) => [
        u.user_id,
        {
          id: u.user_id,
          email: u.email,
          fullName: u.full_name || undefined,
          avatarUrl: u.avatar_url || undefined,
        },
      ]) || []
    );
  }

  /**
   * Detect programming language from file path
   */
  private detectLanguage(filePath?: string): string | undefined {
    if (!filePath) return undefined;

    const ext = filePath.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      json: 'json',
      css: 'css',
      scss: 'scss',
      html: 'html',
      md: 'markdown',
      sql: 'sql',
      py: 'python',
    };

    return langMap[ext || ''] || undefined;
  }

  /**
   * Map database row to ActivityLog type
   */
  private mapActivityFromDb(row: Record<string, unknown>): ActivityLog {
    return {
      id: row.id as string,
      teamId: row.team_id as string | undefined,
      appId: row.app_id as string | undefined,
      userId: row.user_id as string | undefined,
      actionType: row.action_type as string,
      actionCategory: row.action_category as ActivityCategory,
      targetType: row.target_type as string | undefined,
      targetId: row.target_id as string | undefined,
      targetName: row.target_name as string | undefined,
      summary: row.summary as string,
      details: (row.details as Record<string, unknown>) || {},
      diffData: row.diff_data as DiffData | undefined,
      metadata: (row.metadata as Record<string, unknown>) || {},
      createdAt: row.created_at as string,
    };
  }
}

export default ActivityLogService;
