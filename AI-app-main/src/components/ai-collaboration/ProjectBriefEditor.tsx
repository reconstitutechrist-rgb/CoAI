/**
 * ProjectBriefEditor - Form for creating/editing the Project Brief
 *
 * Allows team owners/admins to define the master vision for the app.
 */

'use client';

import React, { useState, useCallback } from 'react';
import {
  XIcon,
  PlusIcon,
  TrashIcon,
  SaveIcon,
  CheckIcon,
} from '../ui/Icons';
import type {
  ProjectBrief,
  CreateProjectBriefInput,
  UpdateProjectBriefInput,
  DesiredFeature,
  FeaturePriority,
} from '@/types/projectIntegration';
import { getPriorityLabel, getPriorityColor } from '@/types/projectIntegration';

// ============================================================================
// TYPES
// ============================================================================

interface ProjectBriefEditorProps {
  /** Existing brief to edit (null for create mode) */
  existingBrief?: ProjectBrief | null;
  /** Callback when saving */
  onSave: (data: Omit<CreateProjectBriefInput, 'teamId'>) => Promise<boolean>;
  /** Callback when canceling */
  onCancel: () => void;
  /** Whether currently saving */
  isSaving?: boolean;
}

interface FeatureFormData {
  id?: string;
  name: string;
  description: string;
  priority: FeaturePriority;
  notes: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ProjectBriefEditor({
  existingBrief,
  onSave,
  onCancel,
  isSaving = false,
}: ProjectBriefEditorProps) {
  const isEditMode = !!existingBrief;

  // Form state
  const [appName, setAppName] = useState(existingBrief?.appName || '');
  const [appDescription, setAppDescription] = useState(existingBrief?.appDescription || '');
  const [problemStatement, setProblemStatement] = useState(existingBrief?.problemStatement || '');
  const [targetUsers, setTargetUsers] = useState(existingBrief?.targetUsers || '');
  const [successCriteria, setSuccessCriteria] = useState<string[]>(
    existingBrief?.successCriteria || ['']
  );
  const [desiredFeatures, setDesiredFeatures] = useState<FeatureFormData[]>(
    existingBrief?.desiredFeatures?.map((f) => ({
      id: f.id,
      name: f.name,
      description: f.description,
      priority: f.priority,
      notes: f.notes || '',
    })) || [{ name: '', description: '', priority: 'should-have', notes: '' }]
  );
  const [technicalConstraints, setTechnicalConstraints] = useState<string[]>(
    existingBrief?.technicalConstraints || []
  );
  const [designConstraints, setDesignConstraints] = useState<string[]>(
    existingBrief?.designConstraints || []
  );

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!appName.trim()) newErrors.appName = 'App name is required';
    if (!appDescription.trim()) newErrors.appDescription = 'Description is required';
    if (!problemStatement.trim()) newErrors.problemStatement = 'Problem statement is required';
    if (!targetUsers.trim()) newErrors.targetUsers = 'Target users is required';

    const validFeatures = desiredFeatures.filter((f) => f.name.trim());
    if (validFeatures.length === 0) {
      newErrors.features = 'At least one feature is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [appName, appDescription, problemStatement, targetUsers, desiredFeatures]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    const data: Omit<CreateProjectBriefInput, 'teamId'> = {
      appName: appName.trim(),
      appDescription: appDescription.trim(),
      problemStatement: problemStatement.trim(),
      targetUsers: targetUsers.trim(),
      successCriteria: successCriteria.filter((c) => c.trim()),
      desiredFeatures: desiredFeatures
        .filter((f) => f.name.trim())
        .map((f) => ({
          name: f.name.trim(),
          description: f.description.trim(),
          priority: f.priority,
          notes: f.notes.trim() || undefined,
        })),
      technicalConstraints: technicalConstraints.filter((c) => c.trim()),
      designConstraints: designConstraints.filter((c) => c.trim()),
    };

    await onSave(data);
  }, [
    validateForm,
    appName,
    appDescription,
    problemStatement,
    targetUsers,
    successCriteria,
    desiredFeatures,
    technicalConstraints,
    designConstraints,
    onSave,
  ]);

  // Feature handlers
  const addFeature = useCallback(() => {
    setDesiredFeatures((prev) => [
      ...prev,
      { name: '', description: '', priority: 'should-have', notes: '' },
    ]);
  }, []);

  const removeFeature = useCallback((index: number) => {
    setDesiredFeatures((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateFeature = useCallback(
    (index: number, field: keyof FeatureFormData, value: string) => {
      setDesiredFeatures((prev) =>
        prev.map((f, i) => (i === index ? { ...f, [field]: value } : f))
      );
    },
    []
  );

  // Array field handlers
  const addArrayItem = useCallback(
    (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
      setter((prev) => [...prev, '']);
    },
    []
  );

  const removeArrayItem = useCallback(
    (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
      setter((prev) => prev.filter((_, i) => i !== index));
    },
    []
  );

  const updateArrayItem = useCallback(
    (
      setter: React.Dispatch<React.SetStateAction<string[]>>,
      index: number,
      value: string
    ) => {
      setter((prev) => prev.map((item, i) => (i === index ? value : item)));
    },
    []
  );

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-800/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">
              {isEditMode ? 'Edit Project Brief' : 'Create Project Brief'}
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              Define the master vision for your app
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            <XIcon size={20} />
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
        {/* App Name */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            App Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            placeholder="My Awesome App"
            className={`w-full px-4 py-2.5 rounded-lg bg-zinc-800 border ${
              errors.appName ? 'border-red-500' : 'border-zinc-700'
            } text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500`}
          />
          {errors.appName && (
            <p className="mt-1 text-sm text-red-400">{errors.appName}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Description <span className="text-red-400">*</span>
          </label>
          <textarea
            value={appDescription}
            onChange={(e) => setAppDescription(e.target.value)}
            placeholder="A brief description of what the app does..."
            rows={3}
            className={`w-full px-4 py-2.5 rounded-lg bg-zinc-800 border ${
              errors.appDescription ? 'border-red-500' : 'border-zinc-700'
            } text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none`}
          />
          {errors.appDescription && (
            <p className="mt-1 text-sm text-red-400">{errors.appDescription}</p>
          )}
        </div>

        {/* Problem Statement */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Problem Statement <span className="text-red-400">*</span>
          </label>
          <textarea
            value={problemStatement}
            onChange={(e) => setProblemStatement(e.target.value)}
            placeholder="What problem does this app solve?"
            rows={2}
            className={`w-full px-4 py-2.5 rounded-lg bg-zinc-800 border ${
              errors.problemStatement ? 'border-red-500' : 'border-zinc-700'
            } text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none`}
          />
          {errors.problemStatement && (
            <p className="mt-1 text-sm text-red-400">{errors.problemStatement}</p>
          )}
        </div>

        {/* Target Users */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Target Users <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={targetUsers}
            onChange={(e) => setTargetUsers(e.target.value)}
            placeholder="Who will use this app?"
            className={`w-full px-4 py-2.5 rounded-lg bg-zinc-800 border ${
              errors.targetUsers ? 'border-red-500' : 'border-zinc-700'
            } text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500`}
          />
          {errors.targetUsers && (
            <p className="mt-1 text-sm text-red-400">{errors.targetUsers}</p>
          )}
        </div>

        {/* Success Criteria */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Success Criteria
          </label>
          <p className="text-xs text-zinc-500 mb-2">
            How do you know the app is complete/successful?
          </p>
          <div className="space-y-2">
            {successCriteria.map((criterion, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={criterion}
                  onChange={(e) =>
                    updateArrayItem(setSuccessCriteria, index, e.target.value)
                  }
                  placeholder="e.g., Users can sign up and log in"
                  className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                {successCriteria.length > 1 && (
                  <button
                    onClick={() => removeArrayItem(setSuccessCriteria, index)}
                    className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                  >
                    <TrashIcon size={16} />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => addArrayItem(setSuccessCriteria)}
              className="flex items-center gap-2 text-sm text-teal-400 hover:text-teal-300"
            >
              <PlusIcon size={14} />
              Add criterion
            </button>
          </div>
        </div>

        {/* Desired Features */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Desired Features <span className="text-red-400">*</span>
          </label>
          {errors.features && (
            <p className="mb-2 text-sm text-red-400">{errors.features}</p>
          )}
          <div className="space-y-4">
            {desiredFeatures.map((feature, index) => (
              <div
                key={index}
                className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-3">
                    <input
                      type="text"
                      value={feature.name}
                      onChange={(e) => updateFeature(index, 'name', e.target.value)}
                      placeholder="Feature name"
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-600 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <textarea
                      value={feature.description}
                      onChange={(e) =>
                        updateFeature(index, 'description', e.target.value)
                      }
                      placeholder="What does this feature do?"
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-600 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                    />
                    <div className="flex gap-3">
                      <select
                        value={feature.priority}
                        onChange={(e) =>
                          updateFeature(
                            index,
                            'priority',
                            e.target.value as FeaturePriority
                          )
                        }
                        className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-600 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="must-have">Must Have</option>
                        <option value="should-have">Should Have</option>
                        <option value="nice-to-have">Nice to Have</option>
                      </select>
                      <input
                        type="text"
                        value={feature.notes}
                        onChange={(e) => updateFeature(index, 'notes', e.target.value)}
                        placeholder="Additional notes (optional)"
                        className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-600 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                  {desiredFeatures.length > 1 && (
                    <button
                      onClick={() => removeFeature(index)}
                      className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                    >
                      <TrashIcon size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button
              onClick={addFeature}
              className="flex items-center gap-2 text-sm text-teal-400 hover:text-teal-300"
            >
              <PlusIcon size={14} />
              Add feature
            </button>
          </div>
        </div>

        {/* Technical Constraints */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Technical Constraints{' '}
            <span className="text-zinc-500 font-normal">(optional)</span>
          </label>
          <p className="text-xs text-zinc-500 mb-2">
            e.g., "Must work offline", "No backend required"
          </p>
          <div className="space-y-2">
            {technicalConstraints.map((constraint, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={constraint}
                  onChange={(e) =>
                    updateArrayItem(setTechnicalConstraints, index, e.target.value)
                  }
                  placeholder="Technical constraint"
                  className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  onClick={() => removeArrayItem(setTechnicalConstraints, index)}
                  className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                >
                  <TrashIcon size={16} />
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem(setTechnicalConstraints)}
              className="flex items-center gap-2 text-sm text-teal-400 hover:text-teal-300"
            >
              <PlusIcon size={14} />
              Add constraint
            </button>
          </div>
        </div>

        {/* Design Constraints */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Design Constraints{' '}
            <span className="text-zinc-500 font-normal">(optional)</span>
          </label>
          <p className="text-xs text-zinc-500 mb-2">
            e.g., "Must match brand colors", "Mobile-first design"
          </p>
          <div className="space-y-2">
            {designConstraints.map((constraint, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={constraint}
                  onChange={(e) =>
                    updateArrayItem(setDesignConstraints, index, e.target.value)
                  }
                  placeholder="Design constraint"
                  className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  onClick={() => removeArrayItem(setDesignConstraints, index)}
                  className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                >
                  <TrashIcon size={16} />
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem(setDesignConstraints)}
              className="flex items-center gap-2 text-sm text-teal-400 hover:text-teal-300"
            >
              <PlusIcon size={14} />
              Add constraint
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-800/30 flex justify-end gap-3">
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <span className="animate-spin">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </span>
              Saving...
            </>
          ) : (
            <>
              <CheckIcon size={16} />
              {isEditMode ? 'Save Changes' : 'Create Brief'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default ProjectBriefEditor;
