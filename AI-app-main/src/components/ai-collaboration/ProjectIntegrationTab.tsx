/**
 * ProjectIntegrationTab - Main tab for AI Plan Synthesis
 *
 * Enables teams to collaboratively plan an app where the Project Owner
 * defines the master vision (Project Brief), team members contribute
 * partial plans/ideas as artifacts, and the AI synthesizes everything
 * into a unified AppConcept with gap analysis.
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  PlusIcon,
  CheckIcon,
  AlertTriangleIcon,
  AlertCircleIcon,
  RefreshIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  LayersIcon,
  TargetIcon,
  LinkIcon,
  UsersIcon,
  FileIcon,
  WandIcon,
  LoaderIcon,
  MessageSquareIcon,
} from '../ui/Icons';
import { usePlanSynthesis } from '@/hooks/usePlanSynthesis';
import { useProjectArtifacts } from '@/hooks/useProjectArtifacts';
import { ProjectBriefEditor } from './ProjectBriefEditor';
import type {
  ProjectBrief,
  PlanSynthesisResult,
  MissingFeature,
  IncompleteArea,
  PlanConflict,
  FeatureConnection,
  SharedElement,
  SuggestedPhase,
  ArtifactContribution,
} from '@/types/projectIntegration';
import {
  getPriorityLabel,
  getPriorityColor,
  getConfidenceColor,
  getConnectionTypeLabel,
} from '@/types/projectIntegration';

// ============================================================================
// TYPES
// ============================================================================

interface ProjectIntegrationTabProps {
  teamId: string;
  currentUserId: string;
  onUsePlan?: (appConcept: PlanSynthesisResult['unifiedAppConcept']) => void;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Section header with expand/collapse functionality
 */
function SectionHeader({
  title,
  icon: Icon,
  count,
  isExpanded,
  onToggle,
  color = 'zinc',
}: {
  title: string;
  icon: React.FC<{ size?: number; className?: string }>;
  count?: number;
  isExpanded: boolean;
  onToggle: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors"
    >
      <div className="flex items-center gap-2">
        <Icon size={18} className={`text-${color}-400`} />
        <span className="font-medium text-zinc-200">{title}</span>
        {typeof count === 'number' && (
          <span className={`px-2 py-0.5 text-xs rounded-full bg-${color}-500/20 text-${color}-400`}>
            {count}
          </span>
        )}
      </div>
      {isExpanded ? (
        <ChevronDownIcon size={16} className="text-zinc-500" />
      ) : (
        <ChevronRightIcon size={16} className="text-zinc-500" />
      )}
    </button>
  );
}

/**
 * Project Brief display
 */
function BriefDisplay({
  brief,
  canEdit,
  onEdit,
}: {
  brief: ProjectBrief;
  canEdit: boolean;
  onEdit: () => void;
}) {
  return (
    <div className="bg-zinc-800/30 rounded-lg border border-zinc-700 p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">{brief.appName}</h3>
          <p className="text-sm text-zinc-400 mt-1">{brief.appDescription}</p>
        </div>
        {canEdit && (
          <button
            onClick={onEdit}
            className="px-3 py-1.5 text-sm text-teal-400 hover:text-teal-300 hover:bg-teal-500/10 rounded-lg transition-colors"
          >
            Edit
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-zinc-500">Problem:</span>
          <p className="text-zinc-300 mt-1">{brief.problemStatement}</p>
        </div>
        <div>
          <span className="text-zinc-500">Target Users:</span>
          <p className="text-zinc-300 mt-1">{brief.targetUsers}</p>
        </div>
      </div>

      {brief.desiredFeatures.length > 0 && (
        <div>
          <span className="text-sm text-zinc-500">Desired Features:</span>
          <div className="flex flex-wrap gap-2 mt-2">
            {brief.desiredFeatures.map((feature) => (
              <span
                key={feature.id}
                className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(feature.priority)}`}
              >
                {feature.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Missing Feature Card
 */
function MissingFeatureCard({
  feature,
  onCreateTask,
  isLoading,
}: {
  feature: MissingFeature;
  onCreateTask?: () => void;
  isLoading?: boolean;
}) {
  return (
    <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-zinc-200">{feature.featureName}</span>
            <span className={`px-2 py-0.5 text-xs rounded-full ${getPriorityColor(feature.priority)}`}>
              {getPriorityLabel(feature.priority)}
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">{feature.suggestion}</p>
        </div>
        {onCreateTask && (
          <button
            onClick={onCreateTask}
            disabled={isLoading}
            className="ml-2 px-2 py-1 text-xs bg-teal-600/20 hover:bg-teal-600/30 text-teal-400 rounded transition-colors disabled:opacity-50"
            title="Create task for this feature"
          >
            {isLoading ? '...' : '+ Task'}
          </button>
        )}
      </div>
      {feature.suggestedOwner && (
        <div className="mt-2 text-xs text-zinc-500">
          Suggested owner: <span className="text-zinc-400">{feature.suggestedOwner}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Incomplete Area Card
 */
function IncompleteAreaCard({
  area,
  onCreateTask,
  isLoading,
}: {
  area: IncompleteArea;
  onCreateTask?: () => void;
  isLoading?: boolean;
}) {
  return (
    <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
      <div className="flex items-start justify-between">
        <div className="font-medium text-zinc-200">{area.area}</div>
        {onCreateTask && (
          <button
            onClick={onCreateTask}
            disabled={isLoading}
            className="ml-2 px-2 py-1 text-xs bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 rounded transition-colors disabled:opacity-50"
            title="Create task to complete this area"
          >
            {isLoading ? '...' : '+ Task'}
          </button>
        )}
      </div>
      <p className="text-sm text-yellow-400/80 mt-1">{area.whatsMissing}</p>
      <p className="text-sm text-zinc-400 mt-2">{area.suggestion}</p>
      {area.fromArtifactName && (
        <div className="mt-2 text-xs text-zinc-500">
          From: <span className="text-zinc-400">{area.fromArtifactName}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Conflict Card
 */
function ConflictCard({
  conflict,
  onStartDebate,
  isLoading,
}: {
  conflict: PlanConflict;
  onStartDebate?: () => void;
  isLoading?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="p-3 bg-zinc-800/50 rounded-lg border border-red-500/30">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <AlertTriangleIcon size={16} className="text-red-400" />
            <span className="font-medium text-zinc-200">{conflict.topic}</span>
            {conflict.needsDebate && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-orange-500/20 text-orange-400">
                Needs Discussion
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onStartDebate && conflict.needsDebate && (
            <button
              onClick={onStartDebate}
              disabled={isLoading}
              className="px-2 py-1 text-xs bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded transition-colors disabled:opacity-50"
              title="Start AI Debate to resolve this conflict"
            >
              {isLoading ? '...' : 'Debate'}
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-zinc-500 hover:text-zinc-300"
          >
            {isExpanded ? <ChevronDownIcon size={16} /> : <ChevronRightIcon size={16} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 space-y-2">
          {conflict.positions.map((pos, idx) => (
            <div key={idx} className="p-2 bg-zinc-900/50 rounded text-sm">
              <div className="text-zinc-300">{pos.position}</div>
              <div className="text-xs text-zinc-500 mt-1">
                From: {pos.fromArtifactName} by {pos.contributedBy}
              </div>
            </div>
          ))}
          <div className="p-2 bg-teal-500/10 border border-teal-500/30 rounded text-sm">
            <span className="text-teal-400 font-medium">AI Recommendation:</span>
            <p className="text-zinc-300 mt-1">{conflict.aiRecommendation}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Feature Connection Card
 */
function FeatureConnectionCard({ connection }: { connection: FeatureConnection }) {
  return (
    <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-zinc-200">{connection.feature1}</span>
        <span className="px-2 py-0.5 text-xs rounded bg-blue-500/20 text-blue-400">
          {getConnectionTypeLabel(connection.connectionType)}
        </span>
        <span className="font-medium text-zinc-200">{connection.feature2}</span>
      </div>
      <p className="text-sm text-zinc-400 mt-2">{connection.description}</p>
      {connection.designConsiderations.length > 0 && (
        <ul className="mt-2 text-xs text-zinc-500 space-y-1">
          {connection.designConsiderations.map((note, idx) => (
            <li key={idx}>• {note}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Shared Element Card
 */
function SharedElementCard({ element }: { element: SharedElement }) {
  return (
    <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
      <div className="flex items-center gap-2">
        <span className="font-medium text-zinc-200">{element.name}</span>
        <span className="px-2 py-0.5 text-xs rounded bg-purple-500/20 text-purple-400">
          {element.elementType}
        </span>
      </div>
      <p className="text-sm text-zinc-400 mt-1">{element.description}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {element.usedByFeatures.map((feature, idx) => (
          <span key={idx} className="px-2 py-0.5 text-xs rounded bg-zinc-700 text-zinc-400">
            {feature}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Suggested Phase Card
 */
function SuggestedPhaseCard({ phase }: { phase: SuggestedPhase }) {
  return (
    <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 flex items-center justify-center rounded-full bg-teal-500/20 text-teal-400 text-sm font-medium">
          {phase.phaseNumber}
        </span>
        <span className="font-medium text-zinc-200">{phase.name}</span>
        <span
          className={`px-2 py-0.5 text-xs rounded ${
            phase.complexity === 'high'
              ? 'bg-red-500/20 text-red-400'
              : phase.complexity === 'medium'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-green-500/20 text-green-400'
          }`}
        >
          {phase.complexity}
        </span>
      </div>
      <p className="text-sm text-zinc-400 mt-2">{phase.description}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {phase.features.map((feature, idx) => (
          <span key={idx} className="px-2 py-0.5 text-xs rounded bg-zinc-700 text-zinc-300">
            {feature}
          </span>
        ))}
      </div>
      {phase.dependsOn.length > 0 && (
        <div className="mt-2 text-xs text-zinc-500">
          Depends on phases: {phase.dependsOn.join(', ')}
        </div>
      )}
    </div>
  );
}

/**
 * Contribution Card
 */
function ContributionCard({ contribution }: { contribution: ArtifactContribution }) {
  const typeIcons: Record<string, React.FC<{ size?: number; className?: string }>> = {
    ai_builder_plan: WandIcon,
    ai_builder_app: FileIcon,
    ai_debate_session: MessageSquareIcon,
  };
  const Icon = typeIcons[contribution.artifactType] || FileIcon;

  return (
    <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-zinc-400" />
        <span className="font-medium text-zinc-200">{contribution.artifactName}</span>
      </div>
      <div className="text-xs text-zinc-500 mt-1">
        By {contribution.contributorInfo?.name || contribution.contributedBy}
      </div>
      {contribution.contributedFeatures.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {contribution.contributedFeatures.map((feature, idx) => (
            <span key={idx} className="px-2 py-0.5 text-xs rounded bg-teal-500/20 text-teal-400">
              {feature}
            </span>
          ))}
        </div>
      )}
      {contribution.keyDecisions.length > 0 && (
        <ul className="mt-2 text-xs text-zinc-400 space-y-1">
          {contribution.keyDecisions.slice(0, 3).map((decision, idx) => (
            <li key={idx}>• {decision}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProjectIntegrationTab({
  teamId,
  currentUserId,
  onUsePlan,
}: ProjectIntegrationTabProps) {
  // State
  const [showBriefEditor, setShowBriefEditor] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    brief: true,
    contributions: false,
    unified: true,
    gaps: true,
    integration: false,
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Hooks
  const {
    projectBrief,
    canEditBrief,
    isLoadingBrief,
    briefError,
    createBrief,
    updateBrief,
    refreshBrief,
    synthesis,
    isSynthesizing,
    isLoadingSynthesis,
    synthesisError,
    triggerSynthesis,
    hasProjectBrief,
    hasSynthesis,
    completionPercentage,
    gapsCount,
    conflictsCount,
    readyToBuild,
    // Gap actions
    isExecutingAction,
    actionError,
    createTaskFromGap,
    getDebatePromptForConflict,
  } = usePlanSynthesis({ teamId, autoLoad: true });

  const { artifacts } = useProjectArtifacts({ teamId, autoLoad: true });

  // Toggle section
  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // Handle brief save
  const handleBriefSave = useCallback(
    async (data: Parameters<typeof createBrief>[0]) => {
      const success = projectBrief
        ? await updateBrief(data)
        : await createBrief(data);
      if (success) {
        setShowBriefEditor(false);
      }
      return success;
    },
    [projectBrief, createBrief, updateBrief]
  );

  // Handle synthesis
  const handleSynthesize = useCallback(async () => {
    await triggerSynthesis(true);
  }, [triggerSynthesis]);

  // Handle use plan
  const handleUsePlan = useCallback(() => {
    if (synthesis?.unifiedAppConcept && onUsePlan) {
      onUsePlan(synthesis.unifiedAppConcept);
    }
  }, [synthesis, onUsePlan]);

  // Helper to show success message briefly
  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  }, []);

  // Handle creating a task from a missing feature
  const handleCreateTaskForFeature = useCallback(
    async (feature: MissingFeature) => {
      const result = await createTaskFromGap({
        gapType: 'missing-feature',
        featureName: feature.featureName,
        description: feature.suggestion,
        priority: feature.priority,
      });
      if (result.success) {
        showSuccess(`Task created for "${feature.featureName}"`);
      }
    },
    [createTaskFromGap, showSuccess]
  );

  // Handle creating a task from an incomplete area
  const handleCreateTaskForArea = useCallback(
    async (area: IncompleteArea) => {
      const result = await createTaskFromGap({
        gapType: 'incomplete-area',
        featureName: area.area,
        description: `${area.whatsMissing}\n\n${area.suggestion}`,
        priority: 'should-have',
      });
      if (result.success) {
        showSuccess(`Task created for "${area.area}"`);
      }
    },
    [createTaskFromGap, showSuccess]
  );

  // Handle starting a debate for a conflict
  const handleStartDebate = useCallback(
    async (conflict: PlanConflict) => {
      const result = await getDebatePromptForConflict(conflict);
      if (result.success && result.debatePrompt) {
        // TODO: Integrate with AI Debate system - for now show the prompt info
        showSuccess(`Debate ready: "${conflict.topic}" - Copy the prompt to AI Debate`);
        console.log('Debate prompt for integration:', result.debatePrompt);
      }
    },
    [getDebatePromptForConflict, showSuccess]
  );

  // Computed values
  const artifactCount = artifacts.length;
  const hasArtifacts = artifactCount > 0;
  const canSynthesize = hasProjectBrief && hasArtifacts;

  // Loading state
  if (isLoadingBrief && !projectBrief) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoaderIcon size={24} className="text-zinc-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Plan Integration</h2>
            <p className="text-sm text-zinc-400">
              Synthesize team contributions into a unified app plan
            </p>
          </div>
          {hasSynthesis && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-teal-400">{completionPercentage}%</div>
                <div className="text-xs text-zinc-500">Complete</div>
              </div>
              {readyToBuild && (
                <CheckIcon size={24} className="text-green-400" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Error Messages */}
        {(briefError || synthesisError || actionError) && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
            {briefError || synthesisError || actionError}
          </div>
        )}

        {/* Success Messages */}
        {successMessage && (
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-400">
            {successMessage}
          </div>
        )}

        {/* Project Brief Section */}
        {showBriefEditor ? (
          <ProjectBriefEditor
            existingBrief={projectBrief}
            onSave={handleBriefSave}
            onCancel={() => setShowBriefEditor(false)}
            isSaving={isLoadingBrief}
          />
        ) : (
          <div className="space-y-2">
            <SectionHeader
              title="Project Brief"
              icon={TargetIcon}
              isExpanded={expandedSections.brief}
              onToggle={() => toggleSection('brief')}
              color="teal"
            />
            {expandedSections.brief && (
              <div className="pl-2">
                {projectBrief ? (
                  <BriefDisplay
                    brief={projectBrief}
                    canEdit={canEditBrief}
                    onEdit={() => setShowBriefEditor(true)}
                  />
                ) : (
                  <div className="p-6 bg-zinc-800/30 rounded-lg border border-dashed border-zinc-700 text-center">
                    <TargetIcon size={32} className="text-zinc-600 mx-auto mb-3" />
                    <h3 className="text-zinc-300 font-medium mb-1">No Project Brief</h3>
                    <p className="text-sm text-zinc-500 mb-4">
                      Define the master vision for your app to guide the AI synthesis.
                    </p>
                    {canEditBrief && (
                      <button
                        onClick={() => setShowBriefEditor(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <PlusIcon size={16} />
                        Create Project Brief
                      </button>
                    )}
                    {!canEditBrief && (
                      <p className="text-xs text-zinc-500">
                        Only team owners and admins can create a project brief.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Team Contributions Section */}
        <div className="space-y-2">
          <SectionHeader
            title="Team Contributions"
            icon={UsersIcon}
            count={artifactCount}
            isExpanded={expandedSections.contributions}
            onToggle={() => toggleSection('contributions')}
            color="blue"
          />
          {expandedSections.contributions && (
            <div className="pl-2">
              {hasArtifacts ? (
                <div className="grid gap-2">
                  {synthesis?.contributingArtifacts?.map((contribution) => (
                    <ContributionCard key={contribution.artifactId} contribution={contribution} />
                  )) || (
                    <p className="text-sm text-zinc-500 p-3">
                      {artifactCount} artifacts available. Run synthesis to see contributions.
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-zinc-800/30 rounded-lg border border-dashed border-zinc-700 text-center">
                  <UsersIcon size={24} className="text-zinc-600 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500">
                    No artifacts yet. Team members can save their AI Builder and AI Debate work.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Synthesize Button */}
        <div className="py-4">
          <button
            onClick={handleSynthesize}
            disabled={!canSynthesize || isSynthesizing}
            className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
              canSynthesize && !isSynthesizing
                ? 'bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-500 hover:to-blue-500 text-white'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            {isSynthesizing ? (
              <>
                <LoaderIcon size={18} className="animate-spin" />
                Synthesizing Plan...
              </>
            ) : (
              <>
                <WandIcon size={18} />
                Synthesize Plan
              </>
            )}
          </button>
          {!canSynthesize && (
            <p className="text-xs text-center text-zinc-500 mt-2">
              {!hasProjectBrief && 'Create a project brief to enable synthesis.'}
              {hasProjectBrief && !hasArtifacts && 'Add team artifacts to enable synthesis.'}
            </p>
          )}
        </div>

        {/* Synthesis Results */}
        {hasSynthesis && synthesis && (
          <>
            {/* Unified Plan Section */}
            <div className="space-y-2">
              <SectionHeader
                title="Unified App Concept"
                icon={LayersIcon}
                isExpanded={expandedSections.unified}
                onToggle={() => toggleSection('unified')}
                color="teal"
              />
              {expandedSections.unified && (
                <div className="pl-2">
                  <div className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-700 space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-100">
                        {synthesis.unifiedAppConcept.name}
                      </h3>
                      <p className="text-sm text-zinc-400 mt-1">
                        {synthesis.unifiedAppConcept.description}
                      </p>
                    </div>

                    {synthesis.unifiedAppConcept.coreFeatures && synthesis.unifiedAppConcept.coreFeatures.length > 0 && (
                      <div>
                        <span className="text-sm text-zinc-500">
                          Features ({synthesis.unifiedAppConcept.coreFeatures.length}):
                        </span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {synthesis.unifiedAppConcept.coreFeatures.map((feature, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 text-xs rounded bg-teal-500/20 text-teal-400"
                            >
                              {feature.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-zinc-700">
                      <div className="flex items-center gap-3">
                        <span className={`text-sm ${getConfidenceColor(synthesis.confidenceLevel)}`}>
                          {synthesis.confidence}% confidence
                        </span>
                        {synthesis.warnings.length > 0 && (
                          <span className="text-xs text-yellow-400">
                            {synthesis.warnings.length} warning(s)
                          </span>
                        )}
                      </div>
                      {onUsePlan && (
                        <button
                          onClick={handleUsePlan}
                          className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Use This Plan
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Gap Analysis Section */}
            <div className="space-y-2">
              <SectionHeader
                title="Gap Analysis"
                icon={AlertCircleIcon}
                count={gapsCount + conflictsCount}
                isExpanded={expandedSections.gaps}
                onToggle={() => toggleSection('gaps')}
                color={gapsCount + conflictsCount > 0 ? 'yellow' : 'green'}
              />
              {expandedSections.gaps && (
                <div className="pl-2 space-y-4">
                  {/* Blockers */}
                  {synthesis.gapAnalysis.blockers.length > 0 && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <div className="flex items-center gap-2 text-red-400 font-medium mb-2">
                        <AlertTriangleIcon size={16} />
                        Blockers
                      </div>
                      <ul className="text-sm text-zinc-300 space-y-1">
                        {synthesis.gapAnalysis.blockers.map((blocker, idx) => (
                          <li key={idx}>• {blocker}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Missing Features */}
                  {synthesis.gapAnalysis.missingFeatures.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-zinc-400 mb-2">
                        Missing Features ({synthesis.gapAnalysis.missingFeatures.length})
                      </h4>
                      <div className="grid gap-2">
                        {synthesis.gapAnalysis.missingFeatures.map((feature, idx) => (
                          <MissingFeatureCard
                            key={idx}
                            feature={feature}
                            onCreateTask={() => handleCreateTaskForFeature(feature)}
                            isLoading={isExecutingAction}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Incomplete Areas */}
                  {synthesis.gapAnalysis.incompleteAreas.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-zinc-400 mb-2">
                        Incomplete Areas ({synthesis.gapAnalysis.incompleteAreas.length})
                      </h4>
                      <div className="grid gap-2">
                        {synthesis.gapAnalysis.incompleteAreas.map((area, idx) => (
                          <IncompleteAreaCard
                            key={idx}
                            area={area}
                            onCreateTask={() => handleCreateTaskForArea(area)}
                            isLoading={isExecutingAction}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Conflicts */}
                  {synthesis.gapAnalysis.conflicts.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-zinc-400 mb-2">
                        Conflicts ({synthesis.gapAnalysis.conflicts.length})
                      </h4>
                      <div className="grid gap-2">
                        {synthesis.gapAnalysis.conflicts.map((conflict) => (
                          <ConflictCard
                            key={conflict.id}
                            conflict={conflict}
                            onStartDebate={() => handleStartDebate(conflict)}
                            isLoading={isExecutingAction}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* All clear */}
                  {gapsCount + conflictsCount === 0 && (
                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
                      <CheckIcon size={24} className="text-green-400 mx-auto mb-2" />
                      <p className="text-green-400 font-medium">All clear!</p>
                      <p className="text-sm text-zinc-400">
                        No gaps or conflicts detected. The plan is ready to build.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Integration Plan Section */}
            <div className="space-y-2">
              <SectionHeader
                title="Integration Plan"
                icon={LinkIcon}
                isExpanded={expandedSections.integration}
                onToggle={() => toggleSection('integration')}
                color="purple"
              />
              {expandedSections.integration && (
                <div className="pl-2 space-y-4">
                  {/* Feature Connections */}
                  {synthesis.integrationPlan.featureConnections.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-zinc-400 mb-2">
                        Feature Connections
                      </h4>
                      <div className="grid gap-2">
                        {synthesis.integrationPlan.featureConnections.map((conn, idx) => (
                          <FeatureConnectionCard key={idx} connection={conn} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Shared Elements */}
                  {synthesis.integrationPlan.sharedElements.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-zinc-400 mb-2">
                        Shared Elements
                      </h4>
                      <div className="grid gap-2">
                        {synthesis.integrationPlan.sharedElements.map((element, idx) => (
                          <SharedElementCard key={idx} element={element} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggested Phases */}
                  {synthesis.integrationPlan.suggestedPhases.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-zinc-400 mb-2">
                        Suggested Build Order
                      </h4>
                      <div className="grid gap-2">
                        {synthesis.integrationPlan.suggestedPhases.map((phase) => (
                          <SuggestedPhaseCard key={phase.phaseNumber} phase={phase} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {synthesis.integrationPlan.featureConnections.length === 0 &&
                    synthesis.integrationPlan.sharedElements.length === 0 &&
                    synthesis.integrationPlan.suggestedPhases.length === 0 && (
                      <div className="p-4 bg-zinc-800/30 rounded-lg text-center text-zinc-500">
                        No integration details generated yet.
                      </div>
                    )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ProjectIntegrationTab;
