/**
 * AIDecisionPanel - Main panel for AI decision voting
 *
 * Displays AI suggestions that require team voting before implementation.
 */

'use client';

import React, { useState, useMemo } from 'react';
import { AIDecision, DecisionStatus, VotingType } from '@/types/aiCollaboration';
import AIDecisionCard from './AIDecisionCard';
import CreateDecisionModal from './CreateDecisionModal';

interface AIDecisionPanelProps {
  decisions: AIDecision[];
  currentUserId: string;
  onVote: (decisionId: string, choice: 'approve' | 'reject' | 'abstain' | 'request_changes', comment?: string) => Promise<void>;
  onApplyDecision: (decisionId: string, selectedOption?: number) => Promise<void>;
  onWithdraw: (decisionId: string) => Promise<void>;
  onCreateDecision: (input: {
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
  isLoading?: boolean;
  appId: string;
  teamId?: string;
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

export default function AIDecisionPanel({
  decisions,
  currentUserId,
  onVote,
  onApplyDecision,
  onWithdraw,
  onCreateDecision,
  isLoading = false,
  appId,
  teamId,
}: AIDecisionPanelProps) {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedDecisionId, setExpandedDecisionId] = useState<string | null>(null);

  const filteredDecisions = useMemo(() => {
    if (filterStatus === 'all') return decisions;
    return decisions.filter((d) => {
      if (filterStatus === 'pending') return d.status === 'pending';
      if (filterStatus === 'approved') return d.status === 'approved';
      if (filterStatus === 'rejected') return d.status === 'rejected' || d.status === 'expired';
      return true;
    });
  }, [decisions, filterStatus]);

  const pendingCount = decisions.filter((d) => d.status === 'pending').length;

  const statusCounts = useMemo(() => ({
    all: decisions.length,
    pending: decisions.filter((d) => d.status === 'pending').length,
    approved: decisions.filter((d) => d.status === 'approved').length,
    rejected: decisions.filter((d) => d.status === 'rejected' || d.status === 'expired').length,
  }), [decisions]);

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">AI Decisions</h3>
            <p className="text-sm text-gray-400">
              {pendingCount > 0 ? `${pendingCount} pending vote${pendingCount !== 1 ? 's' : ''}` : 'No pending decisions'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Decision
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 p-2 border-b border-gray-700 bg-gray-800/50">
        {(['all', 'pending', 'approved', 'rejected'] as FilterStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
              filterStatus === status
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              filterStatus === status ? 'bg-purple-500' : 'bg-gray-600'
            }`}>
              {statusCounts[status]}
            </span>
          </button>
        ))}
      </div>

      {/* Decision List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
          </div>
        ) : filteredDecisions.length === 0 ? (
          <div className="text-center py-12">
            <div className="p-4 bg-gray-800 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-400">No {filterStatus !== 'all' ? filterStatus : ''} decisions</p>
            <p className="text-sm text-gray-500 mt-1">
              Create a new decision to get team input on AI suggestions
            </p>
          </div>
        ) : (
          filteredDecisions.map((decision) => (
            <AIDecisionCard
              key={decision.id}
              decision={decision}
              currentUserId={currentUserId}
              isExpanded={expandedDecisionId === decision.id}
              onToggleExpand={() => setExpandedDecisionId(
                expandedDecisionId === decision.id ? null : decision.id
              )}
              onVote={onVote}
              onApply={onApplyDecision}
              onWithdraw={onWithdraw}
            />
          ))
        )}
      </div>

      {/* Create Decision Modal */}
      {showCreateModal && (
        <CreateDecisionModal
          appId={appId}
          teamId={teamId}
          onClose={() => setShowCreateModal(false)}
          onSubmit={async (input) => {
            await onCreateDecision(input);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}
