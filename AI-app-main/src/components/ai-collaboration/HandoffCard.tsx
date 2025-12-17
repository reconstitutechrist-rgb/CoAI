/**
 * HandoffCard - Individual handoff display
 *
 * Shows handoff details and action buttons.
 */

'use client';

import React, { useState } from 'react';
import { AIConversationHandoff } from '@/types/aiCollaboration';

interface HandoffCardProps {
  handoff: AIConversationHandoff;
  currentUserId: string;
  onAccept: (handoffId: string, message?: string) => Promise<void>;
  onDecline: (handoffId: string, reason?: string) => Promise<void>;
  onComplete: (handoffId: string, completionNotes?: string) => Promise<void>;
}

export default function HandoffCard({
  handoff,
  currentUserId,
  onAccept,
  onDecline,
  onComplete,
}: HandoffCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [showResponseInput, setShowResponseInput] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [responseAction, setResponseAction] = useState<'accept' | 'decline' | 'complete' | null>(null);

  const isIncoming = handoff.toUserId === currentUserId;
  const isOutgoing = handoff.fromUserId === currentUserId;
  const canAccept = isIncoming && handoff.status === 'pending';
  const canComplete = isIncoming && handoff.status === 'accepted';

  const urgencyConfig = {
    low: { color: 'bg-gray-500/20 text-gray-400', label: 'Low' },
    normal: { color: 'bg-blue-500/20 text-blue-400', label: 'Normal' },
    high: { color: 'bg-orange-500/20 text-orange-400', label: 'High' },
    critical: { color: 'bg-red-500/20 text-red-400 animate-pulse', label: 'Critical' },
  };

  const statusConfig = {
    pending: { color: 'bg-yellow-500/20 text-yellow-400', label: 'Pending' },
    accepted: { color: 'bg-green-500/20 text-green-400', label: 'Active' },
    declined: { color: 'bg-red-500/20 text-red-400', label: 'Declined' },
    completed: { color: 'bg-blue-500/20 text-blue-400', label: 'Completed' },
    expired: { color: 'bg-gray-500/20 text-gray-400', label: 'Expired' },
  };

  const modeConfig = {
    plan: { color: 'text-green-400', label: 'PLAN Mode' },
    act: { color: 'text-blue-400', label: 'ACT Mode' },
    layout: { color: 'text-purple-400', label: 'Layout Mode' },
  };

  const handleAction = async () => {
    setIsActing(true);
    try {
      if (responseAction === 'accept') {
        await onAccept(handoff.id, responseText || undefined);
      } else if (responseAction === 'decline') {
        await onDecline(handoff.id, responseText || undefined);
      } else if (responseAction === 'complete') {
        await onComplete(handoff.id, responseText || undefined);
      }
      setShowResponseInput(false);
      setResponseText('');
      setResponseAction(null);
    } finally {
      setIsActing(false);
    }
  };

  const startAction = (action: 'accept' | 'decline' | 'complete') => {
    setResponseAction(action);
    setShowResponseInput(true);
  };

  return (
    <div className={`bg-gray-800 rounded-lg border transition-colors ${
      handoff.status === 'pending' && isIncoming
        ? handoff.urgency === 'critical'
          ? 'border-red-500/50'
          : handoff.urgency === 'high'
            ? 'border-orange-500/50'
            : 'border-cyan-500/30'
        : 'border-gray-700'
    }`}>
      {/* Card Header */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-750"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig[handoff.status].color}`}>
                {statusConfig[handoff.status].label}
              </span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${urgencyConfig[handoff.urgency || 'normal'].color}`}>
                {urgencyConfig[handoff.urgency || 'normal'].label}
              </span>
              <span className={`text-xs ${modeConfig[handoff.currentMode].color}`}>
                {modeConfig[handoff.currentMode].label}
              </span>
              {handoff.currentPhase && (
                <span className="text-xs text-gray-500">
                  Phase: {handoff.currentPhase}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm">
              {isIncoming ? (
                <>
                  <span className="text-gray-400">From:</span>
                  <span className="text-white font-medium">
                    {handoff.fromUser?.name || handoff.fromUser?.email || 'Team Member'}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-gray-400">To:</span>
                  <span className="text-white font-medium">
                    {handoff.toUser?.name || handoff.toUser?.email || 'Team Member'}
                  </span>
                </>
              )}
            </div>

            <p className="text-sm text-gray-400 mt-2 line-clamp-2">{handoff.handoffNotes}</p>
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
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-700 p-4 space-y-4">
          {/* Handoff Notes */}
          <div className="bg-gray-900 rounded-lg p-3">
            <h5 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Handoff Notes</h5>
            <p className="text-sm text-gray-300 whitespace-pre-wrap">{handoff.handoffNotes}</p>
          </div>

          {/* Suggested Actions */}
          {handoff.suggestedActions && handoff.suggestedActions.length > 0 && (
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
              <h5 className="text-xs font-medium text-cyan-400 uppercase tracking-wide mb-2">Suggested Actions</h5>
              <ul className="space-y-1">
                {handoff.suggestedActions.map((action, index) => (
                  <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-cyan-400 mt-0.5">•</span>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Response from receiver */}
          {handoff.acceptedMessage && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <h5 className="text-xs font-medium text-green-400 uppercase tracking-wide mb-2">Acceptance Message</h5>
              <p className="text-sm text-gray-300">{handoff.acceptedMessage}</p>
            </div>
          )}

          {handoff.declinedReason && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <h5 className="text-xs font-medium text-red-400 uppercase tracking-wide mb-2">Decline Reason</h5>
              <p className="text-sm text-gray-300">{handoff.declinedReason}</p>
            </div>
          )}

          {handoff.completionNotes && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <h5 className="text-xs font-medium text-blue-400 uppercase tracking-wide mb-2">Completion Notes</h5>
              <p className="text-sm text-gray-300">{handoff.completionNotes}</p>
            </div>
          )}

          {/* Response Input */}
          {showResponseInput && (
            <div className="bg-gray-900 rounded-lg p-3 space-y-3">
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder={
                  responseAction === 'accept'
                    ? 'Add an acceptance message (optional)...'
                    : responseAction === 'decline'
                      ? 'Reason for declining (optional)...'
                      : 'Completion notes (optional)...'
                }
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAction}
                  disabled={isActing}
                  className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${
                    responseAction === 'accept'
                      ? 'bg-green-600 hover:bg-green-700'
                      : responseAction === 'decline'
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isActing ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    responseAction === 'accept' ? 'Accept' : responseAction === 'decline' ? 'Decline' : 'Complete'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowResponseInput(false);
                    setResponseAction(null);
                    setResponseText('');
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!showResponseInput && (
            <div className="flex gap-2 pt-2 border-t border-gray-700">
              {canAccept && (
                <>
                  <button
                    onClick={() => startAction('accept')}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Accept
                  </button>
                  <button
                    onClick={() => startAction('decline')}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Decline
                  </button>
                </>
              )}
              {canComplete && (
                <button
                  onClick={() => startAction('complete')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Mark Complete
                </button>
              )}
              <span className="ml-auto text-xs text-gray-500 self-center">
                {new Date(handoff.createdAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
