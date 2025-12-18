/**
 * ProjectArtifactService - Manage project artifacts
 *
 * Features:
 * - Create, read, update, delete project artifacts
 * - Role-based access control
 * - Activity logging integration
 * - Filter and search capabilities
 *
 * @example Browser (Client Component)
 * ```typescript
 * import { createClient } from '@/utils/supabase/client';
 * const supabase = createClient();
 * const artifactService = new ProjectArtifactService(supabase);
 * const result = await artifactService.list({ teamId: 'xxx' });
 * ```
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import {
  ServiceResult,
  createServiceError,
  TeamRole,
} from '@/types/collaboration';
import {
  ProjectArtifact,
  ProjectArtifactRow,
  CreateArtifactInput,
  UpdateArtifactInput,
  ArtifactFilters,
  ArtifactListResult,
  ArtifactContent,
  mapRowToArtifact,
  getArtifactTypeLabel,
} from '@/types/projectArtifacts';
import { ActivityLogService } from './ActivityLogService';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// ============================================================================
// PROJECTARTIFACTSERVICE CLASS
// ============================================================================

export class ProjectArtifactService {
  private client: SupabaseClient<Database>;
  private activityLog: ActivityLogService;

  /**
   * Create a new ProjectArtifactService instance
   * @param client - Supabase client (browser or server)
   */
  constructor(client: SupabaseClient<Database>) {
    this.client = client;
    this.activityLog = new ActivityLogService(client);
  }

  // ==========================================================================
  // CRUD OPERATIONS
  // ==========================================================================

  /**
   * Create a new project artifact
   * @param userId - User creating the artifact
   * @param input - Artifact data
   */
  async create(
    userId: string,
    input: CreateArtifactInput
  ): Promise<ServiceResult<ProjectArtifact>> {
    try {
      const { data, error } = await this.client
        .from('project_artifacts')
        .insert({
          team_id: input.teamId,
          created_by: userId,
          name: input.name,
          description: input.description ?? null,
          artifact_type: input.artifactType,
          status: input.status ?? 'published',
          debate_session_id: input.debateSessionId ?? null,
          app_id: input.appId ?? null,
          content: input.content as unknown,
          preview_url: input.previewUrl ?? null,
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: createServiceError('CREATE_FAILED', `Failed to create artifact: ${error.message}`),
        };
      }

      const artifact = mapRowToArtifact(data as ProjectArtifactRow);

      // Log activity
      await this.activityLog.log(userId, {
        teamId: input.teamId,
        actionType: 'created',
        actionCategory: 'artifact',
        targetType: 'artifact',
        targetId: artifact.id,
        targetName: artifact.name,
        summary: `Saved ${getArtifactTypeLabel(artifact.artifactType)}: ${artifact.name}`,
        details: {
          artifactType: artifact.artifactType,
          status: artifact.status,
        },
      });

      return { success: true, data: artifact };
    } catch (err) {
      return {
        success: false,
        error: createServiceError(
          'UNEXPECTED_ERROR',
          err instanceof Error ? err.message : 'An unexpected error occurred'
        ),
      };
    }
  }

  /**
   * Get an artifact by ID
   * @param artifactId - Artifact ID
   */
  async getById(artifactId: string): Promise<ServiceResult<ProjectArtifact>> {
    try {
      const { data, error } = await this.client
        .from('project_artifacts')
        .select('*')
        .eq('id', artifactId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: createServiceError('NOT_FOUND', 'Artifact not found'),
          };
        }
        return {
          success: false,
          error: createServiceError('FETCH_FAILED', `Failed to fetch artifact: ${error.message}`),
        };
      }

      const artifact = mapRowToArtifact(data as ProjectArtifactRow);

      // Fetch creator info
      const { data: creatorData } = await this.client
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .eq('id', artifact.createdBy)
        .single();

      if (creatorData) {
        artifact.creator = {
          id: creatorData.id,
          email: creatorData.email ?? '',
          fullName: creatorData.full_name ?? undefined,
          avatarUrl: creatorData.avatar_url ?? undefined,
        };
      }

      return { success: true, data: artifact };
    } catch (err) {
      return {
        success: false,
        error: createServiceError(
          'UNEXPECTED_ERROR',
          err instanceof Error ? err.message : 'An unexpected error occurred'
        ),
      };
    }
  }

  /**
   * List artifacts with filters
   * @param filters - Filter options
   */
  async list(filters: ArtifactFilters): Promise<ServiceResult<ArtifactListResult>> {
    try {
      const limit = Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
      const offset = filters.offset ?? 0;

      let query = this.client
        .from('project_artifacts')
        .select('*', { count: 'exact' })
        .eq('team_id', filters.teamId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.artifactType) {
        query = query.eq('artifact_type', filters.artifactType);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      } else {
        // By default, exclude archived
        query = query.neq('status', 'archived');
      }
      if (filters.createdBy) {
        query = query.eq('created_by', filters.createdBy);
      }
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        return {
          success: false,
          error: createServiceError('LIST_FAILED', `Failed to list artifacts: ${error.message}`),
        };
      }

      const artifacts = (data || []).map((row) => mapRowToArtifact(row as ProjectArtifactRow));

      // Fetch creator info for all artifacts
      const creatorIds = [...new Set(artifacts.map((a) => a.createdBy))];
      if (creatorIds.length > 0) {
        const { data: creatorsData } = await this.client
          .from('profiles')
          .select('id, email, full_name, avatar_url')
          .in('id', creatorIds);

        if (creatorsData) {
          const creatorsMap = new Map(creatorsData.map((c) => [c.id, c]));
          for (const artifact of artifacts) {
            const creator = creatorsMap.get(artifact.createdBy);
            if (creator) {
              artifact.creator = {
                id: creator.id,
                email: creator.email ?? '',
                fullName: creator.full_name ?? undefined,
                avatarUrl: creator.avatar_url ?? undefined,
              };
            }
          }
        }
      }

      return {
        success: true,
        data: {
          artifacts,
          total: count ?? 0,
          hasMore: (count ?? 0) > offset + artifacts.length,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: createServiceError(
          'UNEXPECTED_ERROR',
          err instanceof Error ? err.message : 'An unexpected error occurred'
        ),
      };
    }
  }

  /**
   * Update an artifact
   * @param artifactId - Artifact ID
   * @param userId - User making the update
   * @param input - Update data
   */
  async update(
    artifactId: string,
    userId: string,
    input: UpdateArtifactInput
  ): Promise<ServiceResult<ProjectArtifact>> {
    try {
      // First get existing artifact to merge content
      const existing = await this.getById(artifactId);
      if (!existing.success) {
        return existing;
      }

      const updates: Record<string, unknown> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;
      if (input.status !== undefined) updates.status = input.status;
      if (input.previewUrl !== undefined) updates.preview_url = input.previewUrl;
      if (input.content !== undefined) {
        updates.content = { ...existing.data.content, ...input.content };
      }

      const { data, error } = await this.client
        .from('project_artifacts')
        .update(updates)
        .eq('id', artifactId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: createServiceError('UPDATE_FAILED', `Failed to update artifact: ${error.message}`),
        };
      }

      const artifact = mapRowToArtifact(data as ProjectArtifactRow);

      // Log activity
      await this.activityLog.log(userId, {
        teamId: artifact.teamId,
        actionType: 'updated',
        actionCategory: 'artifact',
        targetType: 'artifact',
        targetId: artifact.id,
        targetName: artifact.name,
        summary: `Updated artifact: ${artifact.name}`,
        details: { updatedFields: Object.keys(updates) },
      });

      return { success: true, data: artifact };
    } catch (err) {
      return {
        success: false,
        error: createServiceError(
          'UNEXPECTED_ERROR',
          err instanceof Error ? err.message : 'An unexpected error occurred'
        ),
      };
    }
  }

  /**
   * Delete an artifact
   * @param artifactId - Artifact ID
   * @param userId - User making the deletion
   */
  async delete(artifactId: string, userId: string): Promise<ServiceResult<void>> {
    try {
      // Get artifact for activity log
      const existing = await this.getById(artifactId);
      if (!existing.success) {
        return { success: false, error: existing.error };
      }

      const { error } = await this.client
        .from('project_artifacts')
        .delete()
        .eq('id', artifactId);

      if (error) {
        return {
          success: false,
          error: createServiceError('DELETE_FAILED', `Failed to delete artifact: ${error.message}`),
        };
      }

      // Log activity
      await this.activityLog.log(userId, {
        teamId: existing.data.teamId,
        actionType: 'deleted',
        actionCategory: 'artifact',
        targetType: 'artifact',
        targetId: artifactId,
        targetName: existing.data.name,
        summary: `Deleted artifact: ${existing.data.name}`,
        details: { artifactType: existing.data.artifactType },
      });

      return { success: true, data: undefined };
    } catch (err) {
      return {
        success: false,
        error: createServiceError(
          'UNEXPECTED_ERROR',
          err instanceof Error ? err.message : 'An unexpected error occurred'
        ),
      };
    }
  }

  /**
   * Archive an artifact (soft delete)
   * @param artifactId - Artifact ID
   * @param userId - User archiving the artifact
   */
  async archive(artifactId: string, userId: string): Promise<ServiceResult<ProjectArtifact>> {
    return this.update(artifactId, userId, { status: 'archived' });
  }

  // ==========================================================================
  // PERMISSION HELPERS
  // ==========================================================================

  /**
   * Check if a user has permission to perform an action on artifacts
   * @param userId - User ID
   * @param teamId - Team ID
   * @param action - Action type
   */
  async checkPermission(
    userId: string,
    teamId: string,
    action: 'view' | 'create' | 'edit' | 'delete'
  ): Promise<boolean> {
    try {
      const { data } = await this.client
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (!data) return false;

      const role = data.role as TeamRole;

      switch (action) {
        case 'view':
          return ['owner', 'admin', 'editor', 'viewer'].includes(role);
        case 'create':
          return ['owner', 'admin', 'editor'].includes(role);
        case 'edit':
        case 'delete':
          return ['owner', 'admin', 'editor'].includes(role);
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * Check if a user can edit a specific artifact
   * @param userId - User ID
   * @param artifact - The artifact
   */
  async canEditArtifact(userId: string, artifact: ProjectArtifact): Promise<boolean> {
    try {
      const { data } = await this.client
        .from('team_members')
        .select('role')
        .eq('team_id', artifact.teamId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (!data) return false;

      const role = data.role as TeamRole;

      // Owner and admin can edit any artifact
      if (['owner', 'admin'].includes(role)) {
        return true;
      }

      // Editor can only edit their own artifacts
      if (role === 'editor' && artifact.createdBy === userId) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get user's role in a team
   * @param userId - User ID
   * @param teamId - Team ID
   */
  async getUserRole(userId: string, teamId: string): Promise<TeamRole | null> {
    try {
      const { data } = await this.client
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      return data?.role as TeamRole | null;
    } catch {
      return null;
    }
  }

  // ==========================================================================
  // AGGREGATE QUERIES
  // ==========================================================================

  /**
   * Get artifact counts by type for a team
   * @param teamId - Team ID
   */
  async getCountsByType(
    teamId: string
  ): Promise<ServiceResult<Record<string, number>>> {
    try {
      const { data, error } = await this.client
        .from('project_artifacts')
        .select('artifact_type')
        .eq('team_id', teamId)
        .neq('status', 'archived');

      if (error) {
        return {
          success: false,
          error: createServiceError('FETCH_FAILED', error.message),
        };
      }

      const counts: Record<string, number> = {
        ai_builder_plan: 0,
        ai_builder_app: 0,
        ai_debate_session: 0,
      };

      for (const row of data || []) {
        const type = row.artifact_type as string;
        counts[type] = (counts[type] || 0) + 1;
      }

      return { success: true, data: counts };
    } catch (err) {
      return {
        success: false,
        error: createServiceError(
          'UNEXPECTED_ERROR',
          err instanceof Error ? err.message : 'An unexpected error occurred'
        ),
      };
    }
  }

  /**
   * Get recent artifacts for a team (for activity feed)
   * @param teamId - Team ID
   * @param limit - Maximum number of artifacts
   */
  async getRecent(teamId: string, limit = 5): Promise<ServiceResult<ProjectArtifact[]>> {
    const result = await this.list({
      teamId,
      limit,
      status: undefined, // Include all except archived (default)
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data.artifacts };
  }
}
