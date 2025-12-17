/**
 * useTeams Hook - Manages the list of teams for the current user
 *
 * Provides functionality for loading, creating, and managing teams.
 */

import { useState, useCallback, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { Team, CreateTeamInput } from '@/types/collaboration';

/**
 * Options for useTeams hook
 */
export interface UseTeamsOptions {
  /** Whether to auto-load teams on mount */
  autoLoad?: boolean;
}

/**
 * Return type for useTeams hook
 */
export interface UseTeamsReturn {
  // State
  /** List of user's teams */
  teams: Team[];
  /** Whether teams are being loaded */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;

  // Actions
  /** Load/refresh teams */
  loadTeams: () => Promise<void>;
  /** Create a new team */
  createTeam: (input: CreateTeamInput) => Promise<Team | null>;
  /** Delete a team */
  deleteTeam: (teamId: string) => Promise<boolean>;
  /** Select a team as the current team */
  selectTeam: (teamId: string | null) => void;

  // Current team
  /** Currently selected team ID */
  currentTeamId: string | null;
  /** Currently selected team */
  currentTeam: Team | null;
}

/**
 * Hook for managing the user's teams
 *
 * @param options - Configuration options
 * @returns Teams management methods and state
 *
 * @example
 * ```tsx
 * const { teams, isLoading, createTeam, selectTeam } = useTeams();
 *
 * const handleCreateTeam = async () => {
 *   const team = await createTeam({ name: 'My Team' });
 *   if (team) selectTeam(team.id);
 * };
 * ```
 */
export function useTeams(options: UseTeamsOptions = {}): UseTeamsReturn {
  const { autoLoad = true } = options;

  const [error, setError] = useState<string | null>(null);

  // Store state
  const teams = useAppStore((state) => state.teams);
  const isLoading = useAppStore((state) => state.teamsLoading);
  const currentTeamId = useAppStore((state) => state.currentTeamId);
  const currentTeam = useAppStore((state) => state.currentTeam);

  // Store actions
  const setTeams = useAppStore((state) => state.setTeams);
  const setTeamsLoading = useAppStore((state) => state.setTeamsLoading);
  const setCurrentTeamId = useAppStore((state) => state.setCurrentTeamId);
  const setCurrentTeam = useAppStore((state) => state.setCurrentTeam);
  const addTeam = useAppStore((state) => state.addTeam);
  const removeTeam = useAppStore((state) => state.removeTeam);

  /**
   * Load teams from API
   */
  const loadTeams = useCallback(async () => {
    setTeamsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/teams');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load teams');
      }

      setTeams(data.teams || []);

      // If we have a current team ID, update the current team object
      if (currentTeamId) {
        const team = data.teams?.find((t: Team) => t.id === currentTeamId);
        setCurrentTeam(team || null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load teams';
      setError(message);
      console.error('Error loading teams:', err);
    } finally {
      setTeamsLoading(false);
    }
  }, [currentTeamId, setTeams, setTeamsLoading, setCurrentTeam]);

  /**
   * Create a new team
   */
  const createTeam = useCallback(
    async (input: CreateTeamInput): Promise<Team | null> => {
      setError(null);

      try {
        const response = await fetch('/api/teams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create team');
        }

        const newTeam = data.team as Team;
        addTeam(newTeam);

        return newTeam;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create team';
        setError(message);
        console.error('Error creating team:', err);
        return null;
      }
    },
    [addTeam]
  );

  /**
   * Delete a team
   */
  const deleteTeam = useCallback(
    async (teamId: string): Promise<boolean> => {
      setError(null);

      try {
        const response = await fetch(`/api/teams/${teamId}`, {
          method: 'DELETE',
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to delete team');
        }

        removeTeam(teamId);

        // If this was the current team, clear it
        if (currentTeamId === teamId) {
          setCurrentTeamId(null);
          setCurrentTeam(null);
        }

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete team';
        setError(message);
        console.error('Error deleting team:', err);
        return false;
      }
    },
    [currentTeamId, removeTeam, setCurrentTeamId, setCurrentTeam]
  );

  /**
   * Select a team as current
   */
  const selectTeam = useCallback(
    (teamId: string | null) => {
      setCurrentTeamId(teamId);
      if (teamId) {
        const team = teams.find((t) => t.id === teamId);
        setCurrentTeam(team || null);
      } else {
        setCurrentTeam(null);
      }
    },
    [teams, setCurrentTeamId, setCurrentTeam]
  );

  // Auto-load teams on mount
  useEffect(() => {
    if (autoLoad && teams.length === 0) {
      loadTeams();
    }
  }, [autoLoad, teams.length, loadTeams]);

  return {
    teams,
    isLoading,
    error,
    loadTeams,
    createTeam,
    deleteTeam,
    selectTeam,
    currentTeamId,
    currentTeam,
  };
}

export default useTeams;
