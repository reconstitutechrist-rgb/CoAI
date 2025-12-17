'use client';

import React, { useState, useCallback } from 'react';
import { XIcon, LoaderIcon } from '../ui/Icons';
import type {
  CreateTaskInput,
  TaskType,
  TaskPriority,
  UserInfo,
} from '@/types/collaboration';

export interface TaskCreateModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback when task is created */
  onCreate: (input: Omit<CreateTaskInput, 'teamId' | 'appId'>) => Promise<boolean>;
  /** Team members for assignment */
  members?: UserInfo[];
  /** Available labels */
  availableLabels?: string[];
  /** Pre-fill values */
  defaultValues?: Partial<CreateTaskInput>;
}

/**
 * TaskCreateModal - Modal for creating a new task
 */
export function TaskCreateModal({
  isOpen,
  onClose,
  onCreate,
  members = [],
  availableLabels = [],
  defaultValues,
}: TaskCreateModalProps) {
  const [title, setTitle] = useState(defaultValues?.title || '');
  const [description, setDescription] = useState(defaultValues?.description || '');
  const [taskType, setTaskType] = useState<TaskType>(defaultValues?.taskType || 'feature');
  const [priority, setPriority] = useState<TaskPriority>(defaultValues?.priority || 'medium');
  const [assignedTo, setAssignedTo] = useState<string | undefined>(defaultValues?.assignedTo);
  const [dueDate, setDueDate] = useState(defaultValues?.dueDate || '');
  const [labels, setLabels] = useState<string[]>(defaultValues?.labels || []);
  const [estimatedHours, setEstimatedHours] = useState<number | undefined>(defaultValues?.estimatedHours);
  const [linkedPhaseId, setLinkedPhaseId] = useState(defaultValues?.linkedPhaseId || '');
  const [linkedFeatureName, setLinkedFeatureName] = useState(defaultValues?.linkedFeatureName || '');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!title.trim()) {
        setError('Title is required');
        return;
      }

      setIsCreating(true);
      setError(null);

      try {
        const success = await onCreate({
          title: title.trim(),
          description: description.trim() || undefined,
          taskType,
          priority,
          assignedTo: assignedTo || undefined,
          dueDate: dueDate || undefined,
          labels: labels.length > 0 ? labels : undefined,
          estimatedHours: estimatedHours || undefined,
          linkedPhaseId: linkedPhaseId || undefined,
          linkedFeatureName: linkedFeatureName || undefined,
        });

        if (success) {
          // Reset form and close
          setTitle('');
          setDescription('');
          setTaskType('feature');
          setPriority('medium');
          setAssignedTo(undefined);
          setDueDate('');
          setLabels([]);
          setEstimatedHours(undefined);
          setLinkedPhaseId('');
          setLinkedFeatureName('');
          onClose();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create task');
      } finally {
        setIsCreating(false);
      }
    },
    [title, description, taskType, priority, assignedTo, dueDate, labels, estimatedHours, linkedPhaseId, linkedFeatureName, onCreate, onClose]
  );

  const handleAddLabel = useCallback(() => {
    if (newLabel.trim() && !labels.includes(newLabel.trim())) {
      setLabels((prev) => [...prev, newLabel.trim()]);
      setNewLabel('');
    }
  }, [newLabel, labels]);

  const handleRemoveLabel = useCallback((label: string) => {
    setLabels((prev) => prev.filter((l) => l !== label));
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700">
          <h2 className="text-lg font-semibold text-zinc-200">Create Task</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-4">
            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add more details..."
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Type and Priority row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Type</label>
                <select
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value as TaskType)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="feature">Feature</option>
                  <option value="bug">Bug</option>
                  <option value="research">Research</option>
                  <option value="documentation">Documentation</option>
                  <option value="review">Review</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* Assignee and Due Date row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Assignee</label>
                <select
                  value={assignedTo || ''}
                  onChange={(e) => setAssignedTo(e.target.value || undefined)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Unassigned</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.fullName || member.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Estimated Hours */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                Estimated Hours
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={estimatedHours || ''}
                onChange={(e) => setEstimatedHours(e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="0"
                className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Labels */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Labels</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {labels.map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-700 text-zinc-300 text-xs"
                  >
                    {label}
                    <button
                      type="button"
                      onClick={() => handleRemoveLabel(label)}
                      className="text-zinc-500 hover:text-zinc-300"
                    >
                      <XIcon size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddLabel();
                    }
                  }}
                  placeholder="Add label"
                  className="flex-1 px-3 py-1.5 text-sm rounded bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddLabel}
                  disabled={!newLabel.trim()}
                  className="px-3 py-1.5 text-sm rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add
                </button>
              </div>
              {availableLabels.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {availableLabels
                    .filter((l) => !labels.includes(l))
                    .slice(0, 5)
                    .map((label) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setLabels((prev) => [...prev, label])}
                        className="px-2 py-0.5 rounded text-xs bg-zinc-800 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 transition-colors"
                      >
                        + {label}
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Linked Phase/Feature */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                  Linked Phase
                </label>
                <input
                  type="text"
                  value={linkedPhaseId}
                  onChange={(e) => setLinkedPhaseId(e.target.value)}
                  placeholder="Phase ID"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                  Linked Feature
                </label>
                <input
                  type="text"
                  value={linkedFeatureName}
                  onChange={(e) => setLinkedFeatureName(e.target.value)}
                  placeholder="Feature name"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-700 bg-zinc-800/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !title.trim()}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isCreating && <LoaderIcon size={14} className="animate-spin" />}
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TaskCreateModal;
