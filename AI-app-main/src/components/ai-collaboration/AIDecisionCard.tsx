/**
 * AIDecisionCard - Individual decision card with voting UI
 *
 * Shows AI suggestion, voting progress, and allows team members to vote.
 */

'use client';

import React, { useState } from 'react';
import { AIDecision, AIDecisionVote, VoteChoice } from '@/types/aiCollaboration';

interface AIDecisionCardProps {
  decision: AIDecision;
  currentUserId: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onVote: (decisionId: string, choice: VoteChoice, comment?: string) => Promise<void>;
  onApply: (decisionId: string, selectedOption?: number) => Promise<void>;
  onWithdraw: (decisionId: string) => Promise<void>;
}

export default function AIDecisionCard({
  decision,
  currentUserId,
  isExpanded,
  onToggleExpand,
  onVote,
  onApply,
  onWithdraw,
}: AIDecisionCardProps) {
  const [isVoting, setIsVoting] = useState(false);
  const [voteComment, setVoteComment] = useState('');
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [selectedAlternative, setSelectedAlternative] = useState<number | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const userVote = decision.votes?.find((v) => v.userId === currentUserId);
  const isCreator = decision.createdBy === currentUserId;
  const canVote = decision.status === 'pending' && !userVote;
  const canApply = decision.status === 'approved' && isCreator;
  const canWithdraw = decision.status === 'pending' && isCreator;

  const voteCounts = {
    approve: decision.votes?.filter((v) => v.choice === 'approve').length || 0,
    reject: decision.votes?.filter((v) => v.choice === 'reject').length || 0,
    abstain: decision.votes?.filter((v) => v.choice === 'abstain').length || 0,
    request_changes: decision.votes?.filter((v) => v.choice === 'request_changes').length || 0,
  };

  const totalVotes = decision.votes?.length || 0;
  const approvalPercentage = totalVotes > 0 ? (voteCounts.approve / totalVotes) * 100 : 0;

  const handleVote = async (choice: VoteChoice) => {
    setIsVoting(true);
    try {
      await onVote(decision.id, choice, voteComment || undefined);
      setShowCommentInput(false);
      setVoteComment('');
    } finally {
      setIsVoting(false);
    }
  };

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await onApply(decision.id, selectedAlternative ?? undefined);
    } finally {
      setIsApplying(false);
    }
  };

  const getStatusBadge = () => {
    const statusConfig = {
      pending: { color: 'bg-yellow-500/20 text-yellow-400', label: 'Pending Votes' },
      approved: { color: 'bg-green-500/20 text-green-400', label: 'Approved' },
      rejected: { color: 'bg-red-500/20 text-red-400', label: 'Rejected' },
      expired: { color: 'bg-gray-500/20 text-gray-400', label: 'Expired' },
      withdrawn: { color: 'bg-gray-500/20 text-gray-400', label: 'Withdrawn' },
    };
    const config = statusConfig[decision.status];
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getVotingTypeLabel = () => {
    const labels = {
      majority: 'Majority Vote',
      unanimous: 'Unanimous',
      threshold: `${decision.requiredVotes || 1} vote${(decision.requiredVotes || 1) > 1 ? 's' : ''} required`,
      owner_approval: 'Owner Approval',
    };
    return labels[decision.votingType];
  };

  return (
    <div className={`bg-gray-800 rounded-lg border transition-colors ${
      decision.status === 'pending' ? 'border-yellow-500/30' : 'border-gray-700'
    }`}>
      {/* Card Header */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-750"
        onClick={onToggleExpand}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {getStatusBadge()}
              <span className="text-xs text-gray-500">{getVotingTypeLabel()}</span>
            </div>
            <h4 className="text-white font-medium truncate">{decision.title}</h4>
            {decision.description && (
              <p className="text-sm text-gray-400 mt-1 line-clamp-2">{decision.description}</p>
            )}
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Vote Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
            <span>{Math.round(approvalPercentage)}% approval</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden flex">
            {totalVotes > 0 && (
              <>
                <div
                  className="bg-green-500 transition-all"
                  style={{ width: `${(voteCounts.approve / totalVotes) * 100}%` }}
                />
                <div
                  className="bg-red-500 transition-all"
                  style={{ width: `${(voteCounts.reject / totalVotes) * 100}%` }}
                />
                <div
                  className="bg-yellow-500 transition-all"
                  style={{ width: `${(voteCounts.request_changes / totalVotes) * 100}%` }}
                />
                <div
                  className="bg-gray-500 transition-all"
                  style={{ width: `${(voteCounts.abstain / totalVotes) * 100}%` }}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-700 p-4 space-y-4">
          {/* AI Suggestion */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1 bg-purple-500/20 rounded">
                <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-purple-300">AI Suggestion</span>
            </div>
            <p className="text-white whitespace-pre-wrap">{decision.aiSuggestion}</p>
            {decision.aiReasoning && (
              <p className="text-sm text-gray-400 mt-2 italic">{decision.aiReasoning}</p>
            )}
          </div>

          {/* Alternatives */}
          {decision.aiAlternatives && decision.aiAlternatives.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-gray-300">Alternative Options</h5>
              {decision.aiAlternatives.map((alt, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedAlternative === index
                      ? 'bg-blue-500/20 border-blue-500/50'
                      : 'bg-gray-700/50 border-gray-600 hover:border-gray-500'
                  }`}
                  onClick={() => setSelectedAlternative(selectedAlternative === index ? null : index)}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={selectedAlternative === index}
                      onChange={() => setSelectedAlternative(index)}
                      className="text-blue-500"
                    />
                    <span className="text-sm text-white">{alt.suggestion}</span>
                  </div>
                  {alt.reasoning && (
                    <p className="text-xs text-gray-400 mt-1 ml-6">{alt.reasoning}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Votes List */}
          {decision.votes && decision.votes.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-gray-300">Votes</h5>
              <div className="space-y-2">
                {decision.votes.map((vote) => (
                  <VoteItem key={vote.id} vote={vote} />
                ))}
              </div>
            </div>
          )}

          {/* User's Vote Display */}
          {userVote && (
            <div className="flex items-center gap-2 p-3 bg-gray-700/50 rounded-lg">
              <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-gray-300">
                You voted: <span className="font-medium text-white capitalize">{userVote.choice.replace('_', ' ')}</span>
              </span>
            </div>
          )}

          {/* Voting Actions */}
          {canVote && (
            <div className="space-y-3">
              <h5 className="text-sm font-medium text-gray-300">Cast Your Vote</h5>

              {showCommentInput && (
                <div className="space-y-2">
                  <textarea
                    value={voteComment}
                    onChange={(e) => setVoteComment(e.target.value)}
                    placeholder="Add a comment (optional)..."
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:border-purple-500 resize-none"
                    rows={2}
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleVote('approve')}
                  disabled={isVoting}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Approve
                </button>
                <button
                  onClick={() => handleVote('reject')}
                  disabled={isVoting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Reject
                </button>
                <button
                  onClick={() => handleVote('request_changes')}
                  disabled={isVoting}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Request Changes
                </button>
                <button
                  onClick={() => handleVote('abstain')}
                  disabled={isVoting}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  Abstain
                </button>
                <button
                  onClick={() => setShowCommentInput(!showCommentInput)}
                  className="px-3 py-2 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  {showCommentInput ? 'Hide Comment' : 'Add Comment'}
                </button>
              </div>
            </div>
          )}

          {/* Apply/Withdraw Actions */}
          <div className="flex gap-2 pt-2 border-t border-gray-700">
            {canApply && (
              <button
                onClick={handleApply}
                disabled={isApplying}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isApplying ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                Apply Decision
              </button>
            )}
            {canWithdraw && (
              <button
                onClick={() => onWithdraw(decision.id)}
                className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                Withdraw
              </button>
            )}
            {decision.expiresAt && decision.status === 'pending' && (
              <span className="ml-auto text-xs text-gray-500 self-center">
                Expires: {new Date(decision.expiresAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function VoteItem({ vote }: { vote: AIDecisionVote }) {
  const choiceConfig = {
    approve: { color: 'text-green-400', icon: '✓' },
    reject: { color: 'text-red-400', icon: '✗' },
    abstain: { color: 'text-gray-400', icon: '−' },
    request_changes: { color: 'text-yellow-400', icon: '✎' },
  };
  const config = choiceConfig[vote.choice];

  return (
    <div className="flex items-start gap-3 p-2 bg-gray-700/30 rounded-lg">
      <span className={`text-lg ${config.color}`}>{config.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-white font-medium">
            {vote.user?.name || vote.user?.email || 'Team Member'}
          </span>
          <span className={`text-xs ${config.color} capitalize`}>
            {vote.choice.replace('_', ' ')}
          </span>
        </div>
        {vote.comment && (
          <p className="text-xs text-gray-400 mt-1">{vote.comment}</p>
        )}
      </div>
      <span className="text-xs text-gray-500">
        {new Date(vote.createdAt).toLocaleDateString()}
      </span>
    </div>
  );
}
