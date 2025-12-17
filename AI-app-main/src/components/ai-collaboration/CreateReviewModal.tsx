/**
 * CreateReviewModal - Create a new review request
 *
 * Modal for requesting review of AI-generated code.
 */

'use client';

import React, { useState } from 'react';
import { ReviewType } from '@/types/aiCollaboration';

interface CreateReviewModalProps {
  appId: string;
  teamId?: string;
  teamMembers: { id: string; name?: string; email?: string }[];
  onClose: () => void;
  onSubmit: (input: {
    appId: string;
    teamId?: string;
    reviewType: ReviewType;
    title: string;
    description?: string;
    aiOutput: unknown;
    phaseId?: string;
    featureName?: string;
    filesToAdd?: { path: string; content: string }[];
    filesToModify?: { path: string; oldContent: string; newContent: string }[];
    assignedReviewers: string[];
    requiredApprovals?: number;
    expiresAt?: string;
  }) => Promise<void>;
}

export default function CreateReviewModal({
  appId,
  teamId,
  teamMembers,
  onClose,
  onSubmit,
}: CreateReviewModalProps) {
  const [reviewType, setReviewType] = useState<ReviewType>('code_change');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [featureName, setFeatureName] = useState('');
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);
  const [requiredApprovals, setRequiredApprovals] = useState(1);
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // File changes (simplified for demo - in real app would integrate with editor)
  const [filesToAdd, setFilesToAdd] = useState<{ path: string; content: string }[]>([]);
  const [filesToModify, setFilesToModify] = useState<{ path: string; oldContent: string; newContent: string }[]>([]);
  const [newFilePath, setNewFilePath] = useState('');
  const [newFileContent, setNewFileContent] = useState('');

  const handleToggleReviewer = (userId: string) => {
    setSelectedReviewers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAddFile = () => {
    if (newFilePath.trim() && newFileContent.trim()) {
      setFilesToAdd([...filesToAdd, { path: newFilePath.trim(), content: newFileContent.trim() }]);
      setNewFilePath('');
      setNewFileContent('');
    }
  };

  const handleRemoveFile = (index: number) => {
    setFilesToAdd(filesToAdd.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (selectedReviewers.length === 0) {
      setError('Please select at least one reviewer');
      return;
    }
    if (filesToAdd.length === 0 && filesToModify.length === 0) {
      setError('Please add at least one file change');
      return;
    }

    setIsSubmitting(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      await onSubmit({
        appId,
        teamId,
        reviewType,
        title: title.trim(),
        description: description.trim() || undefined,
        aiOutput: {}, // In real app, this would be the actual AI output
        featureName: featureName.trim() || undefined,
        filesToAdd: filesToAdd.length > 0 ? filesToAdd : undefined,
        filesToModify: filesToModify.length > 0 ? filesToModify : undefined,
        assignedReviewers: selectedReviewers,
        requiredApprovals,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create review request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const reviewTypeOptions: { value: ReviewType; label: string }[] = [
    { value: 'phase_output', label: 'Phase Output' },
    { value: 'code_change', label: 'Code Change' },
    { value: 'feature_addition', label: 'Feature Addition' },
    { value: 'bug_fix', label: 'Bug Fix' },
    { value: 'refactor', label: 'Refactor' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Request Code Review</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Review Type */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Review Type</label>
            <div className="flex flex-wrap gap-2">
              {reviewTypeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setReviewType(option.value)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    reviewType === option.value
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Add user authentication system"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this code does..."
              rows={2}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Feature Name */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Feature Name</label>
            <input
              type="text"
              value={featureName}
              onChange={(e) => setFeatureName(e.target.value)}
              placeholder="e.g., Login System"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Files to Add */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Files to Add</label>
            {filesToAdd.map((file, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-gray-800 rounded-lg">
                <span className="text-green-400">+</span>
                <span className="text-sm text-gray-300 font-mono flex-1 truncate">{file.path}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  className="p-1 text-gray-500 hover:text-red-400"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            <div className="space-y-2 p-3 bg-gray-800/50 rounded-lg border border-dashed border-gray-700">
              <input
                type="text"
                value={newFilePath}
                onChange={(e) => setNewFilePath(e.target.value)}
                placeholder="File path (e.g., src/auth/login.ts)"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm font-mono"
              />
              <textarea
                value={newFileContent}
                onChange={(e) => setNewFileContent(e.target.value)}
                placeholder="File content..."
                rows={4}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 resize-none text-sm font-mono"
              />
              <button
                type="button"
                onClick={handleAddFile}
                disabled={!newFilePath.trim() || !newFileContent.trim()}
                className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Add File
              </button>
            </div>
          </div>

          {/* Reviewers */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Assign Reviewers <span className="text-red-400">*</span>
            </label>
            {teamMembers.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No team members available</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {teamMembers.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => handleToggleReviewer(member.id)}
                    className={`p-2 rounded-lg border text-left transition-colors flex items-center gap-2 ${
                      selectedReviewers.includes(member.id)
                        ? 'bg-emerald-500/20 border-emerald-500/50'
                        : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center text-white font-medium text-xs">
                      {(member.name || member.email || 'U')[0].toUpperCase()}
                    </div>
                    <span className="text-sm text-white truncate">
                      {member.name || member.email || 'Team Member'}
                    </span>
                    {selectedReviewers.includes(member.id) && (
                      <svg className="w-4 h-4 text-emerald-400 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Required Approvals</label>
              <input
                type="number"
                min={1}
                max={selectedReviewers.length || 1}
                value={requiredApprovals}
                onChange={(e) => setRequiredApprovals(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Expires In (Days)</label>
              <input
                type="number"
                min={1}
                max={30}
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 7)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim() || selectedReviewers.length === 0 || (filesToAdd.length === 0 && filesToModify.length === 0)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Creating...
              </>
            ) : (
              'Request Review'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
