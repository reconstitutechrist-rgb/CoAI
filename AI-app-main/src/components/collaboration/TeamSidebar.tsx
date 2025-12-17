'use client';

import React, { useState, useCallback } from 'react';
import {
  UsersIcon,
  PlusIcon,
  SettingsIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CrownIcon,
  CheckIcon,
} from '../ui/Icons';
import { useTeams } from '@/hooks/useTeams';
import type { Team } from '@/types/collaboration';

export interface TeamSidebarProps {
  /** Whether the sidebar is collapsed */
  collapsed?: boolean;
  /** Callback when team settings is clicked */
  onTeamSettings?: (teamId: string) => void;
  /** Callback when invite member is clicked */
  onInviteMember?: (teamId: string) => void;
  /** Callback when create team is clicked */
  onCreateTeam?: () => void;
}

/**
 * TeamSidebar - Displays the user's teams with selection and management options
 */
export function TeamSidebar({
  collapsed = false,
  onTeamSettings,
  onInviteMember,
  onCreateTeam,
}: TeamSidebarProps) {
  const { teams, isLoading, currentTeamId, selectTeam, createTeam } = useTeams();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateTeam = useCallback(async () => {
    if (!newTeamName.trim()) return;

    setIsCreating(true);
    try {
      const team = await createTeam({ name: newTeamName.trim() });
      if (team) {
        selectTeam(team.id);
        setNewTeamName('');
        setShowCreateForm(false);
      }
    } finally {
      setIsCreating(false);
    }
  }, [newTeamName, createTeam, selectTeam]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleCreateTeam();
      } else if (e.key === 'Escape') {
        setShowCreateForm(false);
        setNewTeamName('');
      }
    },
    [handleCreateTeam]
  );

  if (collapsed) {
    return (
      <div className="py-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-2 flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-lg transition-colors"
          title="Teams"
        >
          <UsersIcon size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className="py-2">
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between text-xs font-semibold text-zinc-400 uppercase tracking-wider hover:text-zinc-300 transition-colors"
      >
        <span className="flex items-center gap-2">
          <UsersIcon size={14} />
          Teams
        </span>
        {isExpanded ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
      </button>

      {isExpanded && (
        <div className="mt-1 space-y-1">
          {/* Loading state */}
          {isLoading && teams.length === 0 && (
            <div className="px-3 py-2 text-sm text-zinc-500">Loading teams...</div>
          )}

          {/* Teams list */}
          {teams.map((team) => (
            <TeamItem
              key={team.id}
              team={team}
              isSelected={team.id === currentTeamId}
              onSelect={() => selectTeam(team.id)}
              onSettings={() => onTeamSettings?.(team.id)}
              onInvite={() => onInviteMember?.(team.id)}
            />
          ))}

          {/* Empty state */}
          {!isLoading && teams.length === 0 && !showCreateForm && (
            <div className="px-3 py-4 text-center">
              <p className="text-sm text-zinc-500 mb-2">No teams yet</p>
              <button
                onClick={() => (onCreateTeam ? onCreateTeam() : setShowCreateForm(true))}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Create your first team
              </button>
            </div>
          )}

          {/* Quick create form */}
          {showCreateForm && (
            <div className="px-2 py-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Team name"
                  className="flex-1 px-2 py-1.5 text-sm rounded bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                  disabled={isCreating}
                />
                <button
                  onClick={handleCreateTeam}
                  disabled={isCreating || !newTeamName.trim()}
                  className="px-2 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <CheckIcon size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Create team button */}
          {teams.length > 0 && !showCreateForm && (
            <button
              onClick={() => (onCreateTeam ? onCreateTeam() : setShowCreateForm(true))}
              className="w-full px-3 py-2 flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-lg transition-colors"
            >
              <PlusIcon size={14} />
              <span>New Team</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Individual team item in the sidebar
 */
interface TeamItemProps {
  team: Team;
  isSelected: boolean;
  onSelect: () => void;
  onSettings?: () => void;
  onInvite?: () => void;
}

function TeamItem({ team, isSelected, onSelect, onSettings, onInvite }: TeamItemProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={`group relative mx-2 rounded-lg transition-colors ${
        isSelected
          ? 'bg-blue-600/20 border border-blue-500/30'
          : 'hover:bg-zinc-800/50 border border-transparent'
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <button
        onClick={onSelect}
        className="w-full px-3 py-2 flex items-center gap-3 text-left"
      >
        {/* Team avatar */}
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${
            isSelected
              ? 'bg-blue-600 text-white'
              : 'bg-zinc-700 text-zinc-300'
          }`}
        >
          {team.avatarUrl ? (
            <img
              src={team.avatarUrl}
              alt={team.name}
              className="w-full h-full rounded-lg object-cover"
            />
          ) : (
            team.name.charAt(0).toUpperCase()
          )}
        </div>

        {/* Team info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-sm font-medium truncate ${
                isSelected ? 'text-blue-100' : 'text-zinc-200'
              }`}
            >
              {team.name}
            </span>
            {team.memberCount !== undefined && team.memberCount > 1 && (
              <span className="text-xs text-zinc-500">
                ({team.memberCount})
              </span>
            )}
          </div>
          {team.description && (
            <p className="text-xs text-zinc-500 truncate">{team.description}</p>
          )}
        </div>
      </button>

      {/* Action buttons (shown on hover) */}
      {showActions && (onSettings || onInvite) && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {onInvite && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onInvite();
              }}
              className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Invite member"
            >
              <PlusIcon size={14} />
            </button>
          )}
          {onSettings && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSettings();
              }}
              className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Team settings"
            >
              <SettingsIcon size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default TeamSidebar;
