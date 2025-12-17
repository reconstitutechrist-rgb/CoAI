/**
 * AssignOwnerModal - Assign feature ownership
 *
 * Modal for assigning a team member to own a feature.
 */

'use client';

import React, { useState } from 'react';

interface AssignOwnerModalProps {
  appId: string;
  teamId?: string;
  selectedFeature: string | null;
  teamMembers: { id: string; name?: string; email?: string }[];
  phases: { number: number; name: string; features: string[] }[];
  onClose: () => void;
  onSubmit: (input: {
    appId: string;
    teamId?: string;
    featureName: string;
    ownerId: string;
    phaseId?: string;
    responsibilities?: string[];
    notes?: string;
  }) => Promise<void>;
}

export default function AssignOwnerModal({
  appId,
  teamId,
  selectedFeature,
  teamMembers,
  phases,
  onClose,
  onSubmit,
}: AssignOwnerModalProps) {
  const [featureName, setFeatureName] = useState(selectedFeature || '');
  const [ownerId, setOwnerId] = useState('');
  const [selectedPhase, setSelectedPhase] = useState('');
  const [responsibilities, setResponsibilities] = useState<string[]>(['']);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allFeatures = phases.flatMap((p) =>
    p.features.map((f) => ({ name: f, phase: p.name }))
  );

  const handleAddResponsibility = () => {
    setResponsibilities([...responsibilities, '']);
  };

  const handleRemoveResponsibility = (index: number) => {
    setResponsibilities(responsibilities.filter((_, i) => i !== index));
  };

  const handleResponsibilityChange = (index: number, value: string) => {
    const updated = [...responsibilities];
    updated[index] = value;
    setResponsibilities(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!featureName.trim()) {
      setError('Please select or enter a feature name');
      return;
    }
    if (!ownerId) {
      setError('Please select a team member');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        appId,
        teamId,
        featureName: featureName.trim(),
        ownerId,
        phaseId: selectedPhase || undefined,
        responsibilities: responsibilities.filter((r) => r.trim()),
        notes: notes.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign ownership');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 rounded-xl border border-gray-700 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Assign Feature Owner</h3>
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

          {/* Feature Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Feature <span className="text-red-400">*</span>
            </label>
            {selectedFeature ? (
              <div className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white">
                {selectedFeature}
              </div>
            ) : allFeatures.length > 0 ? (
              <select
                value={featureName}
                onChange={(e) => {
                  setFeatureName(e.target.value);
                  const feature = allFeatures.find((f) => f.name === e.target.value);
                  if (feature) setSelectedPhase(feature.phase);
                }}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">Select a feature...</option>
                {phases.map((phase) => (
                  <optgroup key={phase.number} label={`Phase ${phase.number}: ${phase.name}`}>
                    {phase.features.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={featureName}
                onChange={(e) => setFeatureName(e.target.value)}
                placeholder="Enter feature name"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
              />
            )}
          </div>

          {/* Owner Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Assign to <span className="text-red-400">*</span>
            </label>
            {teamMembers.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No team members available</p>
            ) : (
              <div className="space-y-2">
                {teamMembers.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setOwnerId(member.id)}
                    className={`w-full p-3 rounded-lg border text-left transition-colors flex items-center gap-3 ${
                      ownerId === member.id
                        ? 'bg-amber-500/20 border-amber-500/50'
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
                    {ownerId === member.id && (
                      <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Phase */}
          {!selectedFeature && phases.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Phase</label>
              <select
                value={selectedPhase}
                onChange={(e) => setSelectedPhase(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">No specific phase</option>
                {phases.map((phase) => (
                  <option key={phase.number} value={phase.name}>
                    Phase {phase.number}: {phase.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Responsibilities */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-300">Responsibilities</label>
              <button
                type="button"
                onClick={handleAddResponsibility}
                className="text-sm text-amber-400 hover:text-amber-300"
              >
                + Add
              </button>
            </div>
            {responsibilities.map((resp, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={resp}
                  onChange={(e) => handleResponsibilityChange(index, e.target.value)}
                  placeholder={`Responsibility ${index + 1}`}
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 text-sm"
                />
                {responsibilities.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveResponsibility(index)}
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

          {/* Notes */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={2}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 resize-none"
            />
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
            disabled={isSubmitting || !featureName.trim() || !ownerId}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Assigning...
              </>
            ) : (
              'Assign Owner'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
