/**
 * CreateDecisionModal - Modal for creating new AI decisions
 *
 * Allows users to create decision requests for team voting.
 */

'use client';

import React, { useState } from 'react';
import { VotingType } from '@/types/aiCollaboration';

interface CreateDecisionModalProps {
  appId: string;
  teamId?: string;
  onClose: () => void;
  onSubmit: (input: {
    appId: string;
    teamId?: string;
    title: string;
    description?: string;
    aiSuggestion: string;
    aiReasoning?: string;
    aiAlternatives?: { suggestion: string; reasoning?: string }[];
    votingType?: VotingType;
    requiredVotes?: number;
    expiresAt?: string;
    phaseId?: string;
    featureName?: string;
  }) => Promise<void>;
}

export default function CreateDecisionModal({
  appId,
  teamId,
  onClose,
  onSubmit,
}: CreateDecisionModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [aiReasoning, setAiReasoning] = useState('');
  const [votingType, setVotingType] = useState<VotingType>('majority');
  const [requiredVotes, setRequiredVotes] = useState(1);
  const [alternatives, setAlternatives] = useState<{ suggestion: string; reasoning: string }[]>([]);
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddAlternative = () => {
    setAlternatives([...alternatives, { suggestion: '', reasoning: '' }]);
  };

  const handleRemoveAlternative = (index: number) => {
    setAlternatives(alternatives.filter((_, i) => i !== index));
  };

  const handleAlternativeChange = (index: number, field: 'suggestion' | 'reasoning', value: string) => {
    const updated = [...alternatives];
    updated[index][field] = value;
    setAlternatives(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!aiSuggestion.trim()) {
      setError('AI suggestion is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      await onSubmit({
        appId,
        teamId,
        title: title.trim(),
        description: description.trim() || undefined,
        aiSuggestion: aiSuggestion.trim(),
        aiReasoning: aiReasoning.trim() || undefined,
        aiAlternatives: alternatives.filter((a) => a.suggestion.trim()).map((a) => ({
          suggestion: a.suggestion.trim(),
          reasoning: a.reasoning.trim() || undefined,
        })),
        votingType,
        requiredVotes: votingType === 'threshold' ? requiredVotes : undefined,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create decision');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Create Decision Request</h3>
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

          {/* Title */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Authentication approach for user login"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context for the decision..."
              rows={2}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          {/* AI Suggestion */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              AI Suggestion <span className="text-red-400">*</span>
            </label>
            <textarea
              value={aiSuggestion}
              onChange={(e) => setAiSuggestion(e.target.value)}
              placeholder="The AI's recommended approach or code..."
              rows={4}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none font-mono text-sm"
            />
          </div>

          {/* AI Reasoning */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">AI Reasoning</label>
            <textarea
              value={aiReasoning}
              onChange={(e) => setAiReasoning(e.target.value)}
              placeholder="Why the AI recommends this approach..."
              rows={2}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          {/* Alternatives */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-300">Alternative Options</label>
              <button
                type="button"
                onClick={handleAddAlternative}
                className="text-sm text-purple-400 hover:text-purple-300"
              >
                + Add Alternative
              </button>
            </div>
            {alternatives.map((alt, index) => (
              <div key={index} className="p-3 bg-gray-800 rounded-lg space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-xs text-gray-500 mt-2">#{index + 1}</span>
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={alt.suggestion}
                      onChange={(e) => handleAlternativeChange(index, 'suggestion', e.target.value)}
                      placeholder="Alternative suggestion..."
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
                    />
                    <input
                      type="text"
                      value={alt.reasoning}
                      onChange={(e) => handleAlternativeChange(index, 'reasoning', e.target.value)}
                      placeholder="Why this alternative..."
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAlternative(index)}
                    className="p-1 text-gray-500 hover:text-red-400"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Voting Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Voting Type</label>
              <select
                value={votingType}
                onChange={(e) => setVotingType(e.target.value as VotingType)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option value="majority">Majority Vote</option>
                <option value="unanimous">Unanimous</option>
                <option value="threshold">Vote Threshold</option>
                <option value="owner_approval">Owner Approval</option>
              </select>
            </div>

            {votingType === 'threshold' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">Required Votes</label>
                <input
                  type="number"
                  min={1}
                  value={requiredVotes}
                  onChange={(e) => setRequiredVotes(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Expires In (Days)</label>
              <input
                type="number"
                min={1}
                max={30}
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 7)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
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
            disabled={isSubmitting || !title.trim() || !aiSuggestion.trim()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Creating...
              </>
            ) : (
              'Create Decision'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
