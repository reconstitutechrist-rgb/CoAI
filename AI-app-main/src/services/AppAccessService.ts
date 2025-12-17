/**
 * AppAccessService - App access and sharing management service
 *
 * Features:
 * - App visibility management (public, team, invite-only, etc.)
 * - Share link generation and validation
 * - Collaborator management
 * - Permission checking utilities
 *
 * @example Browser (Client Component)
 * ```typescript
 * import { createClient } from '@/utils/supabase/client';
 * const supabase = createClient();
 * const accessService = new AppAccessService(supabase);
 * const result = await accessService.getAccessSettings(appId);
 * ```
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import {
  AppAccess,
  AppCollaborator,
  Visibility,
  Permission,
  UpdateAppAccessInput,
  ShareLinkOptions,
  ShareLink,
  AddCollaboratorInput,
  ServiceResult,
  UserInfo,
  createServiceError,
  hasMinimumPermission,
} from '@/types/collaboration';

// ============================================================================
// TYPES
// ============================================================================

interface AccessValidation {
  hasAccess: boolean;
  permission: Permission | null;
  reason?: string;
}

// ============================================================================
// APPACCESSSERVICE CLASS
// ============================================================================

export class AppAccessService {
  private client: SupabaseClient<Database>;

  /**
   * Create a new AppAccessService instance
   * @param client - Supabase client (browser or server)
   */
  constructor(client: SupabaseClient<Database>) {
    this.client = client;
  }

  // ==========================================================================
  // ACCESS SETTINGS
  // ==========================================================================

  /**
   * Get access settings for an app
   * @param appId - App ID
   */
  async getAccessSettings(appId: string): Promise<ServiceResult<AppAccess>> {
    try {
      const { data, error } = await this.client
        .from('app_access')
        .select(
          `
          *,
          team:teams(id, name, slug)
        `
        )
        .eq('app_id', appId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No access settings exist, create default
          return await this.createDefaultAccess(appId);
        }
        return {
          success: false,
          error: createServiceError('FETCH_FAILED', `Failed to fetch access: ${error.message}`),
        };
      }

      return { success: true, data: this.mapAccessFromDb(data) };
    } catch (err) {
      return {
        success: false,
        error: createServiceError('UNEXPECTED_ERROR', 'An unexpected error occurred'),
      };
    }
  }

  /**
   * Update access settings for an app
   * @param appId - App ID
   * @param input - Update data
   */
  async updateAccessSettings(
    appId: string,
    input: UpdateAppAccessInput
  ): Promise<ServiceResult<AppAccess>> {
    try {
      const updateData: Record<string, unknown> = {};

      if (input.visibility !== undefined) {
        updateData.visibility = input.visibility;
      }

      if (input.teamId !== undefined) {
        updateData.team_id = input.teamId;
        // If assigning to team, ensure visibility allows team access
        if (input.teamId && !input.visibility) {
          updateData.visibility = 'team';
        }
      }

      // Check if access record exists
      const { data: existing } = await this.client
        .from('app_access')
        .select('id')
        .eq('app_id', appId)
        .single();

      if (existing) {
        // Update existing
        const { data, error } = await this.client
          .from('app_access')
          .update(updateData)
          .eq('app_id', appId)
          .select()
          .single();

        if (error) {
          return {
            success: false,
            error: createServiceError('UPDATE_FAILED', `Failed to update access: ${error.message}`),
          };
        }

        return { success: true, data: this.mapAccessFromDb(data) };
      } else {
        // Create new
        const { data, error } = await this.client
          .from('app_access')
          .insert({
            app_id: appId,
            visibility: (input.visibility || 'private') as string,
            team_id: input.teamId || null,
          })
          .select()
          .single();

        if (error) {
          return {
            success: false,
            error: createServiceError('CREATE_FAILED', `Failed to create access: ${error.message}`),
          };
        }

        return { success: true, data: this.mapAccessFromDb(data) };
      }
    } catch (err) {
      return {
        success: false,
        error: createServiceError('UNEXPECTED_ERROR', 'An unexpected error occurred'),
      };
    }
  }

  /**
   * Create default access settings for an app
   */
  private async createDefaultAccess(appId: string): Promise<ServiceResult<AppAccess>> {
    const { data, error } = await this.client
      .from('app_access')
      .insert({
        app_id: appId,
        visibility: 'private',
      })
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: createServiceError(
          'CREATE_FAILED',
          `Failed to create default access: ${error.message}`
        ),
      };
    }

    return { success: true, data: this.mapAccessFromDb(data) };
  }

  // ==========================================================================
  // SHARE LINKS
  // ==========================================================================

  /**
   * Create a share link for an app
   * @param appId - App ID
   * @param options - Share link options
   */
  async createShareLink(appId: string, options: ShareLinkOptions): Promise<ServiceResult<ShareLink>> {
    try {
      const shareToken = this.generateShareToken();
      const expiresAt = options.expiresInHours
        ? new Date(Date.now() + options.expiresInHours * 60 * 60 * 1000).toISOString()
        : null;

      // Ensure access record exists
      const { data: existing } = await this.client
        .from('app_access')
        .select('id')
        .eq('app_id', appId)
        .single();

      const updateData = {
        share_token: shareToken,
        share_expires_at: expiresAt,
        share_permission: options.permission,
      };

      let result;
      if (existing) {
        result = await this.client
          .from('app_access')
          .update(updateData)
          .eq('app_id', appId)
          .select()
          .single();
      } else {
        result = await this.client
          .from('app_access')
          .insert({
            app_id: appId,
            visibility: 'invite_only',
            ...updateData,
          })
          .select()
          .single();
      }

      if (result.error) {
        return {
          success: false,
          error: createServiceError(
            'CREATE_FAILED',
            `Failed to create share link: ${result.error.message}`
          ),
        };
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const shareUrl = `${baseUrl}/shared/${shareToken}`;

      return {
        success: true,
        data: {
          url: shareUrl,
          token: shareToken,
          permission: options.permission,
          expiresAt: expiresAt || undefined,
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
   * Validate a share token
   * @param token - Share token
   */
  async validateShareToken(
    token: string
  ): Promise<ServiceResult<{ appId: string; permission: 'view' | 'edit' }>> {
    try {
      const { data, error } = await this.client
        .from('app_access')
        .select('app_id, share_expires_at, share_permission')
        .eq('share_token', token)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: createServiceError('NOT_FOUND', 'Share link not found'),
          };
        }
        return {
          success: false,
          error: createServiceError('FETCH_FAILED', `Failed to validate: ${error.message}`),
        };
      }

      // Check expiration
      if (data.share_expires_at && new Date(data.share_expires_at) < new Date()) {
        return {
          success: false,
          error: createServiceError('EXPIRED', 'This share link has expired'),
        };
      }

      return {
        success: true,
        data: {
          appId: data.app_id,
          permission: data.share_permission as 'view' | 'edit',
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
   * Revoke a share link
   * @param appId - App ID
   */
  async revokeShareLink(appId: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await this.client
        .from('app_access')
        .update({
          share_token: null,
          share_expires_at: null,
        })
        .eq('app_id', appId);

      if (error) {
        return {
          success: false,
          error: createServiceError('UPDATE_FAILED', `Failed to revoke: ${error.message}`),
        };
      }

      return { success: true, data: undefined };
    } catch (err) {
      return {
        success: false,
        error: createServiceError('UNEXPECTED_ERROR', 'An unexpected error occurred'),
      };
    }
  }

  // ==========================================================================
  // COLLABORATORS
  // ==========================================================================

  /**
   * Get all collaborators for an app
   * @param appId - App ID
   */
  async getCollaborators(appId: string): Promise<ServiceResult<AppCollaborator[]>> {
    try {
      const { data, error } = await this.client
        .from('app_collaborators')
        .select('*')
        .eq('app_id', appId)
        .order('created_at', { ascending: true });

      if (error) {
        return {
          success: false,
          error: createServiceError(
            'FETCH_FAILED',
            `Failed to fetch collaborators: ${error.message}`
          ),
        };
      }

      // Fetch user details
      const userIds = data.map((c) => c.user_id);
      const { data: users } = await this.client
        .from('user_profiles')
        .select('user_id, email, full_name, avatar_url')
        .in('user_id', userIds);

      const userMap = new Map(users?.map((u) => [u.user_id, u]) || []);

      const collaborators = data.map((row) => {
        const user = userMap.get(row.user_id);
        return this.mapCollaboratorFromDb(row, user);
      });

      return { success: true, data: collaborators };
    } catch (err) {
      return {
        success: false,
        error: createServiceError('UNEXPECTED_ERROR', 'An unexpected error occurred'),
      };
    }
  }

  /**
   * Get a single collaborator by their record ID
   * @param collaboratorId - Collaborator record ID
   */
  async getCollaboratorById(collaboratorId: string): Promise<ServiceResult<AppCollaborator>> {
    try {
      const { data, error } = await this.client
        .from('app_collaborators')
        .select('*')
        .eq('id', collaboratorId)
        .single();

      if (error) {
        return {
          success: false,
          error: createServiceError('FETCH_FAILED', `Failed to fetch collaborator: ${error.message}`),
        };
      }

      if (!data) {
        return {
          success: false,
          error: createServiceError('NOT_FOUND', 'Collaborator not found'),
        };
      }

      // Fetch user details
      const { data: user } = await this.client
        .from('user_profiles')
        .select('user_id, email, full_name, avatar_url')
        .eq('user_id', data.user_id)
        .single();

      return { success: true, data: this.mapCollaboratorFromDb(data, user) };
    } catch (err) {
      return {
        success: false,
        error: createServiceError('UNEXPECTED_ERROR', 'An unexpected error occurred'),
      };
    }
  }

  /**
   * Add a collaborator to an app
   * @param appId - App ID
   * @param userId - User ID to add
   * @param permission - Permission level
   * @param addedBy - User ID who added
   */
  async addCollaborator(
    appId: string,
    userId: string,
    permission: Permission,
    addedBy: string
  ): Promise<ServiceResult<AppCollaborator>> {
    try {
      const { data, error } = await this.client
        .from('app_collaborators')
        .insert({
          app_id: appId,
          user_id: userId,
          permission,
          added_by: addedBy,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return {
            success: false,
            error: createServiceError('ALREADY_COLLABORATOR', 'User is already a collaborator'),
          };
        }
        return {
          success: false,
          error: createServiceError('ADD_FAILED', `Failed to add collaborator: ${error.message}`),
        };
      }

      return { success: true, data: this.mapCollaboratorFromDb(data) };
    } catch (err) {
      return {
        success: false,
        error: createServiceError('UNEXPECTED_ERROR', 'An unexpected error occurred'),
      };
    }
  }

  /**
   * Add collaborator by email
   * @param appId - App ID
   * @param email - User email
   * @param permission - Permission level
   * @param addedBy - User ID who added
   */
  async addCollaboratorByEmail(
    appId: string,
    email: string,
    permission: Permission,
    addedBy: string
  ): Promise<ServiceResult<AppCollaborator>> {
    try {
      // Find user by email
      const { data: user } = await this.client
        .from('user_profiles')
        .select('user_id')
        .eq('email', email)
        .single();

      if (!user) {
        return {
          success: false,
          error: createServiceError('USER_NOT_FOUND', 'No user found with that email'),
        };
      }

      return await this.addCollaborator(appId, user.user_id, permission, addedBy);
    } catch (err) {
      return {
        success: false,
        error: createServiceError('UNEXPECTED_ERROR', 'An unexpected error occurred'),
      };
    }
  }

  /**
   * Update collaborator permission by collaborator ID
   * @param collaboratorId - Collaborator record ID
   * @param permission - New permission level
   */
  async updateCollaboratorPermission(
    collaboratorId: string,
    permission: Permission
  ): Promise<ServiceResult<AppCollaborator>> {
    try {
      const { data, error } = await this.client
        .from('app_collaborators')
        .update({ permission })
        .eq('id', collaboratorId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: createServiceError('UPDATE_FAILED', `Failed to update: ${error.message}`),
        };
      }

      return { success: true, data: this.mapCollaboratorFromDb(data) };
    } catch (err) {
      return {
        success: false,
        error: createServiceError('UNEXPECTED_ERROR', 'An unexpected error occurred'),
      };
    }
  }

  /**
   * Update collaborator permission by app ID and user ID
   * @param appId - App ID
   * @param userId - User ID to update
   * @param permission - New permission level
   */
  async updateCollaboratorPermissionByUser(
    appId: string,
    userId: string,
    permission: Permission
  ): Promise<ServiceResult<AppCollaborator>> {
    try {
      const { data, error } = await this.client
        .from('app_collaborators')
        .update({ permission })
        .eq('app_id', appId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: createServiceError('UPDATE_FAILED', `Failed to update: ${error.message}`),
        };
      }

      return { success: true, data: this.mapCollaboratorFromDb(data) };
    } catch (err) {
      return {
        success: false,
        error: createServiceError('UNEXPECTED_ERROR', 'An unexpected error occurred'),
      };
    }
  }

  /**
   * Remove a collaborator by collaborator ID
   * @param collaboratorId - Collaborator record ID
   */
  async removeCollaborator(collaboratorId: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await this.client
        .from('app_collaborators')
        .delete()
        .eq('id', collaboratorId);

      if (error) {
        return {
          success: false,
          error: createServiceError('REMOVE_FAILED', `Failed to remove: ${error.message}`),
        };
      }

      return { success: true, data: undefined };
    } catch (err) {
      return {
        success: false,
        error: createServiceError('UNEXPECTED_ERROR', 'An unexpected error occurred'),
      };
    }
  }

  /**
   * Remove a collaborator by app ID and user ID
   * @param appId - App ID
   * @param userId - User ID to remove
   */
  async removeCollaboratorByUser(appId: string, userId: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await this.client
        .from('app_collaborators')
        .delete()
        .eq('app_id', appId)
        .eq('user_id', userId);

      if (error) {
        return {
          success: false,
          error: createServiceError('REMOVE_FAILED', `Failed to remove: ${error.message}`),
        };
      }

      return { success: true, data: undefined };
    } catch (err) {
      return {
        success: false,
        error: createServiceError('UNEXPECTED_ERROR', 'An unexpected error occurred'),
      };
    }
  }

  // ==========================================================================
  // PERMISSION CHECKING
  // ==========================================================================

  /**
   * Get a user's permission on an app (returns ServiceResult)
   * @param appId - App ID
   * @param userId - User ID (null for unauthenticated)
   * @param shareToken - Optional share token
   */
  async getUserPermission(
    appId: string,
    userId: string | null,
    shareToken?: string
  ): Promise<ServiceResult<Permission | null>> {
    try {
      const permission = await this.getUserPermissionRaw(appId, userId, shareToken);
      return { success: true, data: permission };
    } catch (err) {
      return {
        success: false,
        error: createServiceError('UNEXPECTED_ERROR', 'Failed to get user permission'),
      };
    }
  }

  /**
   * Get a user's permission on an app (raw)
   * @param appId - App ID
   * @param userId - User ID (null for unauthenticated)
   * @param shareToken - Optional share token
   */
  private async getUserPermissionRaw(
    appId: string,
    userId: string | null,
    shareToken?: string
  ): Promise<Permission | null> {
    // Check owner
    const { data: app } = await this.client
      .from('generated_apps')
      .select('user_id')
      .eq('id', appId)
      .single();

    if (app && userId && app.user_id === userId) {
      return 'owner';
    }

    // Check direct collaborator
    if (userId) {
      const { data: collaborator } = await this.client
        .from('app_collaborators')
        .select('permission')
        .eq('app_id', appId)
        .eq('user_id', userId)
        .single();

      if (collaborator) {
        return collaborator.permission as Permission;
      }
    }

    // Check team membership
    if (userId) {
      const { data: teamAccess } = await this.client
        .from('app_access')
        .select('team_id')
        .eq('app_id', appId)
        .single();

      if (teamAccess?.team_id) {
        const { data: member } = await this.client
          .from('team_members')
          .select('role')
          .eq('team_id', teamAccess.team_id)
          .eq('user_id', userId)
          .eq('status', 'active')
          .single();

        if (member) {
          // Map team role to app permission
          const roleToPermission: Record<string, Permission> = {
            owner: 'admin',
            admin: 'admin',
            editor: 'edit',
            viewer: 'view',
          };
          return roleToPermission[member.role] || 'view';
        }
      }
    }

    // Check share token
    if (shareToken) {
      const result = await this.validateShareToken(shareToken);
      if (result.success && result.data.appId === appId) {
        return result.data.permission;
      }
    }

    // Check public access
    const { data: access } = await this.client
      .from('app_access')
      .select('visibility')
      .eq('app_id', appId)
      .single();

    if (access?.visibility === 'public') {
      return 'view';
    }

    if (access?.visibility === 'logged_in' && userId) {
      return 'view';
    }

    return null;
  }

  /**
   * Check if a user can access an app
   * @param appId - App ID
   * @param userId - User ID (null for unauthenticated)
   * @param shareToken - Optional share token
   */
  async canUserAccess(
    appId: string,
    userId: string | null,
    shareToken?: string
  ): Promise<AccessValidation> {
    const permission = await this.getUserPermissionRaw(appId, userId, shareToken);

    if (permission) {
      return { hasAccess: true, permission };
    }

    return {
      hasAccess: false,
      permission: null,
      reason: 'You do not have access to this app',
    };
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Generate a unique share token
   */
  private generateShareToken(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < 24; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Map database row to AppAccess type
   */
  private mapAccessFromDb(row: Record<string, unknown>): AppAccess {
    return {
      id: row.id as string,
      appId: row.app_id as string,
      visibility: row.visibility as Visibility,
      teamId: row.team_id as string | undefined,
      shareToken: row.share_token as string | undefined,
      shareExpiresAt: row.share_expires_at as string | undefined,
      sharePermission: (row.share_permission as 'view' | 'edit') || 'view',
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      team: row.team as Pick<
        { id: string; name: string; slug: string },
        'id' | 'name' | 'slug'
      > | undefined,
    };
  }

  /**
   * Map database row to AppCollaborator type
   */
  private mapCollaboratorFromDb(
    row: Record<string, unknown>,
    userInfo?: Record<string, unknown> | null
  ): AppCollaborator {
    return {
      id: row.id as string,
      appId: row.app_id as string,
      userId: row.user_id as string,
      permission: row.permission as Permission,
      addedBy: row.added_by as string | undefined,
      createdAt: row.created_at as string,
      user: userInfo
        ? {
            id: userInfo.user_id as string,
            email: userInfo.email as string,
            fullName: userInfo.full_name as string | undefined,
            avatarUrl: userInfo.avatar_url as string | undefined,
          }
        : undefined,
    };
  }
}

export default AppAccessService;
