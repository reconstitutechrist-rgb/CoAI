'use client';

import React, { useCallback, useMemo } from 'react';
import {
  WandIcon,
  CodeIcon,
  MessageSquareIcon,
  TrashIcon,
  PlayIcon,
  EyeIcon,
  ArchiveIcon,
  ClockIcon,
} from '../ui/Icons';
import type { ProjectArtifact, ArtifactType } from '@/types/projectArtifacts';
import {
  getArtifactTypeLabel,
  getArtifactStatusColor,
  isAIBuilderPlanContent,
  isAIBuilderAppContent,
  isAIDebateSessionContent,
} from '@/types/projectArtifacts';

export interface ArtifactCardProps {
  artifact: ProjectArtifact;
  onView?: (artifact: ProjectArtifact) => void;
  onContinue?: (artifact: ProjectArtifact) => void;
  onDelete?: (artifact: ProjectArtifact) => void;
  onArchive?: (artifact: ProjectArtifact) => void;
  canEdit?: boolean;
  isCompact?: boolean;
}

/**
 * Get the icon component for an artifact type
 */
function getArtifactIcon(type: ArtifactType) {
  switch (type) {
    case 'ai_builder_plan':
      return WandIcon;
    case 'ai_builder_app':
      return CodeIcon;
    case 'ai_debate_session':
      return MessageSquareIcon;
    default:
      return WandIcon;
  }
}

/**
 * Get background color class for artifact type
 */
function getArtifactBgColor(type: ArtifactType): string {
  switch (type) {
    case 'ai_builder_plan':
      return 'bg-amber-500/20';
    case 'ai_builder_app':
      return 'bg-blue-500/20';
    case 'ai_debate_session':
      return 'bg-purple-500/20';
    default:
      return 'bg-zinc-500/20';
  }
}

/**
 * Get icon color class for artifact type
 */
function getArtifactIconColor(type: ArtifactType): string {
  switch (type) {
    case 'ai_builder_plan':
      return 'text-amber-400';
    case 'ai_builder_app':
      return 'text-blue-400';
    case 'ai_debate_session':
      return 'text-purple-400';
    default:
      return 'text-zinc-400';
  }
}

/**
 * Format a date string to a relative time or formatted date
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes <= 1 ? 'Just now' : `${diffMinutes}m ago`;
    }
    return diffHours === 1 ? '1 hour ago' : `${diffHours}h ago`;
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Get a brief summary of the artifact content
 */
function getContentSummary(artifact: ProjectArtifact): string {
  const { content, artifactType } = artifact;

  if (isAIBuilderPlanContent(content)) {
    const features = content.appConcept.coreFeatures?.length || 0;
    return `${features} feature${features !== 1 ? 's' : ''} planned`;
  }

  if (isAIBuilderAppContent(content)) {
    const files = content.generatedFiles?.length || 0;
    return `${files} file${files !== 1 ? 's' : ''} generated`;
  }

  if (isAIDebateSessionContent(content)) {
    const rounds = content.roundCount || 0;
    const status = content.consensus ? 'Consensus reached' : `${rounds} round${rounds !== 1 ? 's' : ''}`;
    return status;
  }

  return '';
}

/**
 * Card component for displaying a project artifact
 */
export function ArtifactCard({
  artifact,
  onView,
  onContinue,
  onDelete,
  onArchive,
  canEdit = false,
  isCompact = false,
}: ArtifactCardProps) {
  const Icon = getArtifactIcon(artifact.artifactType);
  const bgColor = getArtifactBgColor(artifact.artifactType);
  const iconColor = getArtifactIconColor(artifact.artifactType);
  const typeLabel = getArtifactTypeLabel(artifact.artifactType);
  const statusColor = getArtifactStatusColor(artifact.status);
  const contentSummary = useMemo(() => getContentSummary(artifact), [artifact]);

  const handleView = useCallback(() => {
    onView?.(artifact);
  }, [artifact, onView]);

  const handleContinue = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onContinue?.(artifact);
    },
    [artifact, onContinue]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete?.(artifact);
    },
    [artifact, onDelete]
  );

  const handleArchive = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onArchive?.(artifact);
    },
    [artifact, onArchive]
  );

  if (isCompact) {
    return (
      <div
        className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50 hover:border-zinc-600 hover:bg-zinc-800 transition-colors cursor-pointer"
        onClick={handleView}
      >
        <div
          className={`w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center flex-shrink-0`}
        >
          <Icon size={16} className={iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-zinc-100 truncate">
            {artifact.name}
          </h4>
          <p className="text-xs text-zinc-500">{typeLabel}</p>
        </div>
        <span className="text-xs text-zinc-500">
          {formatDate(artifact.createdAt)}
        </span>
      </div>
    );
  }

  return (
    <div
      className="group bg-zinc-800/50 rounded-xl border border-zinc-700/50 hover:border-zinc-600 hover:bg-zinc-800 transition-all cursor-pointer overflow-hidden"
      onClick={handleView}
    >
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center flex-shrink-0`}
          >
            <Icon size={20} className={iconColor} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-zinc-100 truncate">
                {artifact.name}
              </h3>
              {artifact.status === 'draft' && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-yellow-500/20 text-yellow-400 rounded">
                  Draft
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400">{typeLabel}</p>
          </div>
        </div>

        {/* Description */}
        {artifact.description && (
          <p className="mt-3 text-sm text-zinc-400 line-clamp-2">
            {artifact.description}
          </p>
        )}
      </div>

      {/* Content Summary */}
      {contentSummary && (
        <div className="px-4 py-2 bg-zinc-900/50 border-t border-zinc-700/30">
          <p className="text-xs text-zinc-500">{contentSummary}</p>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 border-t border-zinc-700/30 flex items-center justify-between">
        {/* Creator & Time */}
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          {artifact.creator?.avatarUrl ? (
            <img
              src={artifact.creator.avatarUrl}
              alt={artifact.creator.fullName || artifact.creator.email}
              className="w-5 h-5 rounded-full"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] text-zinc-400">
              {(artifact.creator?.fullName || artifact.creator?.email || 'U')[0].toUpperCase()}
            </div>
          )}
          <span className="truncate max-w-[100px]">
            {artifact.creator?.fullName || artifact.creator?.email?.split('@')[0] || 'Unknown'}
          </span>
          <span className="text-zinc-600">·</span>
          <ClockIcon size={12} className="text-zinc-500" />
          <span>{formatDate(artifact.createdAt)}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onView && (
            <button
              onClick={handleView}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded transition-colors"
              title="View"
            >
              <EyeIcon size={14} />
            </button>
          )}
          {onContinue && (
            <button
              onClick={handleContinue}
              className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
              title="Continue"
            >
              <PlayIcon size={14} />
            </button>
          )}
          {canEdit && onArchive && artifact.status !== 'archived' && (
            <button
              onClick={handleArchive}
              className="p-1.5 text-zinc-400 hover:text-yellow-400 hover:bg-yellow-500/10 rounded transition-colors"
              title="Archive"
            >
              <ArchiveIcon size={14} />
            </button>
          )}
          {canEdit && onDelete && (
            <button
              onClick={handleDelete}
              className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
              title="Delete"
            >
              <TrashIcon size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
