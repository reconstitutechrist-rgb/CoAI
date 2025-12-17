/**
 * TeamService - Team and workspace management service
 *
 * Features:
 * - Team CRUD operations
 * - Member management with role-based access
 * - Invitation system (email and link-based)
 * - Permission checking utilities
 *
 * @example Browser (Client Component)
 * ```typescript
 * import { createClient } from '@/utils/supabase/client';
 * const supabase = createClient();
 * const teamService = new TeamService(supabase);
 * const result = await teamService.createTeam({ name: 'My Team' });
 * ```
 *
 * @example Server (API Route)
 * ```typescript
 * import { createClient } from '@/utils/supabase/server';
 * const supabase = await createClient();
 * const teamService = new TeamService(supabase);
 * const result = await teamService.getTeam(teamId);
 * ```
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import {
  Team,
  TeamMember,
  TeamInvite,
  TeamRole,
  TeamSettings,
  TeamAction,
  CreateTeamInput,
  UpdateTeamInput,
  CreateInviteServiceInput,
  InviteLink,
  ServiceResult,
  ServiceError,
  MemberStatus,
  UserInfo,
  createServiceError,
  hasMinimumRole,
} from '@/types/collaboration';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_TEAM_SETTINGS: TeamSettings = {
  allowMemberInvites: false,
  defaultMemberRole: 'viewer',
  requireApprovalForJoin: true,
};

/**
 * Actions allowed for each role
 */
const ROLE_PERMISSIONS: Record<TeamRole, TeamAction[]> = {
  owner: ['view', 'edit', 'invite', 'manage_members', 'manage_settings', 'delete'],
  admin: ['view', 'edit', 'invite', 'manage_members', 'manage_settings'],
  editor: ['view', 'edit', 'invite'],
  viewer: ['view'],
};

// ============================================================================
// TEAMSERVICE CLASS
// ============================================================================

export class TeamService {
  private client: SupabaseClient<Database>;

  /**
   * Create a new TeamService instance
   * @param client - Supabase client (browser or server)
   */
  constructor(client: SupabaseClient<Database>) {
    this.client = client;
  }

  // ==========================================================================
  // TEAM CRUD
  // ==========================================================================

  /**
   * Create a new team
   * @param input - Team creation data
   * @param userId - ID of the user creating the team (will be owner)
   */
  async createTeam(input: CreateTeamInput, userId: string): Promise<ServiceResult<Team>> {
    try {
      // Generate slug from name
      const slug = await this.generateUniqueSlug(input.name);

      const { data, error } = await this.client
        .from('teams')
        .insert({
          name: input.name,
          slug,
          description: input.description || null,
          owner_id: userId,
          settings: { ...DEFAULT_TEAM_SETTINGS, ...input.settings },
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: createServiceError('CREATE_FAILED', `Failed to create team: ${error.message}`),
        };
      }

      // Team owner is automatically added as member via database trigger
      return { success: true, data: this.mapTeamFromDb(data) };
    } catch (err) {
      return {
        success: false,
        error: createServiceError('UNEXPECTED_ERROR', 'An unexpected error occurred', {
          originalError: err,
        }),
      };
    }
  }

  /**
   * Get a team by ID
   * @param teamId - Team ID
   */
  async getTeam(teamId: string): Promise<ServiceResult<Team>> {
    try {
      const { data, error } = await this.client
        .from('teams')
        .select(
          `
          *,
          owner:auth.users!teams_owner_id_fkey(id, email, raw_user_meta_data)
        `
        )
        .eq('id', teamId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: createServiceError('NOT_FOUND', 'Team not found'),
          };
        }
        return {
          success: false,
          error: createServiceError('FETCH_FAILED', `Failed to fetch team: ${error.message}`),
        };
      }

      // Get member count
      const { count } = await this.client
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('status', 'active');

      const team = this.mapTeamFromDb(data);
      team.memberCount = count || 0;

      return { success: true, data: team };
    } catch (err) {
      return {
        success: false,
        error: createServiceError('UNEXPECTED_ERROR', 'An unexpected error occurred'),
      };
    }
  }

  /**
   * Get a team by slug
   * @param slug - Team slug
   */
  async getTeamBySlug(slug: string): Promise<ServiceResult<Team>> {
    try {
      const { data, error } = await this.client
        .from('teams')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: createServiceError('NOT_FOUND', 'Team not found'),
          };
        }
        return {
          success: false,
          error: createServiceError('FETCH_FAILED', `Failed to fetch team: ${error.message}`),
        };
      }

      return { success: true, data: this.mapTeamFromDb(data) };
    } catch (err) {
      return {
        success: false,
        error: createServiceError('UNEXPECTED_ERROR', 'An unexpected error occurred'),
      };
    }
  }

  /**
   * Get all teams for a user
   * @param userId - User ID
   */
  async getUserTeams(userId: string): Promise<ServiceResult<Team[]>> {
    try {
      const { data, error } = await this.client
        .from('team_members')
        .select(
          `
          team:teams(*)
        `
        )
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) {
        return {
          success: false,
          error: createServiceError('FETCH_FAILED', `Failed to fetch teams: ${error.message}`),
        };
      }

      const teams = data
        .map((row) => row.team)
        .filter((team): team is NonNullable<typeof team> => team !== null)
        .map((team) => this.mapTeamFromDb(team));

      return { success: true, data: teams };
    } catch (err) {
      return {
        success: false,
        error: createServiceError('UNEXPECTED_ERROR', 'An unexpected error occurred'),
      };
    }
  }

  /**
   * Update a team
   * @param teamId - Team ID
   * @param input - Update data
   */
  async updateTeam(teamId: string, input: UpdateTeamInput): Promise<ServiceResult<Team>> {
    try {
      const updateData: Record<string, unknown> = {};

      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.avatarUrl !== undefined) updateData.avatar_url = input.avatarUrl;
      if (input.settings !== undefined) {
        // Merge with existing settings
        const { data: existing } = await this.client
          .from('teams')
          .select('settings')
          .eq('id', teamId)
          .single();

        updateData.settings = {
          ...DEFAULT_TEAM_SETTINGS,
          ...(existing?.settings || {}),
          ...input.settings,
        };
      }

      const { data, error } = await this.client
        .from('teams')
        .update(updateData)
        .eq('id', teamId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: createServiceError('UPDATE_FAILED', `Failed to update team: ${error.message}`),
        };
      }

      return { success: true, data: this.mapTeamFromDb(data) };
    } catch (err) {
      return {
        success: false,
        error: createServiceError('UNEXPECTED_ERROR', 'An unexpected error occurred'),
      };
    }
  }

  /**
   * Delete a team
   * @param teamId - Team ID
   */
  async deleteTeam(teamId: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await this.client.from('teams').delete().eq('id', teamId);

      if (error) {
        return {
          success: false,
          error: createServiceError('DELETE_FAILED', `Failed to delete team: ${error.message}`),
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
  // MEMBER MANAGEMENT
  // ==========================================================================

  /**
   * Get all members of a team
   * @param teamId - Team ID
   */
  async getMembers(teamId: string): Promise<ServiceResult<TeamMember[]>> {
    try {
      const { data, error } = await this.client
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)
        .eq('status', 'active')
        .order('joined_at', { ascending: true });

      if (error) {
        return {
          success: false,
          error: createServiceError('FETCH_FAILED', `Failed to fetch members: ${error.message}`),
        };
      }

      // Fetch user details for each member
      const userIds = data.map((m) => m.user_id);
      const { data: users } = await this.client
        .from('user_profiles')
        .select('user_id, email, full_name, avatar_url')
        .in('user_id', userIds);

      const userMap = new Map(users?.map((u) => [u.user_id, u]) || []);

      const members = data.map((row) => {
        const user = userMap.get(row.user_id);
        return this.mapMemberFromDb(row, user);
      });

      return { success: true, data: members };
    } catch (err) {
      return {
        success: false,
        error: createServiceError('UNEXPECTED_ERROR', 'An unexpected error occurred'),
      };
    }
  }

  /**
   * Get a single member by their membership ID
   * @param memberId - Team member record ID
   */
  async getMemberById(memberId: string): Promise<ServiceResult<TeamMember>> {
    try {
      const { data, error } = await this.client
        .from('team_members')
        .select('*')
        .eq('id', memberId)
        .single();

      if (error) {
        return {
          success: false,
          error: createServiceError('FETCH_FAILED', `Failed to fetch member: ${error.message}`),
        };
      }

      if (!data) {
        return {
          success: false,
          error: createServiceError('NOT_FOUND', 'Member not found'),
        };
      }

      // Fetch user details
      const { data: user } = await this.client
        .from('user_profiles')
        .select('user_id, email, full_name, avatar_url')
        .eq('user_id', data.user_id)
        .single();

      return { success: true, data: this.mapMemberFromDb(data, user) };
    } catch (err) {
      return {
        success: false,
        error: createServiceError('UNEXPECTED_ERROR', 'An unexpected error occurred'),
      };
    }
  }

  /**
   * Add a member to a team
   * @param teamId - Team ID
   * @param userId - User ID to add
   * @param role - Role to assign
   * @param invitedBy - User ID who invited
   */
  async addMember(
    teamId: string,
    userId: string,
    role: TeamRole,
    invitedBy: string
  ): Promise<ServiceResult<TeamMember>> {
    try {
      const { data, error } = await this.client
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: userId,
          role,
          invited_by: invitedBy,
          invited_at: new Date().toISOString(),
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          // Unique violation - user already member
          return {
            success: false,
            error: createServiceError('ALREADY_MEMBER', 'User is already a member of this team'),
          };
        }
        return {
          success: false,
          error: createServiceError('ADD_FAILED', `Failed to add member: ${error.message}`),
        };
      }

      return { success: true, data: this.mapMemberFromDb(data) };
    } catch (err) {
      return {
        success: false,
        error: createServiceError('UNEXPECTED_ERROR', 'An unexpected error occurred'),
      };
    }
  }

  /**
   * Update a member's role
   * @param teamId - Team ID
   * @param userId - User ID to update
   * @param role - New role
   */
  async updateMemberRole(
    teamId: string,
    userId: string,
    role: TeamRole
  ): Promise<ServiceResult<TeamMember>> {
    try {
      // Cannot change owner role this way
      if (role === 'owner') {
        return {
          success: false,
          error: createServiceError(
            'INVALID_ROLE',
            'Cannot assign owner role. Use transferOwnership instead.'
          ),
        };
      }

      // Check if user is owner (cannot demote owner)
      const { data: existing } = await this.client
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .single();

      if (existing?.role === 'owner') {
        return {
          success: false,
          error: createServiceError('CANNOT_DEMOTE_OWNER', 'Cannot change the role of team owner'),
        };
      }

      const { data, error } = await this.client
        .from('team_members')
        .update({ role })
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: createServiceError('UPDATE_FAILED', `Failed to update role: ${error.message}`),
        };
      }

      return { success: true, data: this.mapMemberFromDb(data) };
    } catch (err) {
      return {
        success: false,
        error: createServiceError('UNEXPECTED_ERROR', 'An unexpected error occurred'),
      };
    }
  }

  /**
   * Remove a member from a team
   * @param teamId - Team ID
   * @param userId - User ID to remove
   */
  async removeMember(teamId: string, userId: string): Promise<ServiceResult<void>> {
    try {
      // Check if user is owner (cannot remove owner)
      const { data: existing } = await this.client
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .single();

      if (existing?.role === 'owner') {
        return {
          success: false,
          error: createServiceError(
            'CANNOT_REMOVE_OWNER',
            'Cannot remove team owner. Delete team or transfer ownership first.'
          ),
        };
      }

      const { error } = await this.client
        .from('team_members')
        .update({ status: 'removed' })
        .eq('team_id', teamId)
        .eq('user_id', userId);

      if (error) {
        return {
          success: false,
          error: createServiceError('REMOVE_FAILED', `Failed to remove member: ${error.message}`),
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
   * Get a user's role in a team
   * @param teamId - Team ID
   * @param userId - User ID
   */
  async getUserRole(teamId: string, userId: string): Promise<TeamRole | null> {
    const { data } = await this.client
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    return (data?.role as TeamRole) || null;
  }

  // ==========================================================================
  // INVITATION MANAGEMENT
  // ==========================================================================

  /**
   * Create an invitation to join a team
   * @param teamId - Team ID
   * @param input - Invitation options (uses expiresInHours internally)
   * @param createdBy - User ID creating the invite
   */
  async createInvite(
    teamId: string,
    input: CreateInviteServiceInput,
    createdBy: string
  ): Promise<ServiceResult<InviteLink>> {
    try {
      // Generate unique invite code
      const inviteCode = this.generateInviteCode();

      const expiresAt = input.expiresInHours
        ? new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000).toISOString()
        : null;

      const { data, error } = await this.client
        .from('team_invites')
        .insert({
          team_id: teamId,
          invite_code: inviteCode,
          email: input.email || null,
          role: input.role,
          created_by: createdBy,
          expires_at: expiresAt,
          max_uses: input.maxUses || null,
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: createServiceError('CREATE_FAILED', `Failed to create invite: ${error.message}`),
        };
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const inviteUrl = `${baseUrl}/invite/${inviteCode}`;

      return {
        success: true,
        data: {
          url: inviteUrl,
          code: inviteCode,
          expiresAt: data.expires_at || undefined,
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
   * Get all pending (non-expired, not fully used) invites for a team
   * @param teamId - Team ID
   */
  async getPendingInvites(teamId: string): Promise<ServiceResult<TeamInvite[]>> {
    try {
      const { data, error } = await this.client
        .from('team_invites')
        .select('*')
        .eq('team_id', teamId)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

      if (error) {
        return {
          success: false,
          error: createServiceError('FETCH_FAILED', `Failed to fetch invites: ${error.message}`),
        };
      }

      // Filter out fully used invites and map to type
      const invites = data
        .filter((inv) => !inv.max_uses || inv.use_count < inv.max_uses)
        .map((row) => this.mapInviteFromDb(row));

      return { success: true, data: invites };
    } catch (err) {
      return {
        success: false,
        error: createServiceError('UNEXPECTED_ERROR', 'An unexpected error occurred'),
      };
    }
  }

  /**
   * Get invite by code
   * @param code - Invitation code
   */
  async getInviteByCode(code: string): Promise<ServiceResult<TeamInvite>> {
    try {
      const { data, error } = await this.client
        .from('team_invites')
        .select(
          `
          *,
          team:teams(id, name, slug, avatar_url)
        `
        )
        .eq('invite_code', code)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: createServiceError('NOT_FOUND', 'Invitation not found'),
          };
        }
        return {
          success: false,
          error: createServiceError('FETCH_FAILED', `Failed to fetch invite: ${error.message}`),
        };
      }

      // Validate invite
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return {
          success: false,
          error: createServiceError('EXPIRED', 'This invitation has expired'),
        };
      }

      if (data.max_uses && data.use_count >= data.max_uses) {
        return {
          success: false,
          error: createServiceError(
            'MAX_USES_REACHED',
            'This invitation has reached its maximum uses'
          ),
        };
      }

      return { success: true, data: this.mapInviteFromDb(data) };
    } catch (err) {
      return {
        success: false,
        error: createServiceError('UNEXPECTED_ERROR', 'An unexpected error occurred'),
      };
    }
  }

  /**
   * Accept an invitation
   * @param code - Invitation code
   * @param userId - User accepting the invite
   */
  async acceptInvite(code: string, userId: string): Promise<ServiceResult<TeamMember>> {
    try {
      // Get and validate invite
      const inviteResult = await this.getInviteByCode(code);
      if (!inviteResult.success) {
        return { success: false, error: inviteResult.error };
      }

      const invite = inviteResult.data;

      // Check email restriction
      if (invite.email) {
        const { data: userProfile } = await this.client
          .from('user_profiles')
          .select('email')
          .eq('user_id', userId)
          .single();

        if (userProfile?.email !== invite.email) {
          return {
            success: false,
            error: createServiceError(
              'EMAIL_MISMATCH',
              'This invitation was sent to a different email address'
            ),
          };
        }
      }

      // Check if already member
      const existingRole = await this.getUserRole(invite.teamId, userId);
      if (existingRole) {
        return {
          success: false,
          error: createServiceError('ALREADY_MEMBER', 'You are already a member of this team'),
        };
      }

      // Add member
      const addResult = await this.addMember(invite.teamId, userId, invite.role, invite.createdBy);
      if (!addResult.success) {
        return { success: false, error: addResult.error };
      }

      // Increment use count
      await this.client
        .from('team_invites')
        .update({ use_count: invite.useCount + 1 })
        .eq('id', invite.id);

      return { success: true, data: addResult.data };
    } catch (err) {
      return {
        success: false,
        error: createServiceError('UNEXPECTED_ERROR', 'An unexpected error occurred'),
      };
    }
  }

  /**
   * Revoke an invitation
   * @param inviteId - Invitation ID
   */
  async revokeInvite(inviteId: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await this.client.from('team_invites').delete().eq('id', inviteId);

      if (error) {
        return {
          success: false,
          error: createServiceError('DELETE_FAILED', `Failed to revoke invite: ${error.message}`),
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
   * Get all invites for a team
   * @param teamId - Team ID
   */
  async getTeamInvites(teamId: string): Promise<ServiceResult<TeamInvite[]>> {
    try {
      const { data, error } = await this.client
        .from('team_invites')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (error) {
        return {
          success: false,
          error: createServiceError('FETCH_FAILED', `Failed to fetch invites: ${error.message}`),
        };
      }

      return { success: true, data: data.map((row) => this.mapInviteFromDb(row)) };
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
   * Check if a user can perform an action on a team
   * @param teamId - Team ID
   * @param userId - User ID
   * @param action - Action to check
   */
  async canUserPerform(teamId: string, userId: string, action: TeamAction): Promise<boolean> {
    const role = await this.getUserRole(teamId, userId);
    if (!role) return false;

    return ROLE_PERMISSIONS[role].includes(action);
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Generate a unique slug from team name
   */
  private async generateUniqueSlug(name: string): Promise<string> {
    // Convert to lowercase and replace non-alphanumeric with dashes
    let baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    if (!baseSlug) baseSlug = 'team';

    let slug = baseSlug;
    let counter = 0;

    // Check for uniqueness
    while (true) {
      const { data } = await this.client.from('teams').select('id').eq('slug', slug).single();

      if (!data) break;
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    return slug;
  }

  /**
   * Generate a unique invite code
   */
  private generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Map database row to Team type
   */
  private mapTeamFromDb(row: Record<string, unknown>): Team {
    return {
      id: row.id as string,
      name: row.name as string,
      slug: row.slug as string,
      description: row.description as string | undefined,
      avatarUrl: row.avatar_url as string | undefined,
      ownerId: row.owner_id as string,
      settings: (row.settings as TeamSettings) || DEFAULT_TEAM_SETTINGS,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  /**
   * Map database row to TeamMember type
   */
  private mapMemberFromDb(
    row: Record<string, unknown>,
    userInfo?: Record<string, unknown> | null
  ): TeamMember {
    return {
      id: row.id as string,
      teamId: row.team_id as string,
      userId: row.user_id as string,
      role: row.role as TeamRole,
      invitedBy: row.invited_by as string | undefined,
      invitedAt: row.invited_at as string | undefined,
      joinedAt: row.joined_at as string,
      status: row.status as MemberStatus,
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

  /**
   * Map database row to TeamInvite type
   */
  private mapInviteFromDb(row: Record<string, unknown>): TeamInvite {
    return {
      id: row.id as string,
      teamId: row.team_id as string,
      inviteCode: row.invite_code as string,
      email: row.email as string | undefined,
      role: row.role as Exclude<TeamRole, 'owner'>,
      createdBy: row.created_by as string,
      expiresAt: row.expires_at as string | undefined,
      maxUses: row.max_uses as number | undefined,
      useCount: row.use_count as number,
      createdAt: row.created_at as string,
      team: row.team as Pick<Team, 'id' | 'name' | 'slug' | 'avatarUrl'> | undefined,
    };
  }
}

export default TeamService;
