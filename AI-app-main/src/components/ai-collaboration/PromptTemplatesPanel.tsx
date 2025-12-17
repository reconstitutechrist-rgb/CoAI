/**
 * PromptTemplatesPanel - Shared Prompt Templates Manager
 *
 * Browse, create, and use shared prompt templates across the team.
 */

'use client';

import React, { useState, useMemo } from 'react';
import { SharedPromptTemplate, TemplateCategory, TemplateVariable } from '@/types/aiCollaboration';

interface PromptTemplatesPanelProps {
  templates: SharedPromptTemplate[];
  currentUserId: string;
  teamId: string;
  onCreateTemplate: (input: {
    name: string;
    description?: string;
    templateText: string;
    category: TemplateCategory;
    variables?: TemplateVariable[];
    isPublic?: boolean;
  }) => Promise<void>;
  onUpdateTemplate: (templateId: string, updates: Partial<SharedPromptTemplate>) => Promise<void>;
  onDeleteTemplate: (templateId: string) => Promise<void>;
  onUseTemplate: (templateId: string, variables?: Record<string, string>) => Promise<string | null>;
  onInsertPrompt?: (prompt: string) => void;
  isLoading?: boolean;
}

type FilterCategory = 'all' | TemplateCategory;

const CATEGORIES: { key: TemplateCategory; label: string; color: string }[] = [
  { key: 'general', label: 'General', color: 'gray' },
  { key: 'feature', label: 'Feature', color: 'blue' },
  { key: 'bugfix', label: 'Bug Fix', color: 'red' },
  { key: 'design', label: 'Design', color: 'purple' },
  { key: 'refactor', label: 'Refactor', color: 'orange' },
  { key: 'documentation', label: 'Documentation', color: 'green' },
];

export default function PromptTemplatesPanel({
  templates,
  currentUserId,
  teamId,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onUseTemplate,
  onInsertPrompt,
  isLoading = false,
}: PromptTemplatesPanelProps) {
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SharedPromptTemplate | null>(null);
  const [usingTemplate, setUsingTemplate] = useState<SharedPromptTemplate | null>(null);

  const filteredTemplates = useMemo(() => {
    let result = templates;

    if (filterCategory !== 'all') {
      result = result.filter((t) => t.category === filterCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.templateText.toLowerCase().includes(query)
      );
    }

    return result;
  }, [templates, filterCategory, searchQuery]);

  const handleUseTemplate = async (template: SharedPromptTemplate) => {
    if (template.variables && template.variables.length > 0) {
      setUsingTemplate(template);
    } else {
      const result = await onUseTemplate(template.id);
      if (result && onInsertPrompt) {
        onInsertPrompt(result);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-pink-500/20 rounded-lg">
            <svg className="w-5 h-5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Prompt Templates</h3>
            <p className="text-sm text-gray-400">{templates.length} templates</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Template
        </button>
      </div>

      {/* Search & Filter */}
      <div className="p-4 border-b border-gray-700 space-y-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search templates..."
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              filterCategory === 'all'
                ? 'bg-pink-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setFilterCategory(cat.key)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filterCategory === cat.key
                  ? `bg-${cat.color}-600 text-white`
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Templates List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <div className="p-4 bg-gray-800 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
            <p className="text-gray-400">No templates found</p>
            <p className="text-sm text-gray-500 mt-1">Create templates to speed up AI prompts</p>
          </div>
        ) : (
          filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              currentUserId={currentUserId}
              onUse={() => handleUseTemplate(template)}
              onEdit={() => setEditingTemplate(template)}
              onDelete={() => onDeleteTemplate(template.id)}
            />
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingTemplate) && (
        <TemplateEditorModal
          teamId={teamId}
          existingTemplate={editingTemplate}
          onClose={() => {
            setShowCreateModal(false);
            setEditingTemplate(null);
          }}
          onSubmit={async (input) => {
            if (editingTemplate) {
              await onUpdateTemplate(editingTemplate.id, input);
            } else {
              await onCreateTemplate(input);
            }
            setShowCreateModal(false);
            setEditingTemplate(null);
          }}
        />
      )}

      {/* Use Template Modal (with variables) */}
      {usingTemplate && (
        <UseTemplateModal
          template={usingTemplate}
          onClose={() => setUsingTemplate(null)}
          onUse={async (variables) => {
            const result = await onUseTemplate(usingTemplate.id, variables);
            if (result && onInsertPrompt) {
              onInsertPrompt(result);
            }
            setUsingTemplate(null);
          }}
        />
      )}
    </div>
  );
}

interface TemplateCardProps {
  template: SharedPromptTemplate;
  currentUserId: string;
  onUse: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function TemplateCard({ template, currentUserId, onUse, onEdit, onDelete }: TemplateCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const canEdit = template.createdBy === currentUserId;

  const categoryConfig = CATEGORIES.find((c) => c.key === template.category) || CATEGORIES[0];

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <div className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 text-xs rounded-full bg-${categoryConfig.color}-500/20 text-${categoryConfig.color}-400`}>
                {categoryConfig.label}
              </span>
              {template.isPublic && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-gray-600 text-gray-300">
                  Public
                </span>
              )}
              {template.variables && template.variables.length > 0 && (
                <span className="text-xs text-gray-500">
                  {template.variables.length} variable{template.variables.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <h4 className="text-white font-medium">{template.name}</h4>
            {template.description && (
              <p className="text-sm text-gray-400 mt-1 line-clamp-2">{template.description}</p>
            )}
          </div>
          <button
            onClick={onUse}
            className="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Use
          </button>
        </div>

        {/* Preview toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 text-xs text-gray-500 hover:text-gray-400 flex items-center gap-1"
        >
          <svg
            className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          {isExpanded ? 'Hide' : 'Show'} template
        </button>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-700 p-3 space-y-3">
          <pre className="text-sm text-gray-300 whitespace-pre-wrap bg-gray-900 p-3 rounded-lg max-h-48 overflow-y-auto font-mono">
            {template.templateText}
          </pre>

          {template.variables && template.variables.length > 0 && (
            <div className="space-y-1">
              <h5 className="text-xs font-medium text-gray-400 uppercase">Variables</h5>
              <div className="flex flex-wrap gap-2">
                {template.variables.map((v, i) => (
                  <span
                    key={i}
                    className={`px-2 py-1 text-xs rounded ${
                      v.required ? 'bg-pink-500/20 text-pink-400' : 'bg-gray-700 text-gray-400'
                    }`}
                    title={v.description}
                  >
                    {`{{${v.name}}}`}
                    {v.required && '*'}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-gray-700">
            <span className="text-xs text-gray-500">
              Used {template.useCount || 0} times
            </span>
            {canEdit && (
              <div className="flex gap-2">
                <button
                  onClick={onEdit}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm('Delete this template?')) onDelete();
                  }}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface TemplateEditorModalProps {
  teamId: string;
  existingTemplate: SharedPromptTemplate | null;
  onClose: () => void;
  onSubmit: (input: {
    name: string;
    description?: string;
    templateText: string;
    category: TemplateCategory;
    variables?: TemplateVariable[];
    isPublic?: boolean;
  }) => Promise<void>;
}

function TemplateEditorModal({
  existingTemplate,
  onClose,
  onSubmit,
}: TemplateEditorModalProps) {
  const [name, setName] = useState(existingTemplate?.name || '');
  const [description, setDescription] = useState(existingTemplate?.description || '');
  const [templateText, setTemplateText] = useState(existingTemplate?.templateText || '');
  const [category, setCategory] = useState<TemplateCategory>(existingTemplate?.category || 'general');
  const [variables, setVariables] = useState<TemplateVariable[]>(existingTemplate?.variables || []);
  const [isPublic, setIsPublic] = useState(existingTemplate?.isPublic || false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-detect variables from template text
  const detectedVariables = useMemo(() => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = templateText.matchAll(regex);
    return [...new Set([...matches].map((m) => m[1]))];
  }, [templateText]);

  const handleAddVariable = (name: string) => {
    if (!variables.some((v) => v.name === name)) {
      setVariables([...variables, { name, description: '', required: true }]);
    }
  };

  const handleUpdateVariable = (index: number, updates: Partial<TemplateVariable>) => {
    const updated = [...variables];
    updated[index] = { ...updated[index], ...updates };
    setVariables(updated);
  };

  const handleRemoveVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!templateText.trim()) {
      setError('Template text is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        templateText: templateText.trim(),
        category,
        variables: variables.length > 0 ? variables : undefined,
        isPublic,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">
            {existingTemplate ? 'Edit Template' : 'Create Template'}
          </h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Feature Request"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TemplateCategory)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-pink-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.key} value={cat.key}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of when to use this template"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Template Text *</label>
            <textarea
              value={templateText}
              onChange={(e) => setTemplateText(e.target.value)}
              placeholder="Enter your prompt template. Use {{variableName}} for variables."
              rows={6}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 resize-none font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              Use {"{{variableName}}"} syntax for dynamic values
            </p>
          </div>

          {/* Detected Variables */}
          {detectedVariables.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Detected Variables</label>
              <div className="flex flex-wrap gap-2">
                {detectedVariables.map((v) => {
                  const exists = variables.some((ev) => ev.name === v);
                  return (
                    <button
                      key={v}
                      onClick={() => !exists && handleAddVariable(v)}
                      disabled={exists}
                      className={`px-2 py-1 text-xs rounded ${
                        exists
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-700 text-gray-400 hover:bg-pink-500/20 hover:text-pink-400'
                      }`}
                    >
                      {`{{${v}}}`} {exists ? '✓' : '+ Add'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Variable Definitions */}
          {variables.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Variable Definitions</label>
              <div className="space-y-2">
                {variables.map((v, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-gray-800 rounded-lg">
                    <code className="text-pink-400 text-sm">{`{{${v.name}}}`}</code>
                    <input
                      type="text"
                      value={v.description}
                      onChange={(e) => handleUpdateVariable(i, { description: e.target.value })}
                      placeholder="Description"
                      className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm placeholder-gray-500"
                    />
                    <label className="flex items-center gap-1 text-xs text-gray-400">
                      <input
                        type="checkbox"
                        checked={v.required}
                        onChange={(e) => handleUpdateVariable(i, { required: e.target.checked })}
                      />
                      Required
                    </label>
                    <button
                      onClick={() => handleRemoveVariable(i)}
                      className="p-1 text-gray-500 hover:text-red-400"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Public toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="isPublic" className="text-sm text-gray-400">
              Make this template public (visible to all teams)
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !name.trim() || !templateText.trim()}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white font-medium rounded-lg disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : existingTemplate ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface UseTemplateModalProps {
  template: SharedPromptTemplate;
  onClose: () => void;
  onUse: (variables: Record<string, string>) => Promise<void>;
}

function UseTemplateModal({ template, onClose, onUse }: UseTemplateModalProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    template.variables?.forEach((v) => {
      initial[v.name] = v.defaultValue || '';
    });
    return initial;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preview, setPreview] = useState('');

  // Generate preview
  React.useEffect(() => {
    let text = template.templateText;
    Object.entries(values).forEach(([key, value]) => {
      text = text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || `{{${key}}}`);
    });
    setPreview(text);
  }, [template.templateText, values]);

  const handleSubmit = async () => {
    // Validate required fields
    const missing = template.variables?.filter((v) => v.required && !values[v.name]?.trim());
    if (missing && missing.length > 0) {
      alert(`Please fill in required fields: ${missing.map((v) => v.name).join(', ')}`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onUse(values);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 rounded-xl border border-gray-700 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Use Template: {template.name}</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Variable Inputs */}
          {template.variables?.map((v) => (
            <div key={v.name} className="space-y-1">
              <label className="block text-sm font-medium text-gray-300">
                {v.name} {v.required && <span className="text-red-400">*</span>}
              </label>
              {v.description && (
                <p className="text-xs text-gray-500">{v.description}</p>
              )}
              <input
                type="text"
                value={values[v.name] || ''}
                onChange={(e) => setValues({ ...values, [v.name]: e.target.value })}
                placeholder={v.defaultValue || `Enter ${v.name}`}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
              />
            </div>
          ))}

          {/* Preview */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Preview</label>
            <pre className="text-sm text-gray-300 whitespace-pre-wrap bg-gray-800 p-3 rounded-lg max-h-48 overflow-y-auto font-mono">
              {preview}
            </pre>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white font-medium rounded-lg disabled:opacity-50"
          >
            {isSubmitting ? 'Inserting...' : 'Insert Prompt'}
          </button>
        </div>
      </div>
    </div>
  );
}
