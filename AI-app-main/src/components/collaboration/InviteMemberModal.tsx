'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  XIcon,
  UserPlusIcon,
  MailIcon,
  LinkIcon,
  CopyIcon,
  CheckIcon,
} from '../ui/Icons';
import { FocusTrap } from '../ui/FocusTrap';
import { useTeam } from '@/hooks/useTeam';
import type { TeamRole } from '@/types/collaboration';

export interface InviteMemberModalProps {
  isOpen: boolean;
  teamId: string | null;
  onClose: () => void;
  onInvited?: () => void;
}

type InviteMethod = 'email' | 'link';

/**
 * InviteMemberModal - Create invites via email or shareable link
 */
export function InviteMemberModal({
  isOpen,
  teamId,
  onClose,
  onInvited,
}: InviteMemberModalProps) {
  const [method, setMethod] = useState<InviteMethod>('link');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamRole>('viewer');
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>(7);
  const [maxUses, setMaxUses] = useState<number | undefined>(undefined);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { team, createInvite, canManageMembers, isOwner } = useTeam({
    teamId,
    autoLoad: isOpen,
  });

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setMethod('link');
      setEmail('');
      setRole('viewer');
      setExpiresInDays(7);
      setMaxUses(undefined);
      setError(null);
      setInviteUrl(null);
      setCopied(false);
    }
  }, [isOpen]);

  const handleCreateInvite = useCallback(async () => {
    if (!teamId) return;

    setIsCreating(true);
    setError(null);

    try {
      const result = await createInvite({
        email: method === 'email' ? email.trim() : undefined,
        role,
        expiresInDays,
        maxUses,
      });

      if (result) {
        setInviteUrl(result.inviteUrl);
        onInvited?.();

        if (method === 'email') {
          // For email invites, close after success
          setTimeout(() => onClose(), 2000);
        }
      } else {
        setError('Failed to create invite');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsCreating(false);
    }
  }, [teamId, method, email, role, expiresInDays, maxUses, createInvite, onInvited, onClose]);

  const handleCopyLink = useCallback(async () => {
    if (!inviteUrl) return;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [inviteUrl]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !inviteUrl) {
        e.preventDefault();
        handleCreateInvite();
      }
    },
    [inviteUrl, handleCreateInvite]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <FocusTrap onEscape={onClose}>
        <div
          className="bg-zinc-900 rounded-xl border border-zinc-800 max-w-md w-full shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-600/20 flex items-center justify-center">
                <UserPlusIcon size={20} className="text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-100">Invite to Team</h3>
                <p className="text-sm text-zinc-400">{team?.name || 'Loading...'}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-5">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Success state with link */}
            {inviteUrl ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                  <div className="flex items-center gap-2 text-green-400 mb-2">
                    <CheckIcon size={16} />
                    <span className="text-sm font-medium">Invite link created!</span>
                  </div>
                  <p className="text-sm text-zinc-400 mb-3">
                    Share this link with your teammate to invite them to the team.
                  </p>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inviteUrl}
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
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setInviteUrl(null);
                    setEmail('');
                  }}
                  className="w-full py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Create another invite
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Method tabs */}
                <div className="flex gap-2 p-1 bg-zinc-800 rounded-lg">
                  <button
                    onClick={() => setMethod('link')}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                      method === 'link'
                        ? 'bg-zinc-700 text-zinc-100'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <LinkIcon size={16} />
                    Invite Link
                  </button>
                  <button
                    onClick={() => setMethod('email')}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                      method === 'email'
                        ? 'bg-zinc-700 text-zinc-100'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <MailIcon size={16} />
                    Email Invite
                  </button>
                </div>

                {/* Email input (only for email method) */}
                {method === 'email' && (
                  <div>
                    <label className="text-sm font-medium text-zinc-300 mb-2 block">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="teammate@example.com"
                      className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      Only this email will be able to use the invite
                    </p>
                  </div>
                )}

                {/* Role selection */}
                <div>
                  <label className="text-sm font-medium text-zinc-300 mb-2 block">
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as TeamRole)}
                    className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="viewer">Viewer - Can view team content</option>
                    <option value="editor">Editor - Can view and edit</option>
                    {isOwner && (
                      <option value="admin">Admin - Can manage members</option>
                    )}
                  </select>
                </div>

                {/* Link options (only for link method) */}
                {method === 'link' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-zinc-300 mb-2 block">
                        Expires After
                      </label>
                      <select
                        value={expiresInDays ?? ''}
                        onChange={(e) =>
                          setExpiresInDays(e.target.value ? Number(e.target.value) : undefined)
                        }
                        className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="1">1 day</option>
                        <option value="7">7 days</option>
                        <option value="30">30 days</option>
                        <option value="">Never</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-zinc-300 mb-2 block">
                        Max Uses
                      </label>
                      <select
                        value={maxUses ?? ''}
                        onChange={(e) =>
                          setMaxUses(e.target.value ? Number(e.target.value) : undefined)
                        }
                        className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="1">1 use</option>
                        <option value="5">5 uses</option>
                        <option value="10">10 uses</option>
                        <option value="">Unlimited</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {!inviteUrl && (
            <div className="px-6 py-4 border-t border-zinc-800 flex gap-3">
              <button onClick={onClose} className="btn-secondary flex-1 py-2.5">
                <XIcon size={16} />
                Cancel
              </button>
              <button
                onClick={handleCreateInvite}
                disabled={isCreating || (method === 'email' && !email.trim())}
                className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  'Creating...'
                ) : (
                  <>
                    <LinkIcon size={16} />
                    {method === 'email' ? 'Send Invite' : 'Create Link'}
                  </>
                )}
              </button>
            </div>
          )}

          {inviteUrl && (
            <div className="px-6 py-4 border-t border-zinc-800">
              <button onClick={onClose} className="btn-secondary w-full py-2.5">
                Done
              </button>
            </div>
          )}
        </div>
      </FocusTrap>
    </div>
  );
}

export default InviteMemberModal;
