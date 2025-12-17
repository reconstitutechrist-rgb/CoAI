/**
 * PhasePlanningPanel - Collaborative Phase Planning
 *
 * Allows teams to collaboratively design and vote on build phases.
 */

'use client';

import React, { useState } from 'react';
import {
  PhasePlanningSession,
  PhaseSuggestion,
  SessionStatus,
} from '@/types/aiCollaboration';
import PhaseSuggestionCard from './PhaseSuggestionCard';
import AddSuggestionModal from './AddSuggestionModal';

interface PhasePlanningPanelProps {
  session: PhasePlanningSession | null;
  currentUserId: string;
  appId: string;
  teamId?: string;
  onCreateSession: (input: {
    appId: string;
    teamId?: string;
    title: string;
    description?: string;
    aiGeneratedPhases?: unknown[];
    maxPhases?: number;
  }) => Promise<void>;
  onAddSuggestion: (input: {
    phaseName: string;
    phaseDescription: string;
    features: string[];
    dependencies?: number[];
    estimatedComplexity?: 'low' | 'medium' | 'high';
    insertAtPosition?: number;
  }) => Promise<void>;
  onVoteSuggestion: (
    suggestionId: string,
    vote: 'up' | 'down',
    comment?: string
  ) => Promise<void>;
  onApproveSuggestion: (suggestionId: string) => Promise<void>;
  onRejectSuggestion: (suggestionId: string, reason?: string) => Promise<void>;
  onFinalizeSession: () => Promise<void>;
  isLoading?: boolean;
}

export default function PhasePlanningPanel({
  session,
  currentUserId,
  appId,
  teamId,
  onCreateSession,
  onAddSuggestion,
  onVoteSuggestion,
  onApproveSuggestion,
  onRejectSuggestion,
  onFinalizeSession,
  isLoading = false,
}: PhasePlanningPanelProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddSuggestion, setShowAddSuggestion] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [maxPhases, setMaxPhases] = useState(10);
  const [isCreating, setIsCreating] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const handleCreateSession = async () => {
    if (!createTitle.trim()) return;

    setIsCreating(true);
    try {
      await onCreateSession({
        appId,
        teamId,
        title: createTitle.trim(),
        description: createDescription.trim() || undefined,
        maxPhases,
      });
      setShowCreateModal(false);
      setCreateTitle('');
      setCreateDescription('');
    } finally {
      setIsCreating(false);
    }
  };

  const handleFinalize = async () => {
    if (!confirm('Are you sure you want to finalize this phase plan? This will lock the phases.')) return;

    setIsFinalizing(true);
    try {
      await onFinalizeSession();
    } finally {
      setIsFinalizing(false);
    }
  };

  const isOwner = session?.createdBy === currentUserId;
  const canFinalize = session?.status === 'active' && isOwner;

  const sortedSuggestions = [...(session?.suggestions || [])].sort((a, b) => {
    // Sort by status (approved first), then by votes
    if (a.status === 'approved' && b.status !== 'approved') return -1;
    if (b.status === 'approved' && a.status !== 'approved') return 1;
    const aVotes = (a.votes?.filter(v => v.vote === 'up').length || 0) - (a.votes?.filter(v => v.vote === 'down').length || 0);
    const bVotes = (b.votes?.filter(v => v.vote === 'up').length || 0) - (b.votes?.filter(v => v.vote === 'down').length || 0);
    return bVotes - aVotes;
  });

  const approvedCount = session?.suggestions?.filter(s => s.status === 'approved').length || 0;

  if (!session) {
    return (
      <div className="flex flex-col h-full bg-gray-900 rounded-lg border border-gray-700">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Phase Planning</h3>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="p-4 bg-gray-800 rounded-full mb-4">
            <svg className="w-12 h-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h4 className="text-lg font-medium text-white mb-2">No Active Planning Session</h4>
          <p className="text-gray-400 text-center max-w-md mb-6">
            Start a collaborative planning session to let your team design build phases together.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Start Planning Session
          </button>
        </div>

        {/* Create Session Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
            <div className="relative bg-gray-900 rounded-xl border border-gray-700 w-full max-w-md p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Start Planning Session</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Session Title</label>
                  <input
                    type="text"
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    placeholder="e.g., E-commerce App Phase Planning"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                  <textarea
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    placeholder="What are we planning?"
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Max Phases</label>
                  <input
                    type="number"
                    min={3}
                    max={25}
                    value={maxPhases}
                    onChange={(e) => setMaxPhases(parseInt(e.target.value) || 10)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSession}
                  disabled={isCreating || !createTitle.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create Session'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const statusConfig = {
    active: { color: 'bg-green-500/20 text-green-400', label: 'Active' },
    voting: { color: 'bg-yellow-500/20 text-yellow-400', label: 'Voting' },
    finalized: { color: 'bg-blue-500/20 text-blue-400', label: 'Finalized' },
    cancelled: { color: 'bg-red-500/20 text-red-400', label: 'Cancelled' },
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-lg">
            <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">{session.title}</h3>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig[session.status].color}`}>
                {statusConfig[session.status].label}
              </span>
            </div>
            <p className="text-sm text-gray-400">
              {approvedCount} approved / {session.maxPhases || 10} max phases
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {session.status === 'active' && (
            <button
              onClick={() => setShowAddSuggestion(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Suggest Phase
            </button>
          )}
          {canFinalize && (
            <button
              onClick={handleFinalize}
              disabled={isFinalizing || approvedCount === 0}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isFinalizing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              Finalize Plan
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      {session.description && (
        <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-700">
          <p className="text-sm text-gray-400">{session.description}</p>
        </div>
      )}

      {/* Progress Bar */}
      <div className="px-4 py-3 border-b border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span>Approved Phases</span>
          <span>{approvedCount} / {session.maxPhases || 10}</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 transition-all"
            style={{ width: `${(approvedCount / (session.maxPhases || 10)) * 100}%` }}
          />
        </div>
      </div>

      {/* Suggestions List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
          </div>
        ) : sortedSuggestions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No phase suggestions yet</p>
            <p className="text-sm text-gray-500 mt-1">Be the first to suggest a build phase!</p>
          </div>
        ) : (
          sortedSuggestions.map((suggestion) => (
            <PhaseSuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              currentUserId={currentUserId}
              isOwner={isOwner}
              sessionStatus={session.status}
              onVote={onVoteSuggestion}
              onApprove={onApproveSuggestion}
              onReject={onRejectSuggestion}
            />
          ))
        )}
      </div>

      {/* Add Suggestion Modal */}
      {showAddSuggestion && (
        <AddSuggestionModal
          existingSuggestions={session.suggestions || []}
          onClose={() => setShowAddSuggestion(false)}
          onSubmit={async (input) => {
            await onAddSuggestion(input);
            setShowAddSuggestion(false);
          }}
        />
      )}
    </div>
  );
}
