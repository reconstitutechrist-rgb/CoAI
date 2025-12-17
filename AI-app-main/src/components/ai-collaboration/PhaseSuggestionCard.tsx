/**
 * PhaseSuggestionCard - Individual phase suggestion with voting
 *
 * Displays a phase suggestion with voting controls.
 */

'use client';

import React, { useState } from 'react';
import { PhaseSuggestion, SessionStatus } from '@/types/aiCollaboration';

interface PhaseSuggestionCardProps {
  suggestion: PhaseSuggestion;
  currentUserId: string;
  isOwner: boolean;
  sessionStatus: SessionStatus;
  onVote: (suggestionId: string, vote: 'up' | 'down', comment?: string) => Promise<void>;
  onApprove: (suggestionId: string) => Promise<void>;
  onReject: (suggestionId: string, reason?: string) => Promise<void>;
}

export default function PhaseSuggestionCard({
  suggestion,
  currentUserId,
  isOwner,
  sessionStatus,
  onVote,
  onApprove,
  onReject,
}: PhaseSuggestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const userVote = suggestion.votes?.find((v) => v.userId === currentUserId);
  const upVotes = suggestion.votes?.filter((v) => v.vote === 'up').length || 0;
  const downVotes = suggestion.votes?.filter((v) => v.vote === 'down').length || 0;
  const netVotes = upVotes - downVotes;

  const canVote = sessionStatus === 'active' && !userVote;
  const canApprove = isOwner && sessionStatus === 'active' && suggestion.status === 'pending';

  const handleVote = async (vote: 'up' | 'down') => {
    setIsVoting(true);
    try {
      await onVote(suggestion.id, vote);
    } finally {
      setIsVoting(false);
    }
  };

  const handleApprove = async () => {
    setIsActing(true);
    try {
      await onApprove(suggestion.id);
    } finally {
      setIsActing(false);
    }
  };

  const handleReject = async () => {
    setIsActing(true);
    try {
      await onReject(suggestion.id, rejectReason || undefined);
      setShowRejectInput(false);
      setRejectReason('');
    } finally {
      setIsActing(false);
    }
  };

  const statusConfig = {
    pending: { color: 'bg-yellow-500/20 text-yellow-400', label: 'Pending' },
    approved: { color: 'bg-green-500/20 text-green-400', label: 'Approved' },
    rejected: { color: 'bg-red-500/20 text-red-400', label: 'Rejected' },
    merged: { color: 'bg-blue-500/20 text-blue-400', label: 'Merged' },
  };

  const complexityConfig = {
    low: { color: 'text-green-400', label: 'Low complexity' },
    medium: { color: 'text-yellow-400', label: 'Medium complexity' },
    high: { color: 'text-red-400', label: 'High complexity' },
  };

  return (
    <div className={`bg-gray-800 rounded-lg border transition-colors ${
      suggestion.status === 'approved'
        ? 'border-green-500/30'
        : suggestion.status === 'rejected'
          ? 'border-red-500/30 opacity-60'
          : 'border-gray-700'
    }`}>
      {/* Card Header */}
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Vote Controls */}
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => handleVote('up')}
              disabled={!canVote || isVoting}
              className={`p-1 rounded transition-colors ${
                userVote?.vote === 'up'
                  ? 'text-green-400 bg-green-500/20'
                  : canVote
                    ? 'text-gray-500 hover:text-green-400 hover:bg-green-500/10'
                    : 'text-gray-600 cursor-not-allowed'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <span className={`text-sm font-medium ${
              netVotes > 0 ? 'text-green-400' : netVotes < 0 ? 'text-red-400' : 'text-gray-400'
            }`}>
              {netVotes}
            </span>
            <button
              onClick={() => handleVote('down')}
              disabled={!canVote || isVoting}
              className={`p-1 rounded transition-colors ${
                userVote?.vote === 'down'
                  ? 'text-red-400 bg-red-500/20'
                  : canVote
                    ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/10'
                    : 'text-gray-600 cursor-not-allowed'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig[suggestion.status].color}`}>
                {statusConfig[suggestion.status].label}
              </span>
              {suggestion.estimatedComplexity && (
                <span className={`text-xs ${complexityConfig[suggestion.estimatedComplexity].color}`}>
                  {complexityConfig[suggestion.estimatedComplexity].label}
                </span>
              )}
              {suggestion.insertAtPosition !== undefined && (
                <span className="text-xs text-gray-500">
                  Position: #{suggestion.insertAtPosition + 1}
                </span>
              )}
            </div>

            <h4 className="text-white font-medium">{suggestion.phaseName}</h4>
            <p className="text-sm text-gray-400 mt-1 line-clamp-2">{suggestion.phaseDescription}</p>

            {/* Features Preview */}
            {suggestion.features && suggestion.features.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {suggestion.features.slice(0, 3).map((feature, index) => (
                  <span key={index} className="px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded">
                    {feature}
                  </span>
                ))}
                {suggestion.features.length > 3 && (
                  <span className="px-2 py-0.5 text-xs text-gray-500">
                    +{suggestion.features.length - 3} more
                  </span>
                )}
              </div>
            )}

            {/* Author */}
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              <span>by {suggestion.user?.name || suggestion.user?.email || 'Team Member'}</span>
              <span>•</span>
              <span>{new Date(suggestion.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Expand Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-400 hover:text-white"
          >
            <svg
              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-700 p-4 space-y-4">
          {/* Full Description */}
          <div className="bg-gray-900 rounded-lg p-3">
            <h5 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Description</h5>
            <p className="text-sm text-gray-300 whitespace-pre-wrap">{suggestion.phaseDescription}</p>
          </div>

          {/* All Features */}
          {suggestion.features && suggestion.features.length > 0 && (
            <div className="bg-gray-900 rounded-lg p-3">
              <h5 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Features</h5>
              <ul className="space-y-1">
                {suggestion.features.map((feature, index) => (
                  <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-indigo-400 mt-0.5">•</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Dependencies */}
          {suggestion.dependencies && suggestion.dependencies.length > 0 && (
            <div className="bg-gray-900 rounded-lg p-3">
              <h5 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Dependencies</h5>
              <p className="text-sm text-gray-300">
                Depends on phases: {suggestion.dependencies.map(d => `#${d + 1}`).join(', ')}
              </p>
            </div>
          )}

          {/* Votes List */}
          {suggestion.votes && suggestion.votes.length > 0 && (
            <div className="bg-gray-900 rounded-lg p-3">
              <h5 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                Votes ({suggestion.votes.length})
              </h5>
              <div className="space-y-2">
                {suggestion.votes.map((vote) => (
                  <div key={vote.id} className="flex items-center gap-2 text-sm">
                    <span className={vote.vote === 'up' ? 'text-green-400' : 'text-red-400'}>
                      {vote.vote === 'up' ? '↑' : '↓'}
                    </span>
                    <span className="text-gray-300">
                      {vote.user?.name || vote.user?.email || 'Team Member'}
                    </span>
                    {vote.comment && (
                      <span className="text-gray-500 italic">"{vote.comment}"</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reject Input */}
          {showRejectInput && (
            <div className="bg-gray-900 rounded-lg p-3 space-y-2">
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection (optional)"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-red-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleReject}
                  disabled={isActing}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {isActing ? 'Rejecting...' : 'Confirm Reject'}
                </button>
                <button
                  onClick={() => {
                    setShowRejectInput(false);
                    setRejectReason('');
                  }}
                  className="px-3 py-1.5 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Owner Actions */}
          {canApprove && !showRejectInput && (
            <div className="flex gap-2 pt-2 border-t border-gray-700">
              <button
                onClick={handleApprove}
                disabled={isActing}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isActing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                Approve Phase
              </button>
              <button
                onClick={() => setShowRejectInput(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reject
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
