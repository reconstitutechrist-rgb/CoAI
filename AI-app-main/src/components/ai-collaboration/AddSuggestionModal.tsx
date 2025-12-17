/**
 * AddSuggestionModal - Add a new phase suggestion
 *
 * Modal for suggesting a new build phase.
 */

'use client';

import React, { useState } from 'react';
import { PhaseSuggestion } from '@/types/aiCollaboration';

interface AddSuggestionModalProps {
  existingSuggestions: PhaseSuggestion[];
  onClose: () => void;
  onSubmit: (input: {
    phaseName: string;
    phaseDescription: string;
    features: string[];
    dependencies?: number[];
    estimatedComplexity?: 'low' | 'medium' | 'high';
    insertAtPosition?: number;
  }) => Promise<void>;
}

export default function AddSuggestionModal({
  existingSuggestions,
  onClose,
  onSubmit,
}: AddSuggestionModalProps) {
  const [phaseName, setPhaseName] = useState('');
  const [phaseDescription, setPhaseDescription] = useState('');
  const [features, setFeatures] = useState<string[]>(['']);
  const [complexity, setComplexity] = useState<'low' | 'medium' | 'high'>('medium');
  const [dependencies, setDependencies] = useState<number[]>([]);
  const [insertAtPosition, setInsertAtPosition] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approvedSuggestions = existingSuggestions.filter((s) => s.status === 'approved');

  const handleAddFeature = () => {
    setFeatures([...features, '']);
  };

  const handleRemoveFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const handleFeatureChange = (index: number, value: string) => {
    const updated = [...features];
    updated[index] = value;
    setFeatures(updated);
  };

  const handleDependencyToggle = (position: number) => {
    if (dependencies.includes(position)) {
      setDependencies(dependencies.filter((d) => d !== position));
    } else {
      setDependencies([...dependencies, position]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!phaseName.trim()) {
      setError('Phase name is required');
      return;
    }
    if (!phaseDescription.trim()) {
      setError('Phase description is required');
      return;
    }
    if (features.filter((f) => f.trim()).length === 0) {
      setError('At least one feature is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        phaseName: phaseName.trim(),
        phaseDescription: phaseDescription.trim(),
        features: features.filter((f) => f.trim()),
        dependencies: dependencies.length > 0 ? dependencies : undefined,
        estimatedComplexity: complexity,
        insertAtPosition: insertAtPosition ?? undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add suggestion');
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
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Suggest a Build Phase</h3>
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

          {/* Phase Name */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Phase Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={phaseName}
              onChange={(e) => setPhaseName(e.target.value)}
              placeholder="e.g., User Authentication Setup"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Phase Description */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={phaseDescription}
              onChange={(e) => setPhaseDescription(e.target.value)}
              placeholder="Describe what this phase will accomplish..."
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Features */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-300">
                Features <span className="text-red-400">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddFeature}
                className="text-sm text-indigo-400 hover:text-indigo-300"
              >
                + Add Feature
              </button>
            </div>
            {features.map((feature, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={feature}
                  onChange={(e) => handleFeatureChange(index, e.target.value)}
                  placeholder={`Feature ${index + 1}`}
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm"
                />
                {features.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveFeature(index)}
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

          {/* Complexity */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Estimated Complexity</label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as const).map((level) => {
                const config = {
                  low: { color: 'bg-green-600 hover:bg-green-500', label: 'Low' },
                  medium: { color: 'bg-yellow-600 hover:bg-yellow-500', label: 'Medium' },
                  high: { color: 'bg-red-600 hover:bg-red-500', label: 'High' },
                };
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setComplexity(level)}
                    className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                      complexity === level
                        ? `${config[level].color} text-white`
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    {config[level].label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Insert Position */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Insert Position</label>
            <select
              value={insertAtPosition ?? ''}
              onChange={(e) => setInsertAtPosition(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">End of list</option>
              {Array.from({ length: approvedSuggestions.length + 1 }, (_, i) => (
                <option key={i} value={i}>Position #{i + 1}</option>
              ))}
            </select>
          </div>

          {/* Dependencies */}
          {approvedSuggestions.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Dependencies (optional)</label>
              <p className="text-xs text-gray-500">Select phases this phase depends on:</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {approvedSuggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => handleDependencyToggle(index)}
                    className={`w-full p-2 rounded-lg border text-left text-sm transition-colors ${
                      dependencies.includes(index)
                        ? 'bg-indigo-500/20 border-indigo-500/50 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    <span className="text-gray-500">#{index + 1}</span> {suggestion.phaseName}
                  </button>
                ))}
              </div>
            </div>
          )}
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
            disabled={isSubmitting || !phaseName.trim() || !phaseDescription.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Submitting...
              </>
            ) : (
              'Submit Suggestion'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
