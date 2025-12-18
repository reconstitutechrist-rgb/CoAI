/**
 * AICollaborationHub - Unified AI Collaboration Interface
 *
 * Main integration point for all AI collaboration features.
 * Provides a tabbed interface for all collaboration tools.
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useAICollaboration } from '@/hooks/useAICollaboration';
import { useTeam } from '@/hooks/useTeam';
import { BuilderMode } from '@/types/aiCollaboration';

// Import all panels
import AIDecisionPanel from './AIDecisionPanel';
import SharedContextPanel from './SharedContextPanel';
import HandoffPanel from './HandoffPanel';
import PhasePlanningPanel from './PhasePlanningPanel';
import FeatureOwnershipPanel from './FeatureOwnershipPanel';
import AIReviewPanel from './AIReviewPanel';
import PromptTemplatesPanel from './PromptTemplatesPanel';
import { ProjectArtifactsTab } from '../project/ProjectArtifactsTab';
import { ProjectIntegrationTab } from './ProjectIntegrationTab';

interface AICollaborationHubProps {
  appId: string;
  teamId?: string;
  currentUserId: string;
  currentMode: BuilderMode;
  currentPhase?: string;
  conversationSnapshot?: unknown;
  phases?: { number: number; name: string; features: string[] }[];
  onContextChange?: (context: string) => void;
  className?: string;
}

type CollaborationTab =
  | 'decisions'
  | 'context'
  | 'templates'
  | 'handoffs'
  | 'planning'
  | 'ownership'
  | 'reviews'
  | 'artifacts'
  | 'integration';

const TABS: { key: CollaborationTab; label: string; icon: string; color: string }[] = [
  { key: 'decisions', label: 'Decisions', icon: '✓', color: 'purple' },
  { key: 'context', label: 'AI Context', icon: '💡', color: 'blue' },
  { key: 'templates', label: 'Templates', icon: '📝', color: 'pink' },
  { key: 'handoffs', label: 'Handoffs', icon: '↔', color: 'cyan' },
  { key: 'planning', label: 'Planning', icon: '📋', color: 'indigo' },
  { key: 'ownership', label: 'Ownership', icon: '👤', color: 'amber' },
  { key: 'reviews', label: 'Reviews', icon: '✓', color: 'emerald' },
  { key: 'artifacts', label: 'Artifacts', icon: '📦', color: 'sky' },
  { key: 'integration', label: 'Integration', icon: '🔗', color: 'teal' },
];

export default function AICollaborationHub({
  appId,
  teamId,
  currentUserId,
  currentMode,
  currentPhase,
  conversationSnapshot,
  phases = [],
  onContextChange,
  className = '',
}: AICollaborationHubProps) {
  const [activeTab, setActiveTab] = useState<CollaborationTab>('decisions');

  // Load team data for member info
  const { team, members } = useTeam({ teamId });

  // Load collaboration data
  const {
    // State
    decisions,
    contexts,
    templates,
    pendingHandoffs,
    planningSession,
    featureOwnerships,
    reviews,
    combinedContext,
    isLoading,

    // Decision actions
    createDecision,
    castVote,
    applyDecision,
    withdrawDecision,

    // Context actions
    createContext,
    updateContext,
    deleteContext,
    refreshCombinedContext,

    // Template actions
    createTemplate,
    updateTemplate,
    deleteTemplate,
    useTemplate,

    // Handoff actions
    createHandoff,
    acceptHandoff,
    declineHandoff,
    completeHandoff,

    // Planning actions
    createPlanningSession,
    addPhaseSuggestion,
    votePlanningSession,
    approvePlanningSession,
    rejectPlanningSession,
    finalizePlanningSession,

    // Ownership actions
    assignFeatureOwner,
    updateFeatureOwnership,
    removeFeatureOwnership,

    // Review actions
    createReview,
    submitReviewResponse,
    applyReviewChanges,
    withdrawReviewRequest,
  } = useAICollaboration({ teamId, appId, autoLoad: true });

  // Transform team members for components
  const teamMembers = useMemo(() => {
    return members.map((m) => ({
      id: m.userId,
      name: m.user?.name,
      email: m.user?.email,
    }));
  }, [members]);

  // Notify parent when context changes
  React.useEffect(() => {
    if (onContextChange) {
      onContextChange(combinedContext);
    }
  }, [combinedContext, onContextChange]);

  // Count pending items per tab
  const pendingCounts = useMemo(() => ({
    decisions: decisions.filter((d) => d.status === 'pending').length,
    context: 0,
    templates: 0,
    handoffs: pendingHandoffs.filter((h) => h.toUserId === currentUserId && h.status === 'pending').length,
    planning: planningSession?.status === 'active' ? 1 : 0,
    ownership: featureOwnerships.filter((o) => o.status === 'assigned' && o.ownerId === currentUserId).length,
    reviews: reviews.filter((r) =>
      r.assignedReviewers.includes(currentUserId) &&
      (r.status === 'pending' || r.status === 'in_review') &&
      !r.responses?.some((resp) => resp.reviewerId === currentUserId)
    ).length,
  }), [decisions, pendingHandoffs, planningSession, featureOwnerships, reviews, currentUserId]);

  const totalPending = Object.values(pendingCounts).reduce((a, b) => a + b, 0);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'decisions':
        return (
          <AIDecisionPanel
            decisions={decisions}
            currentUserId={currentUserId}
            appId={appId}
            teamId={teamId}
            isLoading={isLoading}
            onVote={async (decisionId, choice, comment) => {
              await castVote(decisionId, { choice, comment });
            }}
            onApplyDecision={async (decisionId, selectedOption) => {
              await applyDecision(decisionId, selectedOption?.toString());
            }}
            onWithdraw={async (decisionId) => {
              await withdrawDecision(decisionId);
            }}
            onCreateDecision={async (input) => {
              await createDecision({
                title: input.title,
                description: input.description,
                aiSuggestion: input.aiSuggestion,
                aiReasoning: input.aiReasoning,
                aiAlternatives: input.aiAlternatives,
                votingType: input.votingType,
                requiredVotes: input.requiredVotes,
                expiresAt: input.expiresAt,
                phaseId: input.phaseId,
                featureName: input.featureName,
              });
            }}
          />
        );

      case 'context':
        return (
          <SharedContextPanel
            contexts={contexts}
            combinedContext={combinedContext}
            teamId={teamId || ''}
            appId={appId}
            currentUserId={currentUserId}
            isLoading={isLoading}
            onCreateContext={async (input) => {
              await createContext(input);
              await refreshCombinedContext();
            }}
            onUpdateContext={async (contextId, updates) => {
              await updateContext(contextId, updates);
              await refreshCombinedContext();
            }}
            onDeleteContext={async (contextId) => {
              await deleteContext(contextId);
              await refreshCombinedContext();
            }}
          />
        );

      case 'templates':
        return (
          <PromptTemplatesPanel
            templates={templates}
            currentUserId={currentUserId}
            teamId={teamId || ''}
            onCreateTemplate={async (input) => {
              await createTemplate(input);
            }}
            onUpdateTemplate={async (templateId, input) => {
              await updateTemplate(templateId, input);
            }}
            onDeleteTemplate={async (templateId) => {
              await deleteTemplate(templateId);
            }}
            onUseTemplate={async (templateId, variables) => {
              return await useTemplate(templateId, variables);
            }}
            isLoading={isLoading}
          />
        );

      case 'handoffs':
        return (
          <HandoffPanel
            handoffs={pendingHandoffs}
            currentUserId={currentUserId}
            teamMembers={teamMembers}
            appId={appId}
            currentMode={currentMode}
            currentPhase={currentPhase}
            conversationSnapshot={conversationSnapshot || {}}
            isLoading={isLoading}
            onCreateHandoff={async (input) => {
              await createHandoff({
                toUserId: input.toUserId,
                conversationSnapshot: input.conversationSnapshot,
                currentMode: input.currentMode,
                currentPhase: input.currentPhase,
                handoffNotes: input.handoffNotes,
                urgency: input.urgency,
                suggestedActions: input.suggestedActions,
              });
            }}
            onAcceptHandoff={async (handoffId) => {
              await acceptHandoff(handoffId);
            }}
            onDeclineHandoff={async (handoffId, reason) => {
              await declineHandoff(handoffId, reason);
            }}
            onCompleteHandoff={async (handoffId) => {
              await completeHandoff(handoffId);
            }}
          />
        );

      case 'planning':
        return (
          <PhasePlanningPanel
            session={planningSession}
            currentUserId={currentUserId}
            appId={appId}
            teamId={teamId}
            isLoading={isLoading}
            onCreateSession={async (input) => {
              await createPlanningSession({
                title: input.title,
                description: input.description,
                aiGeneratedPhases: input.aiGeneratedPhases,
                maxPhases: input.maxPhases,
              });
            }}
            onAddSuggestion={async (input) => {
              if (planningSession?.id) {
                await addPhaseSuggestion({
                  sessionId: planningSession.id,
                  phaseName: input.phaseName,
                  phaseDescription: input.phaseDescription,
                  features: input.features,
                  dependencies: input.dependencies,
                  estimatedComplexity: input.estimatedComplexity,
                  insertAtPosition: input.insertAtPosition,
                });
              }
            }}
            onVoteSuggestion={async (suggestionId, vote, comment) => {
              await votePlanningSession({ suggestionId, vote, comment });
            }}
            onApproveSuggestion={async () => {
              await approvePlanningSession();
            }}
            onRejectSuggestion={async () => {
              await rejectPlanningSession();
            }}
            onFinalizeSession={async () => {
              await finalizePlanningSession();
            }}
          />
        );

      case 'ownership':
        return (
          <FeatureOwnershipPanel
            ownerships={featureOwnerships}
            currentUserId={currentUserId}
            appId={appId}
            teamId={teamId}
            teamMembers={teamMembers}
            phases={phases}
            isLoading={isLoading}
            onAssignOwner={async (input) => {
              await assignFeatureOwner({
                featureName: input.featureName,
                ownerId: input.ownerId,
                phaseId: input.phaseId,
                responsibilities: input.responsibilities,
                notes: input.notes,
              });
            }}
            onUpdateOwnership={async (ownershipId, updates) => {
              await updateFeatureOwnership(ownershipId, updates);
            }}
            onRemoveOwnership={async (ownershipId) => {
              await removeFeatureOwnership(ownershipId);
            }}
          />
        );

      case 'reviews':
        return (
          <AIReviewPanel
            reviews={reviews}
            currentUserId={currentUserId}
            teamMembers={teamMembers}
            appId={appId}
            teamId={teamId}
            isLoading={isLoading}
            onCreateReview={async (input) => {
              await createReview({
                reviewType: input.reviewType,
                title: input.title,
                description: input.description,
                aiOutput: input.aiOutput,
                phaseId: input.phaseId,
                featureName: input.featureName,
                filesToAdd: input.filesToAdd,
                filesToModify: input.filesToModify,
                assignedReviewers: input.assignedReviewers,
                requiredApprovals: input.requiredApprovals,
                expiresAt: input.expiresAt,
              });
            }}
            onSubmitResponse={async (reviewId, decision, comments) => {
              await submitReviewResponse(reviewId, { decision, comments });
            }}
            onApplyReview={async (reviewId) => {
              await applyReviewChanges(reviewId);
            }}
          />
        );

      case 'artifacts':
        return teamId ? (
          <ProjectArtifactsTab
            teamId={teamId}
            onViewArtifact={(artifact) => {
              // Could open a detail modal or navigate to artifact view
              console.log('View artifact:', artifact);
            }}
            onContinueArtifact={(artifact) => {
              // Could restore state and navigate to appropriate tool
              console.log('Continue artifact:', artifact);
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>Team required to view artifacts</p>
          </div>
        );

      case 'integration':
        return teamId ? (
          <ProjectIntegrationTab
            teamId={teamId}
            currentUserId={currentUserId}
            onUsePlan={(appConcept) => {
              // Could set the unified plan as the active app concept
              console.log('Use plan:', appConcept);
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>Team required for plan integration</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`flex flex-col h-full bg-gray-900 rounded-lg border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800/50">
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold">AI Collaboration</span>
          {totalPending > 0 && (
            <span className="px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
              {totalPending}
            </span>
          )}
        </div>
        {team && (
          <span className="text-sm text-gray-400">Team: {team.name}</span>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-700 bg-gray-800/30 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? `text-${tab.color}-400 border-${tab.color}-400`
                : 'text-gray-400 border-transparent hover:text-white hover:border-gray-600'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {pendingCounts[tab.key] > 0 && (
              <span className={`px-1.5 py-0.5 text-xs rounded-full bg-${tab.color}-500/20 text-${tab.color}-400`}>
                {pendingCounts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {renderTabContent()}
      </div>
    </div>
  );
}
