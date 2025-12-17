/**
 * useTeam Hook - Manages a single team's details, members, and invites
 *
 * Provides functionality for team management including members and invitations.
 */

import { useState, useCallback, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type {
  Team,
  TeamMember,
  TeamInvite,
  TeamRole,
  UpdateTeamInput,
  CreateInviteInput,
} from '@/types/collaboration';

/**
 * Options for useTeam hook
 */
export interface UseTeamOptions {
  /** Team ID to manage */
  teamId: string | null;
  /** Whether to auto-load team details on mount */
  autoLoad?: boolean;
}

/**
 * Return type for useTeam hook
 */
export interface UseTeamReturn {
  // State
  /** Team details */
  team: Team | null;
  /** Team members */
  members: TeamMember[];
  /** Pending invites */
  invites: TeamInvite[];
  /** Current user's role in the team */
  userRole: TeamRole | null;
  /** Whether data is being loaded */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;

  // Team actions
  /** Load/refresh team details */
  loadTeam: () => Promise<void>;
  /** Update team settings */
  updateTeam: (input: UpdateTeamInput) => Promise<boolean>;

  // Member actions
  /** Load team members */
  loadMembers: () => Promise<void>;
  /** Update a member's role */
  updateMemberRole: (memberId: string, role: TeamRole) => Promise<boolean>;
  /** Remove a member from the team */
  removeMember: (memberId: string) => Promise<boolean>;

  // Invite actions
  /** Load pending invites */
  loadInvites: () => Promise<void>;
  /** Create a new invite */
  createInvite: (input: CreateInviteInput) => Promise<{ invite: TeamInvite; inviteUrl: string } | null>;
  /** Revoke an invite */
  revokeInvite: (inviteId: string) => Promise<boolean>;

  // Permissions
  /** Check if current user can manage members */
  canManageMembers: boolean;
  /** Check if current user can manage settings */
  canManageSettings: boolean;
  /** Check if current user is owner */
  isOwner: boolean;
}

/**
 * Hook for managing a single team
 *
 * @param options - Configuration options
 * @returns Team management methods and state
 *
 * @example
 * ```tsx
 * const { team, members, updateTeam, createInvite } = useTeam({ teamId: 'abc123' });
 *
 * const handleInvite = async () => {
 *   const result = await createInvite({ email: 'user@example.com', role: 'editor' });
 *   if (result) {
 *     console.log('Invite URL:', result.inviteUrl);
 *   }
 * };
 * ```
 */
export function useTeam(options: UseTeamOptions): UseTeamReturn {
  const { teamId, autoLoad = true } = options;

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [userRole, setUserRole] = useState<TeamRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Store actions for updating global state
  const updateTeamInStore = useAppStore((state) => state.updateTeam);

  /**
   * Load team details
   */
  const loadTeam = useCallback(async () => {
    if (!teamId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/teams/${teamId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load team');
      }

      setTeam(data.team);
      setUserRole(data.userRole);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load team';
      setError(message);
      console.error('Error loading team:', err);
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  /**
   * Update team settings
   */
  const updateTeam = useCallback(
    async (input: UpdateTeamInput): Promise<boolean> => {
      if (!teamId) return false;

      setError(null);

      try {
        const response = await fetch(`/api/teams/${teamId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to update team');
        }

        setTeam(data.team);
        updateTeamInStore(teamId, data.team);

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update team';
        setError(message);
        console.error('Error updating team:', err);
        return false;
      }
    },
    [teamId, updateTeamInStore]
  );

  /**
   * Load team members
   */
  const loadMembers = useCallback(async () => {
    if (!teamId) return;

    try {
      const response = await fetch(`/api/teams/${teamId}/members`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load members');
      }

      setMembers(data.members || []);
    } catch (err) {
      console.error('Error loading members:', err);
    }
  }, [teamId]);

  /**
   * Update a member's role
   */
  const updateMemberRole = useCallback(
    async (memberId: string, role: TeamRole): Promise<boolean> => {
      if (!teamId) return false;

      setError(null);

      try {
        const response = await fetch(`/api/teams/${teamId}/members/${memberId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to update member role');
        }

        // Update local state
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, role } : m))
        );

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update member role';
        setError(message);
        console.error('Error updating member role:', err);
        return false;
      }
    },
    [teamId]
  );

  /**
   * Remove a member from the team
   */
  const removeMember = useCallback(
    async (memberId: string): Promise<boolean> => {
      if (!teamId) return false;

      setError(null);

      try {
        const response = await fetch(`/api/teams/${teamId}/members/${memberId}`, {
          method: 'DELETE',
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to remove member');
        }

        // Update local state
        setMembers((prev) => prev.filter((m) => m.id !== memberId));

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove member';
        setError(message);
        console.error('Error removing member:', err);
        return false;
      }
    },
    [teamId]
  );

  /**
   * Load pending invites
   */
  const loadInvites = useCallback(async () => {
    if (!teamId) return;

    try {
      const response = await fetch(`/api/teams/${teamId}/invites`);
      const data = await response.json();

      if (!response.ok) {
        // Non-admins won't have access, that's okay
        if (response.status === 403) {
          setInvites([]);
          return;
        }
        throw new Error(data.error || 'Failed to load invites');
      }

      setInvites(data.invites || []);
    } catch (err) {
      console.error('Error loading invites:', err);
    }
  }, [teamId]);

  /**
   * Create a new invite
   */
  const createInvite = useCallback(
    async (input: CreateInviteInput): Promise<{ invite: TeamInvite; inviteUrl: string } | null> => {
      if (!teamId) return null;

      setError(null);

      try {
        const response = await fetch(`/api/teams/${teamId}/invites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create invite');
        }

        // Add to local state
        if (data.invite) {
          setInvites((prev) => [...prev, data.invite]);
        }

        return {
          invite: data.invite,
          inviteUrl: data.inviteUrl,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create invite';
        setError(message);
        console.error('Error creating invite:', err);
        return null;
      }
    },
    [teamId]
  );

  /**
   * Revoke an invite
   */
  const revokeInvite = useCallback(
    async (inviteId: string): Promise<boolean> => {
      if (!teamId) return false;

      setError(null);

      try {
        const response = await fetch(`/api/teams/${teamId}/invites/${inviteId}`, {
          method: 'DELETE',
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to revoke invite');
        }

        // Update local state
        setInvites((prev) => prev.filter((i) => i.id !== inviteId));

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to revoke invite';
        setError(message);
        console.error('Error revoking invite:', err);
        return false;
      }
    },
    [teamId]
  );

  // Computed permissions
  const isOwner = userRole === 'owner';
  const canManageMembers = userRole === 'owner' || userRole === 'admin';
  const canManageSettings = userRole === 'owner' || userRole === 'admin';

  // Auto-load on mount and when teamId changes
  useEffect(() => {
    if (autoLoad && teamId) {
      loadTeam();
      loadMembers();
      loadInvites();
    }
  }, [autoLoad, teamId, loadTeam, loadMembers, loadInvites]);

  // Clear state when teamId changes
  useEffect(() => {
    if (!teamId) {
      setTeam(null);
      setMembers([]);
      setInvites([]);
      setUserRole(null);
      setError(null);
    }
  }, [teamId]);

  return {
    team,
    members,
    invites,
    userRole,
    isLoading,
    error,
    loadTeam,
    updateTeam,
    loadMembers,
    updateMemberRole,
    removeMember,
    loadInvites,
    createInvite,
    revokeInvite,
    canManageMembers,
    canManageSettings,
    isOwner,
  };
}

export default useTeam;
