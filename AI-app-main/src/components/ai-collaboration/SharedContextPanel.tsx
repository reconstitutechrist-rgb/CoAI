/**
 * SharedContextPanel - Manage team-wide AI context
 *
 * Allows teams to maintain persistent context that AI will remember
 * across all conversations and code generation.
 */

'use client';

import React, { useState } from 'react';
import { SharedAIContext, ContextScope, ContextPriority } from '@/types/aiCollaboration';
import SharedContextEditor from './SharedContextEditor';

interface SharedContextPanelProps {
  contexts: SharedAIContext[];
  combinedContext: string;
  teamId: string;
  appId?: string;
  currentUserId: string;
  onCreateContext: (input: {
    contextKey: string;
    contextValue: string;
    description?: string;
    scope: ContextScope;
    priority?: ContextPriority;
    appId?: string;
    expiresAt?: string;
  }) => Promise<void>;
  onUpdateContext: (contextId: string, updates: Partial<SharedAIContext>) => Promise<void>;
  onDeleteContext: (contextId: string) => Promise<void>;
  isLoading?: boolean;
}

type ViewMode = 'list' | 'combined';

export default function SharedContextPanel({
  contexts,
  combinedContext,
  teamId,
  appId,
  currentUserId,
  onCreateContext,
  onUpdateContext,
  onDeleteContext,
  isLoading = false,
}: SharedContextPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showEditor, setShowEditor] = useState(false);
  const [editingContext, setEditingContext] = useState<SharedAIContext | null>(null);
  const [expandedContextId, setExpandedContextId] = useState<string | null>(null);

  const groupedContexts = {
    team: contexts.filter((c) => c.scope === 'team'),
    app: contexts.filter((c) => c.scope === 'app'),
    phase: contexts.filter((c) => c.scope === 'phase'),
  };

  const handleEdit = (context: SharedAIContext) => {
    setEditingContext(context);
    setShowEditor(true);
  };

  const handleDelete = async (contextId: string) => {
    if (confirm('Are you sure you want to delete this context?')) {
      await onDeleteContext(contextId);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Shared AI Context</h3>
            <p className="text-sm text-gray-400">
              {contexts.length} context{contexts.length !== 1 ? 's' : ''} active
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('combined')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'combined'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Combined
            </button>
          </div>
          <button
            onClick={() => {
              setEditingContext(null);
              setShowEditor(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Context
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : viewMode === 'combined' ? (
          /* Combined View */
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-300">Combined Context (sent to AI)</h4>
                <button
                  onClick={() => navigator.clipboard.writeText(combinedContext)}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Copy
                </button>
              </div>
              {combinedContext ? (
                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono bg-gray-900 p-3 rounded-lg max-h-96 overflow-y-auto">
                  {combinedContext}
                </pre>
              ) : (
                <p className="text-sm text-gray-500 italic">No context configured</p>
              )}
            </div>
            <p className="text-xs text-gray-500">
              This context is automatically included in all AI conversations for your team.
              Contexts are ordered by priority (critical → high → normal → low).
            </p>
          </div>
        ) : (
          /* List View */
          <div className="space-y-6">
            {contexts.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 bg-gray-800 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <p className="text-gray-400">No shared context configured</p>
                <p className="text-sm text-gray-500 mt-1">
                  Add context to help AI understand your team&apos;s preferences
                </p>
              </div>
            ) : (
              Object.entries(groupedContexts).map(([scope, scopeContexts]) => {
                if (scopeContexts.length === 0) return null;
                return (
                  <div key={scope}>
                    <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <ScopeIcon scope={scope as ContextScope} />
                      {scope} Context ({scopeContexts.length})
                    </h4>
                    <div className="space-y-2">
                      {scopeContexts.map((context) => (
                        <ContextCard
                          key={context.id}
                          context={context}
                          isExpanded={expandedContextId === context.id}
                          onToggleExpand={() => setExpandedContextId(
                            expandedContextId === context.id ? null : context.id
                          )}
                          onEdit={() => handleEdit(context)}
                          onDelete={() => handleDelete(context.id)}
                          canEdit={context.createdBy === currentUserId}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {showEditor && (
        <SharedContextEditor
          teamId={teamId}
          appId={appId}
          existingContext={editingContext}
          onClose={() => {
            setShowEditor(false);
            setEditingContext(null);
          }}
          onSubmit={async (input) => {
            if (editingContext) {
              await onUpdateContext(editingContext.id, input);
            } else {
              await onCreateContext(input);
            }
            setShowEditor(false);
            setEditingContext(null);
          }}
        />
      )}
    </div>
  );
}

function ScopeIcon({ scope }: { scope: ContextScope }) {
  if (scope === 'team') {
    return (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    );
  }
  if (scope === 'app') {
    return (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

interface ContextCardProps {
  context: SharedAIContext;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
}

function ContextCard({
  context,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  canEdit,
}: ContextCardProps) {
  const priorityConfig = {
    critical: { color: 'bg-red-500/20 text-red-400', label: 'Critical' },
    high: { color: 'bg-orange-500/20 text-orange-400', label: 'High' },
    normal: { color: 'bg-blue-500/20 text-blue-400', label: 'Normal' },
    low: { color: 'bg-gray-500/20 text-gray-400', label: 'Low' },
  };

  const config = priorityConfig[context.priority];

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      <div
        className="p-3 cursor-pointer hover:bg-gray-750"
        onClick={onToggleExpand}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <code className="text-sm font-mono text-blue-400">{context.contextKey}</code>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.color}`}>
                {config.label}
              </span>
              {!context.isActive && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-600 text-gray-400">
                  Inactive
                </span>
              )}
            </div>
            {context.description && (
              <p className="text-sm text-gray-400 truncate">{context.description}</p>
            )}
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

      {isExpanded && (
        <div className="border-t border-gray-700 p-3 space-y-3">
          <div className="bg-gray-900 rounded-lg p-3">
            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
              {context.contextValue}
            </pre>
          </div>

          {context.expiresAt && (
            <p className="text-xs text-gray-500">
              Expires: {new Date(context.expiresAt).toLocaleString()}
            </p>
          )}

          {canEdit && (
            <div className="flex gap-2 pt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="px-3 py-1.5 text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
              >
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
