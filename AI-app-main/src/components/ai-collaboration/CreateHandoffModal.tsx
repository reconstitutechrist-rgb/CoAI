/**
 * CreateHandoffModal - Create a new conversation handoff
 *
 * Allows users to transfer their AI conversation to another team member.
 */

'use client';

import React, { useState } from 'react';
import { BuilderMode } from '@/types/aiCollaboration';

interface CreateHandoffModalProps {
  appId: string;
  currentMode: BuilderMode;
  currentPhase?: string;
  conversationSnapshot: unknown;
  teamMembers: { id: string; name?: string; email?: string }[];
  onClose: () => void;
  onSubmit: (input: {
    appId: string;
    toUserId: string;
    conversationSnapshot: unknown;
    currentMode: BuilderMode;
    currentPhase?: string;
    handoffNotes: string;
    urgency?: 'low' | 'normal' | 'high' | 'critical';
    suggestedActions?: string[];
  }) => Promise<void>;
}

export default function CreateHandoffModal({
  appId,
  currentMode,
  currentPhase,
  conversationSnapshot,
  teamMembers,
  onClose,
  onSubmit,
}: CreateHandoffModalProps) {
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [handoffNotes, setHandoffNotes] = useState('');
  const [urgency, setUrgency] = useState<'low' | 'normal' | 'high' | 'critical'>('normal');
  const [suggestedActions, setSuggestedActions] = useState<string[]>(['']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddAction = () => {
    setSuggestedActions([...suggestedActions, '']);
  };

  const handleRemoveAction = (index: number) => {
    setSuggestedActions(suggestedActions.filter((_, i) => i !== index));
  };

  const handleActionChange = (index: number, value: string) => {
    const updated = [...suggestedActions];
    updated[index] = value;
    setSuggestedActions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedMember) {
      setError('Please select a team member');
      return;
    }
    if (!handoffNotes.trim()) {
      setError('Please provide handoff notes');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        appId,
        toUserId: selectedMember,
        conversationSnapshot,
        currentMode,
        currentPhase,
        handoffNotes: handoffNotes.trim(),
        urgency,
        suggestedActions: suggestedActions.filter((a) => a.trim()),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create handoff');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modeConfig = {
    plan: { color: 'bg-green-500/20 text-green-400', label: 'PLAN Mode' },
    act: { color: 'bg-blue-500/20 text-blue-400', label: 'ACT Mode' },
    layout: { color: 'bg-purple-500/20 text-purple-400', label: 'Layout Mode' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 rounded-xl border border-gray-700 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Hand Off Conversation</h3>
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

        {/* Current State Info */}
        <div className="p-4 bg-gray-800/50 border-b border-gray-700">
          <div className="flex items-center gap-3 text-sm">
            <span className={`px-2 py-1 rounded-full ${modeConfig[currentMode].color}`}>
              {modeConfig[currentMode].label}
            </span>
            {currentPhase && (
              <span className="text-gray-400">
                Phase: <span className="text-white">{currentPhase}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            The current conversation state will be transferred to the selected team member.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Team Member Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Hand off to <span className="text-red-400">*</span>
            </label>
            {teamMembers.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No other team members available</p>
            ) : (
              <div className="space-y-2">
                {teamMembers.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setSelectedMember(member.id)}
                    className={`w-full p-3 rounded-lg border text-left transition-colors flex items-center gap-3 ${
                      selectedMember === member.id
                        ? 'bg-cyan-500/20 border-cyan-500/50'
                        : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-white font-medium text-sm">
                      {(member.name || member.email || 'U')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">
                        {member.name || 'Team Member'}
                      </p>
                      {member.email && (
                        <p className="text-xs text-gray-400 truncate">{member.email}</p>
                      )}
                    </div>
                    {selectedMember === member.id && (
                      <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Urgency */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Urgency</label>
            <div className="flex gap-2">
              {(['low', 'normal', 'high', 'critical'] as const).map((level) => {
                const config = {
                  low: 'bg-gray-600 hover:bg-gray-500',
                  normal: 'bg-blue-600 hover:bg-blue-500',
                  high: 'bg-orange-600 hover:bg-orange-500',
                  critical: 'bg-red-600 hover:bg-red-500',
                };
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setUrgency(level)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      urgency === level
                        ? `${config[level]} text-white`
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Handoff Notes */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Handoff Notes <span className="text-red-400">*</span>
            </label>
            <textarea
              value={handoffNotes}
              onChange={(e) => setHandoffNotes(e.target.value)}
              placeholder="Explain what you were working on, where you left off, and any context needed..."
              rows={4}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          {/* Suggested Actions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-300">Suggested Next Steps</label>
              <button
                type="button"
                onClick={handleAddAction}
                className="text-sm text-cyan-400 hover:text-cyan-300"
              >
                + Add Action
              </button>
            </div>
            {suggestedActions.map((action, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={action}
                  onChange={(e) => handleActionChange(index, e.target.value)}
                  placeholder="e.g., Review the authentication flow"
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 text-sm"
                />
                {suggestedActions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveAction(index)}
                    className="p-2 text-gray-500 hover:text-red-400"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
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
            disabled={isSubmitting || !selectedMember || !handoffNotes.trim()}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Sending...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Send Handoff
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
