/**
 * HandoffPanel - AI Conversation Handoff Management
 *
 * Allows team members to transfer AI conversations to colleagues
 * with full context preservation.
 */

'use client';

import React, { useState, useMemo } from 'react';
import { AIConversationHandoff, HandoffStatus, BuilderMode } from '@/types/aiCollaboration';
import HandoffCard from './HandoffCard';
import CreateHandoffModal from './CreateHandoffModal';

interface HandoffPanelProps {
  handoffs: AIConversationHandoff[];
  currentUserId: string;
  teamMembers: { id: string; name?: string; email?: string }[];
  onCreateHandoff: (input: {
    appId: string;
    toUserId: string;
    conversationSnapshot: unknown;
    currentMode: BuilderMode;
    currentPhase?: string;
    handoffNotes: string;
    urgency?: 'low' | 'normal' | 'high' | 'critical';
    suggestedActions?: string[];
  }) => Promise<void>;
  onAcceptHandoff: (handoffId: string, message?: string) => Promise<void>;
  onDeclineHandoff: (handoffId: string, reason?: string) => Promise<void>;
  onCompleteHandoff: (handoffId: string, completionNotes?: string) => Promise<void>;
  appId: string;
  currentMode: BuilderMode;
  currentPhase?: string;
  conversationSnapshot: unknown;
  isLoading?: boolean;
}

type FilterView = 'all' | 'incoming' | 'outgoing' | 'active';

export default function HandoffPanel({
  handoffs,
  currentUserId,
  teamMembers,
  onCreateHandoff,
  onAcceptHandoff,
  onDeclineHandoff,
  onCompleteHandoff,
  appId,
  currentMode,
  currentPhase,
  conversationSnapshot,
  isLoading = false,
}: HandoffPanelProps) {
  const [filterView, setFilterView] = useState<FilterView>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const categorizedHandoffs = useMemo(() => {
    const incoming = handoffs.filter(
      (h) => h.toUserId === currentUserId && h.status === 'pending'
    );
    const outgoing = handoffs.filter(
      (h) => h.fromUserId === currentUserId && h.status === 'pending'
    );
    const active = handoffs.filter(
      (h) => (h.toUserId === currentUserId || h.fromUserId === currentUserId) && h.status === 'accepted'
    );
    return { incoming, outgoing, active, all: handoffs };
  }, [handoffs, currentUserId]);

  const filteredHandoffs = useMemo(() => {
    switch (filterView) {
      case 'incoming':
        return categorizedHandoffs.incoming;
      case 'outgoing':
        return categorizedHandoffs.outgoing;
      case 'active':
        return categorizedHandoffs.active;
      default:
        return categorizedHandoffs.all;
    }
  }, [filterView, categorizedHandoffs]);

  const incomingCount = categorizedHandoffs.incoming.length;
  const hasUrgent = categorizedHandoffs.incoming.some(
    (h) => h.urgency === 'critical' || h.urgency === 'high'
  );

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${hasUrgent ? 'bg-red-500/20' : 'bg-cyan-500/20'}`}>
            <svg className={`w-5 h-5 ${hasUrgent ? 'text-red-400' : 'text-cyan-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Conversation Handoffs</h3>
            <p className="text-sm text-gray-400">
              {incomingCount > 0 ? (
                <span className={hasUrgent ? 'text-red-400' : 'text-cyan-400'}>
                  {incomingCount} incoming handoff{incomingCount !== 1 ? 's' : ''}
                </span>
              ) : (
                'No pending handoffs'
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Handoff
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 p-2 border-b border-gray-700 bg-gray-800/50">
        {[
          { key: 'all', label: 'All', count: handoffs.length },
          { key: 'incoming', label: 'Incoming', count: categorizedHandoffs.incoming.length },
          { key: 'outgoing', label: 'Outgoing', count: categorizedHandoffs.outgoing.length },
          { key: 'active', label: 'Active', count: categorizedHandoffs.active.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterView(tab.key as FilterView)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
              filterView === tab.key
                ? 'bg-cyan-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                filterView === tab.key ? 'bg-cyan-500' : 'bg-gray-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Handoff List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
          </div>
        ) : filteredHandoffs.length === 0 ? (
          <div className="text-center py-12">
            <div className="p-4 bg-gray-800 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <p className="text-gray-400">No {filterView !== 'all' ? filterView : ''} handoffs</p>
            <p className="text-sm text-gray-500 mt-1">
              Transfer conversations to team members when needed
            </p>
          </div>
        ) : (
          filteredHandoffs.map((handoff) => (
            <HandoffCard
              key={handoff.id}
              handoff={handoff}
              currentUserId={currentUserId}
              onAccept={onAcceptHandoff}
              onDecline={onDeclineHandoff}
              onComplete={onCompleteHandoff}
            />
          ))
        )}
      </div>

      {/* Create Handoff Modal */}
      {showCreateModal && (
        <CreateHandoffModal
          appId={appId}
          currentMode={currentMode}
          currentPhase={currentPhase}
          conversationSnapshot={conversationSnapshot}
          teamMembers={teamMembers.filter((m) => m.id !== currentUserId)}
          onClose={() => setShowCreateModal(false)}
          onSubmit={async (input) => {
            await onCreateHandoff(input);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}
