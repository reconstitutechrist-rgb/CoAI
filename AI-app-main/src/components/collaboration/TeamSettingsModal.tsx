'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  XIcon,
  SettingsIcon,
  UsersIcon,
  TrashIcon,
  CrownIcon,
  ShieldIcon,
  UserMinusIcon,
  CheckIcon,
  AlertTriangleIcon,
} from '../ui/Icons';
import { FocusTrap } from '../ui/FocusTrap';
import { useTeam } from '@/hooks/useTeam';
import type { TeamRole } from '@/types/collaboration';

export interface TeamSettingsModalProps {
  isOpen: boolean;
  teamId: string | null;
  onClose: () => void;
  onDeleted?: () => void;
}

type TabId = 'general' | 'members' | 'danger';

const ROLE_LABELS: Record<TeamRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
};

const ROLE_COLORS: Record<TeamRole, string> = {
  owner: 'text-amber-400',
  admin: 'text-purple-400',
  editor: 'text-blue-400',
  viewer: 'text-zinc-400',
};

/**
 * TeamSettingsModal - Full team settings with tabs for general, members, and danger zone
 */
export function TeamSettingsModal({
  isOpen,
  teamId,
  onClose,
  onDeleted,
}: TeamSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [allowMemberInvites, setAllowMemberInvites] = useState(false);
  const [defaultRole, setDefaultRole] = useState<TeamRole>('viewer');

  const {
    team,
    members,
    userRole,
    isLoading,
    error: teamError,
    updateTeam,
    updateMemberRole,
    removeMember,
    loadTeam,
    loadMembers,
    canManageSettings,
    isOwner,
  } = useTeam({ teamId, autoLoad: isOpen });

  // Populate form when team loads
  useEffect(() => {
    if (team) {
      setName(team.name);
      setDescription(team.description || '');
      setAllowMemberInvites(team.settings.allowMemberInvites);
      setDefaultRole(team.settings.defaultMemberRole);
    }
  }, [team]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('general');
      setDeleteConfirm('');
      setError(null);
    }
  }, [isOpen]);

  const handleSave = useCallback(async () => {
    if (!teamId) return;

    setIsSaving(true);
    setError(null);

    try {
      const success = await updateTeam({
        name: name.trim(),
        description: description.trim() || undefined,
        settings: {
          allowMemberInvites,
          defaultMemberRole: defaultRole,
        },
      });

      if (!success) {
        setError('Failed to save changes');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  }, [teamId, name, description, allowMemberInvites, defaultRole, updateTeam]);

  const handleDelete = useCallback(async () => {
    if (!teamId || !team || deleteConfirm !== team.name) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete team');
      }

      onDeleted?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete team');
    } finally {
      setIsDeleting(false);
    }
  }, [teamId, team, deleteConfirm, onDeleted, onClose]);

  const handleRoleChange = useCallback(
    async (memberId: string, newRole: TeamRole) => {
      setError(null);
      const success = await updateMemberRole(memberId, newRole);
      if (!success) {
        setError('Failed to update member role');
      }
    },
    [updateMemberRole]
  );

  const handleRemoveMember = useCallback(
    async (memberId: string) => {
      setError(null);
      const success = await removeMember(memberId);
      if (!success) {
        setError('Failed to remove member');
      }
    },
    [removeMember]
  );

  if (!isOpen) return null;

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: 'General', icon: <SettingsIcon size={16} /> },
    { id: 'members', label: 'Members', icon: <UsersIcon size={16} /> },
    ...(isOwner
      ? [{ id: 'danger' as TabId, label: 'Danger Zone', icon: <AlertTriangleIcon size={16} /> }]
      : []),
  ];

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <FocusTrap onEscape={onClose}>
        <div
          className="bg-zinc-900 rounded-xl border border-zinc-800 max-w-2xl w-full shadow-2xl max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
                <SettingsIcon size={20} className="text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-100">Team Settings</h3>
                <p className="text-sm text-zinc-400">{team?.name || 'Loading...'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <XIcon size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="px-6 border-b border-zinc-800">
            <div className="flex gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {(error || teamError) && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error || teamError}
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-8 text-zinc-500">Loading...</div>
            ) : (
              <>
                {/* General Tab */}
                {activeTab === 'general' && (
                  <div className="space-y-5">
                    <div>
                      <label className="text-sm font-medium text-zinc-300 mb-2 block">
                        Team Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={!canManageSettings}
                        className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-zinc-300 mb-2 block">
                        Description
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={!canManageSettings}
                        rows={3}
                        className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-50"
                        placeholder="What is this team working on?"
                      />
                    </div>

                    <div className="pt-4 border-t border-zinc-800">
                      <h4 className="text-sm font-medium text-zinc-300 mb-4">Team Settings</h4>

                      <div className="space-y-4">
                        <label className="flex items-center justify-between">
                          <div>
                            <span className="text-sm text-zinc-200">Allow member invites</span>
                            <p className="text-xs text-zinc-500">
                              Let all members create invite links
                            </p>
                          </div>
                          <button
                            onClick={() => setAllowMemberInvites(!allowMemberInvites)}
                            disabled={!canManageSettings}
                            className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${
                              allowMemberInvites ? 'bg-blue-600' : 'bg-zinc-700'
                            }`}
                          >
                            <span
                              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                allowMemberInvites ? 'left-6' : 'left-1'
                              }`}
                            />
                          </button>
                        </label>

                        <div>
                          <label className="text-sm text-zinc-200 mb-2 block">
                            Default role for new members
                          </label>
                          <select
                            value={defaultRole}
                            onChange={(e) => setDefaultRole(e.target.value as TeamRole)}
                            disabled={!canManageSettings}
                            className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Members Tab */}
                {activeTab === 'members' && (
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-medium text-zinc-300">
                            {member.user?.avatarUrl ? (
                              <img
                                src={member.user.avatarUrl}
                                alt={member.user.fullName || member.user.email}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              (member.user?.fullName || member.user?.email || '?').charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-zinc-200">
                                {member.user?.fullName || member.user?.email || 'Unknown'}
                              </span>
                              {member.role === 'owner' && (
                                <CrownIcon size={14} className="text-amber-400" />
                              )}
                            </div>
                            <span className="text-xs text-zinc-500">{member.user?.email}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {canManageSettings && member.role !== 'owner' ? (
                            <>
                              <select
                                value={member.role}
                                onChange={(e) =>
                                  handleRoleChange(member.id, e.target.value as TeamRole)
                                }
                                className="px-3 py-1.5 text-sm rounded bg-zinc-700 border border-zinc-600 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="viewer">Viewer</option>
                                <option value="editor">Editor</option>
                                {isOwner && <option value="admin">Admin</option>}
                              </select>
                              <button
                                onClick={() => handleRemoveMember(member.id)}
                                className="p-1.5 rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
                                title="Remove member"
                              >
                                <UserMinusIcon size={16} />
                              </button>
                            </>
                          ) : (
                            <span className={`text-sm font-medium ${ROLE_COLORS[member.role]}`}>
                              {ROLE_LABELS[member.role]}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}

                    {members.length === 0 && (
                      <div className="text-center py-8 text-zinc-500">No members found</div>
                    )}
                  </div>
                )}

                {/* Danger Zone Tab */}
                {activeTab === 'danger' && isOwner && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/5">
                      <h4 className="text-sm font-medium text-red-400 mb-2">Delete Team</h4>
                      <p className="text-sm text-zinc-400 mb-4">
                        Once you delete a team, there is no going back. All team data, members, and
                        associated resources will be permanently deleted.
                      </p>

                      <div className="mb-4">
                        <label className="text-sm text-zinc-300 mb-2 block">
                          Type <span className="font-mono text-red-400">{team?.name}</span> to
                          confirm
                        </label>
                        <input
                          type="text"
                          value={deleteConfirm}
                          onChange={(e) => setDeleteConfirm(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                          placeholder="Team name"
                        />
                      </div>

                      <button
                        onClick={handleDelete}
                        disabled={isDeleting || deleteConfirm !== team?.name}
                        className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                      >
                        <TrashIcon size={16} />
                        {isDeleting ? 'Deleting...' : 'Delete Team'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {activeTab === 'general' && canManageSettings && (
            <div className="px-6 py-4 border-t border-zinc-800 flex justify-end gap-3">
              <button onClick={onClose} className="btn-secondary px-4 py-2">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !name.trim()}
                className="btn-primary px-4 py-2 flex items-center gap-2"
              >
                <CheckIcon size={16} />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </FocusTrap>
    </div>
  );
}

export default TeamSettingsModal;
