'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  SearchIcon,
  WandIcon,
  CodeIcon,
  MessageSquareIcon,
  LoaderIcon,
  FolderIcon,
  XIcon,
} from '../ui/Icons';
import { ArtifactCard } from './ArtifactCard';
import { useProjectArtifacts } from '@/hooks/useProjectArtifacts';
import type { ProjectArtifact, ArtifactType, ArtifactStatus } from '@/types/projectArtifacts';

export interface ProjectArtifactsTabProps {
  teamId: string;
  onViewArtifact?: (artifact: ProjectArtifact) => void;
  onContinueArtifact?: (artifact: ProjectArtifact) => void;
}

/**
 * Type filter button data
 */
const TYPE_FILTERS: Array<{
  type: ArtifactType | 'all';
  label: string;
  icon: React.FC<{ size?: number; className?: string }>;
}> = [
  { type: 'all', label: 'All', icon: FolderIcon },
  { type: 'ai_builder_plan', label: 'Plans', icon: WandIcon },
  { type: 'ai_builder_app', label: 'Apps', icon: CodeIcon },
  { type: 'ai_debate_session', label: 'Debates', icon: MessageSquareIcon },
];

/**
 * Status filter options
 */
const STATUS_FILTERS: Array<{ status: ArtifactStatus | 'all'; label: string }> = [
  { status: 'all', label: 'All' },
  { status: 'published', label: 'Published' },
  { status: 'draft', label: 'Drafts' },
  { status: 'archived', label: 'Archived' },
];

/**
 * Tab component for displaying and managing project artifacts
 */
export function ProjectArtifactsTab({
  teamId,
  onViewArtifact,
  onContinueArtifact,
}: ProjectArtifactsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<ArtifactType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<ArtifactStatus | 'all'>('all');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const {
    artifacts,
    isLoading,
    isDeleting,
    error,
    total,
    hasMore,
    canEditSelected,
    loadMoreArtifacts,
    deleteArtifact,
    archiveArtifact,
    setTypeFilter,
    setStatusFilter,
    setSearch,
    refresh,
  } = useProjectArtifacts({
    teamId,
    autoLoad: true,
  });

  // Handle type filter change
  const handleTypeChange = useCallback(
    (type: ArtifactType | 'all') => {
      setSelectedType(type);
      setTypeFilter(type === 'all' ? undefined : type);
    },
    [setTypeFilter]
  );

  // Handle status filter change
  const handleStatusChange = useCallback(
    (status: ArtifactStatus | 'all') => {
      setSelectedStatus(status);
      setStatusFilter(status === 'all' ? undefined : status);
    },
    [setStatusFilter]
  );

  // Handle search
  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchQuery(value);
      // Debounce search
      const timer = setTimeout(() => {
        setSearch(value);
      }, 300);
      return () => clearTimeout(timer);
    },
    [setSearch]
  );

  // Handle clear search
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearch('');
  }, [setSearch]);

  // Handle view
  const handleView = useCallback(
    (artifact: ProjectArtifact) => {
      onViewArtifact?.(artifact);
    },
    [onViewArtifact]
  );

  // Handle continue
  const handleContinue = useCallback(
    (artifact: ProjectArtifact) => {
      onContinueArtifact?.(artifact);
    },
    [onContinueArtifact]
  );

  // Handle delete confirmation
  const handleDeleteClick = useCallback((artifact: ProjectArtifact) => {
    setConfirmDelete(artifact.id);
  }, []);

  // Handle delete confirm
  const handleDeleteConfirm = useCallback(async () => {
    if (confirmDelete) {
      await deleteArtifact(confirmDelete);
      setConfirmDelete(null);
    }
  }, [confirmDelete, deleteArtifact]);

  // Handle delete cancel
  const handleDeleteCancel = useCallback(() => {
    setConfirmDelete(null);
  }, []);

  // Handle archive
  const handleArchive = useCallback(
    async (artifact: ProjectArtifact) => {
      await archiveArtifact(artifact.id);
    },
    [archiveArtifact]
  );

  // Handle load more
  const handleLoadMore = useCallback(() => {
    loadMoreArtifacts();
  }, [loadMoreArtifacts]);

  // Empty state content
  const emptyState = useMemo(() => {
    if (searchQuery) {
      return {
        title: 'No results found',
        description: `No artifacts match "${searchQuery}". Try a different search term.`,
      };
    }
    if (selectedType !== 'all' || selectedStatus !== 'all') {
      return {
        title: 'No artifacts found',
        description: 'No artifacts match the selected filters. Try adjusting your filters.',
      };
    }
    return {
      title: 'No artifacts yet',
      description:
        'Save your AI Builder plans, apps, or AI Debate sessions to share them with your team.',
    };
  }, [searchQuery, selectedType, selectedStatus]);

  return (
    <div className="h-full flex flex-col">
      {/* Header with filters */}
      <div className="flex-shrink-0 p-4 border-b border-zinc-800 space-y-3">
        {/* Search */}
        <div className="relative">
          <SearchIcon
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Search artifacts..."
            className="w-full pl-9 pr-8 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300"
            >
              <XIcon size={14} />
            </button>
          )}
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-2">
          {TYPE_FILTERS.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              onClick={() => handleTypeChange(type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 mr-1">Status:</span>
          {STATUS_FILTERS.map(({ status, label }) => (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                selectedStatus === status
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Error state */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
            {error}
            <button onClick={refresh} className="ml-2 underline hover:no-underline">
              Retry
            </button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && artifacts.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <LoaderIcon size={24} className="text-zinc-500 animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && artifacts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
              <FolderIcon size={32} className="text-zinc-600" />
            </div>
            <h3 className="text-lg font-medium text-zinc-300 mb-2">
              {emptyState.title}
            </h3>
            <p className="text-sm text-zinc-500 max-w-sm">{emptyState.description}</p>
          </div>
        )}

        {/* Artifacts grid */}
        {artifacts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {artifacts.map((artifact) => (
              <ArtifactCard
                key={artifact.id}
                artifact={artifact}
                onView={handleView}
                onContinue={onContinueArtifact ? handleContinue : undefined}
                onDelete={handleDeleteClick}
                onArchive={handleArchive}
                canEdit={true} // This would be determined by role in real implementation
              />
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center mt-6">
            <button
              onClick={handleLoadMore}
              disabled={isLoading}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <LoaderIcon size={14} className="animate-spin" />
                  Loading...
                </span>
              ) : (
                `Load more (${artifacts.length} of ${total})`
              )}
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-zinc-100 mb-2">
              Delete Artifact?
            </h3>
            <p className="text-sm text-zinc-400 mb-6">
              This action cannot be undone. The artifact will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteCancel}
                className="flex-1 py-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
