'use client';

import React, { useState, useCallback } from 'react';
import { FolderIcon, XIcon, CheckIcon, SaveIcon } from '../ui/Icons';
import { FocusTrap } from '../ui/FocusTrap';
import type {
  ArtifactType,
  ArtifactStatus,
  ArtifactContent,
} from '@/types/projectArtifacts';
import { getArtifactTypeLabel } from '@/types/projectArtifacts';

export interface SaveToProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    description?: string;
    status: ArtifactStatus;
  }) => Promise<void>;
  artifactType: ArtifactType;
  defaultName?: string;
  isLoading?: boolean;
}

/**
 * Modal for saving AI Builder or AI Debate work to a project.
 * Allows user to name the artifact and add a description.
 */
export function SaveToProjectModal({
  isOpen,
  onClose,
  onSave,
  artifactType,
  defaultName = '',
  isLoading = false,
}: SaveToProjectModalProps) {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ArtifactStatus>('published');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter a name for this artifact');
      return;
    }

    try {
      await onSave({
        name: trimmedName,
        description: description.trim() || undefined,
        status,
      });
      // Reset form on success
      setName('');
      setDescription('');
      setStatus('published');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save artifact');
    }
  }, [name, description, status, onSave]);

  const handleClose = useCallback(() => {
    setName(defaultName);
    setDescription('');
    setStatus('published');
    setError(null);
    onClose();
  }, [onClose, defaultName]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && e.metaKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  if (!isOpen) return null;

  const typeLabel = getArtifactTypeLabel(artifactType);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <FocusTrap onEscape={handleClose}>
        <div
          className="bg-zinc-900 rounded-xl border border-zinc-800 max-w-md w-full shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
        >
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                <SaveIcon size={20} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-100">
                  Save {typeLabel} to Project
                </h3>
                <p className="text-sm text-zinc-400">
                  Share this work with your team
                </p>
              </div>
            </div>
          </div>

          {/* Modal Content */}
          <div className="px-6 py-5 space-y-4">
            {/* Name Input */}
            <div>
              <label
                htmlFor="artifact-name-input"
                className="text-sm font-medium text-zinc-300 mb-2 block"
              >
                Name <span className="text-red-400">*</span>
              </label>
              <input
                id="artifact-name-input"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={`My ${typeLabel}`}
                className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
                disabled={isLoading}
              />
            </div>

            {/* Description Input */}
            <div>
              <label
                htmlFor="artifact-description-input"
                className="text-sm font-medium text-zinc-300 mb-2 block"
              >
                Description{' '}
                <span className="text-zinc-500 font-normal">(optional)</span>
              </label>
              <textarea
                id="artifact-description-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a brief description of this work..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                disabled={isLoading}
              />
            </div>

            {/* Status Selection */}
            <div>
              <label className="text-sm font-medium text-zinc-300 mb-2 block">
                Status
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="artifact-status"
                    checked={status === 'published'}
                    onChange={() => setStatus('published')}
                    className="w-4 h-4 text-blue-500 bg-zinc-800 border-zinc-600 focus:ring-blue-500 focus:ring-offset-zinc-900"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-zinc-300">Published</span>
                  <span className="text-xs text-zinc-500">
                    - Visible to team
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="artifact-status"
                    checked={status === 'draft'}
                    onChange={() => setStatus('draft')}
                    className="w-4 h-4 text-blue-500 bg-zinc-800 border-zinc-600 focus:ring-blue-500 focus:ring-offset-zinc-900"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-zinc-300">Draft</span>
                  <span className="text-xs text-zinc-500">
                    - Work in progress
                  </span>
                </label>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="px-6 py-4 border-t border-zinc-800 flex gap-3">
            <button
              onClick={handleClose}
              className="btn-secondary flex-1 py-2.5"
              disabled={isLoading}
            >
              <XIcon size={16} />
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="btn-primary flex-1 py-2.5"
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  </span>
                  Saving...
                </>
              ) : (
                <>
                  <CheckIcon size={16} />
                  Save to Project
                </>
              )}
            </button>
          </div>

          {/* Keyboard Hint */}
          <div className="px-6 pb-4 text-center">
            <span className="text-xs text-zinc-500">
              Press <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-400">⌘</kbd>
              +<kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-400">Enter</kbd>{' '}
              to save
            </span>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}
