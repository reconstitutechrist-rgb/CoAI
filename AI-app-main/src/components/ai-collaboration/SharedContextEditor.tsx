/**
 * SharedContextEditor - Create/edit shared AI context
 *
 * Modal for adding or editing shared context entries.
 */

'use client';

import React, { useState } from 'react';
import { SharedAIContext, ContextScope, ContextPriority } from '@/types/aiCollaboration';

interface SharedContextEditorProps {
  teamId: string;
  appId?: string;
  existingContext: SharedAIContext | null;
  onClose: () => void;
  onSubmit: (input: {
    contextKey: string;
    contextValue: string;
    description?: string;
    scope: ContextScope;
    priority?: ContextPriority;
    appId?: string;
    expiresAt?: string;
    isActive?: boolean;
  }) => Promise<void>;
}

const CONTEXT_TEMPLATES = [
  {
    key: 'coding_style',
    label: 'Coding Style',
    template: `- Use TypeScript with strict mode
- Prefer functional components over class components
- Use named exports instead of default exports
- Follow the existing naming conventions in the codebase`,
  },
  {
    key: 'architecture',
    label: 'Architecture',
    template: `- Follow clean architecture principles
- Keep business logic in services, not components
- Use dependency injection for testability
- Separate concerns: UI, state, API calls`,
  },
  {
    key: 'testing',
    label: 'Testing Guidelines',
    template: `- Write unit tests for all utility functions
- Use React Testing Library for component tests
- Mock external dependencies
- Aim for 80% coverage on critical paths`,
  },
  {
    key: 'documentation',
    label: 'Documentation',
    template: `- Add JSDoc comments to public functions
- Document complex business logic inline
- Keep README files up to date
- Include usage examples in comments`,
  },
];

export default function SharedContextEditor({
  teamId,
  appId,
  existingContext,
  onClose,
  onSubmit,
}: SharedContextEditorProps) {
  const [contextKey, setContextKey] = useState(existingContext?.contextKey || '');
  const [contextValue, setContextValue] = useState(existingContext?.contextValue || '');
  const [description, setDescription] = useState(existingContext?.description || '');
  const [scope, setScope] = useState<ContextScope>(existingContext?.scope || 'team');
  const [priority, setPriority] = useState<ContextPriority>(existingContext?.priority || 'normal');
  const [isActive, setIsActive] = useState(existingContext?.isActive ?? true);
  const [expiresInDays, setExpiresInDays] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTemplateSelect = (template: typeof CONTEXT_TEMPLATES[0]) => {
    setContextKey(template.key);
    setContextValue(template.template);
    setDescription(`${template.label} guidelines for the team`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!contextKey.trim()) {
      setError('Context key is required');
      return;
    }
    if (!contextValue.trim()) {
      setError('Context value is required');
      return;
    }
    if (!/^[a-z_][a-z0-9_]*$/.test(contextKey.trim())) {
      setError('Context key must be lowercase with underscores (e.g., coding_style)');
      return;
    }

    setIsSubmitting(true);
    try {
      let expiresAt: string | undefined;
      if (expiresInDays) {
        const date = new Date();
        date.setDate(date.getDate() + expiresInDays);
        expiresAt = date.toISOString();
      }

      await onSubmit({
        contextKey: contextKey.trim(),
        contextValue: contextValue.trim(),
        description: description.trim() || undefined,
        scope,
        priority,
        appId: scope === 'app' || scope === 'phase' ? appId : undefined,
        expiresAt,
        isActive,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save context');
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
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">
              {existingContext ? 'Edit Context' : 'Add Shared Context'}
            </h3>
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

          {/* Templates */}
          {!existingContext && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Quick Templates</label>
              <div className="flex flex-wrap gap-2">
                {CONTEXT_TEMPLATES.map((template) => (
                  <button
                    key={template.key}
                    type="button"
                    onClick={() => handleTemplateSelect(template)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      contextKey === template.key
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Context Key */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Context Key <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={contextKey}
              onChange={(e) => setContextKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
              placeholder="e.g., coding_style, architecture_rules"
              disabled={!!existingContext}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500">Lowercase with underscores. Used to reference this context.</p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this context covers"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Context Value */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Context Value <span className="text-red-400">*</span>
            </label>
            <textarea
              value={contextValue}
              onChange={(e) => setContextValue(e.target.value)}
              placeholder="The context information that AI should know..."
              rows={8}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              This text will be included in AI conversations. Be specific and clear.
            </p>
          </div>

          {/* Scope & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Scope</label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as ContextScope)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="team">Team-wide</option>
                <option value="app" disabled={!appId}>App-specific</option>
                <option value="phase" disabled={!appId}>Phase-specific</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ContextPriority)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="critical">Critical (always first)</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Expiration & Active */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Expires In (Days)</label>
              <input
                type="number"
                min={1}
                max={365}
                value={expiresInDays || ''}
                onChange={(e) => setExpiresInDays(e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Never"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Status</label>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`w-full px-3 py-2 rounded-lg border transition-colors flex items-center justify-between ${
                  isActive
                    ? 'bg-green-500/20 border-green-500/50 text-green-400'
                    : 'bg-gray-800 border-gray-700 text-gray-400'
                }`}
              >
                <span>{isActive ? 'Active' : 'Inactive'}</span>
                <div className={`w-10 h-5 rounded-full relative transition-colors ${
                  isActive ? 'bg-green-500' : 'bg-gray-600'
                }`}>
                  <div className={`absolute w-4 h-4 bg-white rounded-full top-0.5 transition-transform ${
                    isActive ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </div>
              </button>
            </div>
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
            disabled={isSubmitting || !contextKey.trim() || !contextValue.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Saving...
              </>
            ) : (
              existingContext ? 'Update Context' : 'Add Context'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
