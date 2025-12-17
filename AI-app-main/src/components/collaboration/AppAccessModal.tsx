'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  XIcon,
  ShieldIcon,
  GlobeIcon,
  UsersIcon,
  LockIcon,
  LinkIcon,
  CopyIcon,
  CheckIcon,
  TrashIcon,
  UserPlusIcon,
  UserMinusIcon,
} from '../ui/Icons';
import { FocusTrap } from '../ui/FocusTrap';
import { useAppAccess } from '@/hooks/useAppAccess';
import { useTeams } from '@/hooks/useTeams';
import type { Visibility, Permission } from '@/types/collaboration';

export interface AppAccessModalProps {
  isOpen: boolean;
  appId: string | null;
  appName?: string;
  onClose: () => void;
}

const VISIBILITY_OPTIONS: {
  value: Visibility;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'private',
    label: 'Private',
    description: 'Only you and invited collaborators can access',
    icon: <LockIcon size={18} />,
  },
  {
    value: 'team',
    label: 'Team',
    description: 'All members of your team can access',
    icon: <UsersIcon size={18} />,
  },
  {
    value: 'logged_in',
    label: 'Logged In Users',
    description: 'Anyone with an account can view',
    icon: <ShieldIcon size={18} />,
  },
  {
    value: 'public',
    label: 'Public',
    description: 'Anyone with the link can view',
    icon: <GlobeIcon size={18} />,
  },
];

const PERMISSION_LABELS: Record<Permission, string> = {
  view: 'Can view',
  edit: 'Can edit',
  admin: 'Admin',
  owner: 'Owner',
};

/**
 * AppAccessModal - Configure app visibility, share links, and collaborators
 */
export function AppAccessModal({
  isOpen,
  appId,
  appName,
  onClose,
}: AppAccessModalProps) {
  const [showAddCollaborator, setShowAddCollaborator] = useState(false);
  const [collaboratorEmail, setCollaboratorEmail] = useState('');
  const [collaboratorPermission, setCollaboratorPermission] = useState<Permission>('view');
  const [isAdding, setIsAdding] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    access,
    collaborators,
    isLoading,
    error: accessError,
    updateAccess,
    createShareLink,
    revokeShareLink,
    addCollaboratorByEmail,
    updateCollaboratorPermission,
    removeCollaborator,
    canManageAccess,
  } = useAppAccess({ appId, autoLoad: isOpen });

  const { teams, currentTeamId } = useTeams({ autoLoad: isOpen });

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowAddCollaborator(false);
      setCollaboratorEmail('');
      setCollaboratorPermission('view');
      setShareUrl(null);
      setCopied(false);
      setError(null);
    }
  }, [isOpen]);

  // Set share URL from access settings
  useEffect(() => {
    if (access?.shareToken) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      setShareUrl(`${baseUrl}/shared/${access.shareToken}`);
    } else {
      setShareUrl(null);
    }
  }, [access?.shareToken]);

  const handleVisibilityChange = useCallback(
    async (visibility: Visibility) => {
      setError(null);
      const success = await updateAccess({
        visibility,
        teamId: visibility === 'team' ? currentTeamId || undefined : undefined,
      });
      if (!success) {
        setError('Failed to update visibility');
      }
    },
    [updateAccess, currentTeamId]
  );

  const handleCreateShareLink = useCallback(async () => {
    setError(null);
    const url = await createShareLink('view', 7);
    if (url) {
      setShareUrl(url);
    } else {
      setError('Failed to create share link');
    }
  }, [createShareLink]);

  const handleRevokeShareLink = useCallback(async () => {
    setError(null);
    const success = await revokeShareLink();
    if (success) {
      setShareUrl(null);
    } else {
      setError('Failed to revoke share link');
    }
  }, [revokeShareLink]);

  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [shareUrl]);

  const handleAddCollaborator = useCallback(async () => {
    if (!collaboratorEmail.trim()) return;

    setIsAdding(true);
    setError(null);

    try {
      const success = await addCollaboratorByEmail(collaboratorEmail.trim(), collaboratorPermission);
      if (success) {
        setCollaboratorEmail('');
        setShowAddCollaborator(false);
      } else {
        setError('Failed to add collaborator');
      }
    } finally {
      setIsAdding(false);
    }
  }, [collaboratorEmail, collaboratorPermission, addCollaboratorByEmail]);

  const handlePermissionChange = useCallback(
    async (collaboratorId: string, permission: Permission) => {
      setError(null);
      const success = await updateCollaboratorPermission(collaboratorId, permission);
      if (!success) {
        setError('Failed to update permission');
      }
    },
    [updateCollaboratorPermission]
  );

  const handleRemoveCollaborator = useCallback(
    async (collaboratorId: string) => {
      setError(null);
      const success = await removeCollaborator(collaboratorId);
      if (!success) {
        setError('Failed to remove collaborator');
      }
    },
    [removeCollaborator]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <FocusTrap onEscape={onClose}>
        <div
          className="bg-zinc-900 rounded-xl border border-zinc-800 max-w-lg w-full shadow-2xl max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                <ShieldIcon size={20} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-100">Share & Access</h3>
                <p className="text-sm text-zinc-400">{appName || 'Your App'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <XIcon size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {(error || accessError) && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error || accessError}
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-8 text-zinc-500">Loading...</div>
            ) : (
              <>
                {/* Visibility Selection */}
                <div>
                  <h4 className="text-sm font-medium text-zinc-300 mb-3">Visibility</h4>
                  <div className="space-y-2">
                    {VISIBILITY_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleVisibilityChange(option.value)}
                        disabled={!canManageAccess}
                        className={`w-full p-3 rounded-lg border text-left flex items-start gap-3 transition-colors ${
                          access?.visibility === option.value
                            ? 'bg-blue-600/10 border-blue-500/50'
                            : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <div
                          className={`mt-0.5 ${
                            access?.visibility === option.value
                              ? 'text-blue-400'
                              : 'text-zinc-400'
                          }`}
                        >
                          {option.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-medium ${
                                access?.visibility === option.value
                                  ? 'text-blue-200'
                                  : 'text-zinc-200'
                              }`}
                            >
                              {option.label}
                            </span>
                            {access?.visibility === option.value && (
                              <CheckIcon size={14} className="text-blue-400" />
                            )}
                          </div>
                          <p className="text-xs text-zinc-500">{option.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Team Selection (if team visibility) */}
                {access?.visibility === 'team' && teams.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-zinc-300 mb-3">Select Team</h4>
                    <select
                      value={access.teamId || ''}
                      onChange={(e) =>
                        updateAccess({ visibility: 'team', teamId: e.target.value || undefined })
                      }
                      disabled={!canManageAccess}
                      className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="">Select a team...</option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Share Link */}
                {canManageAccess && (
                  <div>
                    <h4 className="text-sm font-medium text-zinc-300 mb-3">Share Link</h4>
                    {shareUrl ? (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={shareUrl}
                            readOnly
                            className="flex-1 px-3 py-2 text-sm rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono"
                          />
                          <button
                            onClick={handleCopyLink}
                            className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                              copied
                                ? 'bg-green-600 text-white'
                                : 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600'
                            }`}
                          >
                            {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
                          </button>
                        </div>
                        <button
                          onClick={handleRevokeShareLink}
                          className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1"
                        >
                          <TrashIcon size={14} />
                          Revoke link
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleCreateShareLink}
                        className="w-full p-3 rounded-lg border border-dashed border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300 flex items-center justify-center gap-2 transition-colors"
                      >
                        <LinkIcon size={16} />
                        Create share link
                      </button>
                    )}
                  </div>
                )}

                {/* Collaborators */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-zinc-300">Collaborators</h4>
                    {canManageAccess && !showAddCollaborator && (
                      <button
                        onClick={() => setShowAddCollaborator(true)}
                        className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        <UserPlusIcon size={14} />
                        Add
                      </button>
                    )}
                  </div>

                  {/* Add collaborator form */}
                  {showAddCollaborator && (
                    <div className="mb-4 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700 space-y-3">
                      <input
                        type="email"
                        value={collaboratorEmail}
                        onChange={(e) => setCollaboratorEmail(e.target.value)}
                        placeholder="Email address"
                        className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <select
                          value={collaboratorPermission}
                          onChange={(e) => setCollaboratorPermission(e.target.value as Permission)}
                          className="flex-1 px-3 py-2 text-sm rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="view">Can view</option>
                          <option value="edit">Can edit</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          onClick={handleAddCollaborator}
                          disabled={isAdding || !collaboratorEmail.trim()}
                          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isAdding ? '...' : 'Add'}
                        </button>
                        <button
                          onClick={() => {
                            setShowAddCollaborator(false);
                            setCollaboratorEmail('');
                          }}
                          className="px-4 py-2 rounded-lg bg-zinc-700 text-zinc-200 hover:bg-zinc-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Collaborators list */}
                  <div className="space-y-2">
                    {collaborators.map((collab) => (
                      <div
                        key={collab.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-medium text-zinc-300">
                            {collab.user?.avatarUrl ? (
                              <img
                                src={collab.user.avatarUrl}
                                alt={collab.user.fullName || collab.user.email}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              (collab.user?.fullName || collab.user?.email || '?')
                                .charAt(0)
                                .toUpperCase()
                            )}
                          </div>
                          <div>
                            <span className="text-sm font-medium text-zinc-200">
                              {collab.user?.fullName || collab.user?.email || 'Unknown'}
                            </span>
                            {collab.user?.fullName && (
                              <p className="text-xs text-zinc-500">{collab.user.email}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {canManageAccess ? (
                            <>
                              <select
                                value={collab.permission}
                                onChange={(e) =>
                                  handlePermissionChange(collab.id, e.target.value as Permission)
                                }
                                className="px-2 py-1 text-xs rounded bg-zinc-700 border border-zinc-600 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="view">Can view</option>
                                <option value="edit">Can edit</option>
                                <option value="admin">Admin</option>
                              </select>
                              <button
                                onClick={() => handleRemoveCollaborator(collab.id)}
                                className="p-1 rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
                                title="Remove"
                              >
                                <UserMinusIcon size={14} />
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-zinc-400">
                              {PERMISSION_LABELS[collab.permission]}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}

                    {collaborators.length === 0 && !showAddCollaborator && (
                      <p className="text-sm text-zinc-500 text-center py-4">
                        No collaborators yet
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-zinc-800">
            <button onClick={onClose} className="btn-secondary w-full py-2.5">
              Done
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}

export default AppAccessModal;
