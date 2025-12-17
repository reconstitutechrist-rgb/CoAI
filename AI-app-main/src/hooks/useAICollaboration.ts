/**
 * useAICollaboration Hook - AI collaboration features for teams
 *
 * Provides functionality for:
 * - Prompt attribution and templates
 * - AI decision voting
 * - Shared AI context
 * - Conversation handoffs
 * - Phase planning collaboration
 * - Feature ownership
 * - AI review workflow
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { AICollaborationService } from '@/services/AICollaborationService';
import { useAuth } from '@/contexts/AuthContext';
import type {
  AIPromptContribution,
  CreatePromptContributionInput,
  SharedPromptTemplate,
  CreatePromptTemplateInput,
  AIDecision,
  CreateAIDecisionInput,
  CastVoteInput,
  SharedAIContext,
  CreateAIContextInput,
  UpdateAIContextInput,
  AIConversationHandoff,
  CreateHandoffInput,
  PhasePlanningSession,
  CreatePlanningSessionInput,
  CreatePhaseSuggestionInput,
  CastPlanningVoteInput,
  FeatureOwnership,
  CreateFeatureOwnershipInput,
  UpdateFeatureOwnershipInput,
  AIReviewRequest,
  CreateReviewRequestInput,
  CreateReviewResponseInput,
  AICollaborationStats,
  ProposedPhase,
} from '@/types/aiCollaboration';

/**
 * Options for useAICollaboration hook
 */
export interface UseAICollaborationOptions {
  /** Team ID for team-level collaboration */
  teamId?: string | null;
  /** App ID for app-level collaboration */
  appId?: string | null;
  /** Whether to auto-load data on mount */
  autoLoad?: boolean;
}

/**
 * Return type for useAICollaboration hook
 */
export interface UseAICollaborationReturn {
  // State
  contributions: AIPromptContribution[];
  templates: SharedPromptTemplate[];
  decisions: AIDecision[];
  contexts: SharedAIContext[];
  pendingHandoffs: AIConversationHandoff[];
  planningSession: PhasePlanningSession | null;
  featureOwnerships: FeatureOwnership[];
  reviews: AIReviewRequest[];
  stats: AICollaborationStats | null;
  isLoading: boolean;
  error: string | null;

  // Combined context for AI
  combinedContext: string;

  // Prompt Contributions
  recordContribution: (input: Omit<CreatePromptContributionInput, 'appId' | 'teamId'>) => Promise<AIPromptContribution | null>;
  loadContributions: () => Promise<void>;

  // Prompt Templates
  createTemplate: (input: CreatePromptTemplateInput) => Promise<SharedPromptTemplate | null>;
  loadTemplates: () => Promise<void>;
  useTemplate: (templateId: string, variables?: Record<string, string>) => Promise<string | null>;

  // AI Decisions
  createDecision: (input: Omit<CreateAIDecisionInput, 'appId' | 'teamId'>) => Promise<AIDecision | null>;
  loadDecisions: (status?: string) => Promise<void>;
  castVote: (decisionId: string, input: CastVoteInput) => Promise<boolean>;
  applyDecision: (decisionId: string, selectedOption?: string) => Promise<boolean>;

  // Shared AI Context
  createContext: (input: CreateAIContextInput) => Promise<SharedAIContext | null>;
  updateContext: (contextId: string, input: UpdateAIContextInput) => Promise<boolean>;
  loadContexts: () => Promise<void>;
  refreshCombinedContext: () => Promise<void>;

  // Conversation Handoffs
  createHandoff: (input: Omit<CreateHandoffInput, 'appId' | 'teamId'>) => Promise<AIConversationHandoff | null>;
  loadPendingHandoffs: () => Promise<void>;
  acceptHandoff: (handoffId: string) => Promise<AIConversationHandoff | null>;
  declineHandoff: (handoffId: string, reason?: string) => Promise<boolean>;

  // Phase Planning
  createPlanningSession: (input: Omit<CreatePlanningSessionInput, 'appId' | 'teamId'>) => Promise<PhasePlanningSession | null>;
  loadPlanningSession: () => Promise<void>;
  addPhaseSuggestion: (input: CreatePhaseSuggestionInput) => Promise<boolean>;
  votePlanningSession: (input: CastPlanningVoteInput) => Promise<boolean>;
  updateProposedPhases: (phases: ProposedPhase[]) => Promise<boolean>;

  // Feature Ownership
  assignFeatureOwner: (input: Omit<CreateFeatureOwnershipInput, 'appId' | 'teamId'>) => Promise<FeatureOwnership | null>;
  loadFeatureOwnerships: () => Promise<void>;
  updateFeatureOwnership: (ownershipId: string, input: UpdateFeatureOwnershipInput) => Promise<boolean>;
  getOwnedFeatures: () => Promise<FeatureOwnership[]>;

  // AI Review Workflow
  createReview: (input: Omit<CreateReviewRequestInput, 'appId' | 'teamId'>) => Promise<AIReviewRequest | null>;
  loadReviews: (status?: string) => Promise<void>;
  submitReviewResponse: (reviewId: string, input: CreateReviewResponseInput) => Promise<boolean>;
  applyReviewChanges: (reviewId: string) => Promise<boolean>;
  getMyReviews: () => Promise<AIReviewRequest[]>;

  // Statistics
  loadStats: () => Promise<void>;
}

/**
 * Hook for AI collaboration features
 */
export function useAICollaboration(options: UseAICollaborationOptions): UseAICollaborationReturn {
  const { teamId, appId, autoLoad = true } = options;

  const { user: currentUser } = useAuth();

  // State
  const [contributions, setContributions] = useState<AIPromptContribution[]>([]);
  const [templates, setTemplates] = useState<SharedPromptTemplate[]>([]);
  const [decisions, setDecisions] = useState<AIDecision[]>([]);
  const [contexts, setContexts] = useState<SharedAIContext[]>([]);
  const [pendingHandoffs, setPendingHandoffs] = useState<AIConversationHandoff[]>([]);
  const [planningSession, setPlanningSession] = useState<PhasePlanningSession | null>(null);
  const [featureOwnerships, setFeatureOwnerships] = useState<FeatureOwnership[]>([]);
  const [reviews, setReviews] = useState<AIReviewRequest[]>([]);
  const [stats, setStats] = useState<AICollaborationStats | null>(null);
  const [combinedContext, setCombinedContext] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const serviceRef = useRef<AICollaborationService | null>(null);

  // Initialize service
  useEffect(() => {
    const supabase = createClient();
    serviceRef.current = new AICollaborationService(supabase);
  }, []);

  // ============================================================================
  // PROMPT CONTRIBUTIONS
  // ============================================================================

  const recordContribution = useCallback(
    async (input: Omit<CreatePromptContributionInput, 'appId' | 'teamId'>): Promise<AIPromptContribution | null> => {
      if (!serviceRef.current || !currentUser?.id || !appId) return null;

      try {
        const result = await serviceRef.current.createPromptContribution(currentUser.id, {
          ...input,
          appId,
          teamId: teamId || undefined,
        });

        if (result.success) {
          setContributions((prev) => [result.data, ...prev]);
          return result.data;
        }
        setError(result.error?.message || 'Failed to record contribution');
        return null;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to record contribution');
        return null;
      }
    },
    [appId, teamId, currentUser?.id]
  );

  const loadContributions = useCallback(async () => {
    if (!serviceRef.current || !appId) return;

    setIsLoading(true);
    try {
      const result = await serviceRef.current.getPromptContributions(appId, { limit: 100 });
      if (result.success) {
        setContributions(result.data.items);
      }
    } catch (err) {
      console.error('Error loading contributions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [appId]);

  // ============================================================================
  // PROMPT TEMPLATES
  // ============================================================================

  const createTemplate = useCallback(
    async (input: CreatePromptTemplateInput): Promise<SharedPromptTemplate | null> => {
      if (!serviceRef.current || !currentUser?.id || !teamId) return null;

      try {
        const result = await serviceRef.current.createPromptTemplate(teamId, currentUser.id, input);

        if (result.success) {
          setTemplates((prev) => [result.data, ...prev]);
          return result.data;
        }
        setError(result.error?.message || 'Failed to create template');
        return null;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create template');
        return null;
      }
    },
    [teamId, currentUser?.id]
  );

  const loadTemplates = useCallback(async () => {
    if (!serviceRef.current || !teamId) return;

    setIsLoading(true);
    try {
      const result = await serviceRef.current.getPromptTemplates(teamId, { includePublic: true });
      if (result.success) {
        setTemplates(result.data);
      }
    } catch (err) {
      console.error('Error loading templates:', err);
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  const useTemplate = useCallback(
    async (templateId: string, variables?: Record<string, string>): Promise<string | null> => {
      if (!serviceRef.current || !currentUser?.id) return null;

      try {
        const result = await serviceRef.current.useTemplate(templateId, currentUser.id);

        if (result.success) {
          let text = result.data.templateText;

          // Replace variables
          if (variables) {
            Object.entries(variables).forEach(([key, value]) => {
              text = text.replace(new RegExp(`{{${key}}}`, 'g'), value);
            });
          }

          // Update local state
          setTemplates((prev) =>
            prev.map((t) =>
              t.id === templateId
                ? { ...t, useCount: t.useCount + 1, lastUsedAt: new Date().toISOString() }
                : t
            )
          );

          return text;
        }
        return null;
      } catch (err) {
        console.error('Error using template:', err);
        return null;
      }
    },
    [currentUser?.id]
  );

  // ============================================================================
  // AI DECISIONS
  // ============================================================================

  const createDecision = useCallback(
    async (input: Omit<CreateAIDecisionInput, 'appId' | 'teamId'>): Promise<AIDecision | null> => {
      if (!serviceRef.current || !currentUser?.id || !appId) return null;

      try {
        const result = await serviceRef.current.createDecision(currentUser.id, {
          ...input,
          appId,
          teamId: teamId || undefined,
        });

        if (result.success) {
          setDecisions((prev) => [result.data, ...prev]);
          return result.data;
        }
        setError(result.error?.message || 'Failed to create decision');
        return null;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create decision');
        return null;
      }
    },
    [appId, teamId, currentUser?.id]
  );

  const loadDecisions = useCallback(
    async (status?: string) => {
      if (!serviceRef.current || (!teamId && !appId)) return;

      setIsLoading(true);
      try {
        const result = await serviceRef.current.getDecisions({
          teamId: teamId || undefined,
          appId: appId || undefined,
          status,
          limit: 50,
        });
        if (result.success) {
          setDecisions(result.data);
        }
      } catch (err) {
        console.error('Error loading decisions:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [teamId, appId]
  );

  const castVote = useCallback(
    async (decisionId: string, input: CastVoteInput): Promise<boolean> => {
      if (!serviceRef.current || !currentUser?.id) return false;

      try {
        const result = await serviceRef.current.castVote(decisionId, currentUser.id, input);

        if (result.success) {
          // Reload decisions to get updated vote counts
          await loadDecisions();
          return true;
        }
        setError(result.error?.message || 'Failed to cast vote');
        return false;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to cast vote');
        return false;
      }
    },
    [currentUser?.id, loadDecisions]
  );

  const applyDecision = useCallback(
    async (decisionId: string, selectedOption?: string): Promise<boolean> => {
      if (!serviceRef.current || !currentUser?.id) return false;

      try {
        const result = await serviceRef.current.applyDecision(decisionId, currentUser.id, selectedOption);

        if (result.success) {
          setDecisions((prev) =>
            prev.map((d) => (d.id === decisionId ? result.data : d))
          );
          return true;
        }
        setError(result.error?.message || 'Failed to apply decision');
        return false;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to apply decision');
        return false;
      }
    },
    [currentUser?.id]
  );

  // ============================================================================
  // SHARED AI CONTEXT
  // ============================================================================

  const createContext = useCallback(
    async (input: CreateAIContextInput): Promise<SharedAIContext | null> => {
      if (!serviceRef.current || !currentUser?.id || !teamId) return null;

      try {
        const result = await serviceRef.current.createContext(teamId, currentUser.id, input);

        if (result.success) {
          setContexts((prev) => [...prev, result.data].sort((a, b) => b.priority - a.priority));
          await refreshCombinedContext();
          return result.data;
        }
        setError(result.error?.message || 'Failed to create context');
        return null;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create context');
        return null;
      }
    },
    [teamId, currentUser?.id]
  );

  const updateContext = useCallback(
    async (contextId: string, input: UpdateAIContextInput): Promise<boolean> => {
      if (!serviceRef.current || !currentUser?.id) return false;

      try {
        const result = await serviceRef.current.updateContext(contextId, currentUser.id, input);

        if (result.success) {
          setContexts((prev) =>
            prev.map((c) => (c.id === contextId ? result.data : c))
          );
          await refreshCombinedContext();
          return true;
        }
        setError(result.error?.message || 'Failed to update context');
        return false;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update context');
        return false;
      }
    },
    [currentUser?.id]
  );

  const loadContexts = useCallback(async () => {
    if (!serviceRef.current || !teamId) return;

    setIsLoading(true);
    try {
      const result = await serviceRef.current.getContexts(teamId, { appId: appId || undefined });
      if (result.success) {
        setContexts(result.data);
      }
    } catch (err) {
      console.error('Error loading contexts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [teamId, appId]);

  const refreshCombinedContext = useCallback(async () => {
    if (!serviceRef.current || !teamId) return;

    try {
      const combined = await serviceRef.current.buildCombinedContext(teamId, appId || undefined);
      setCombinedContext(combined);
    } catch (err) {
      console.error('Error building combined context:', err);
    }
  }, [teamId, appId]);

  // ============================================================================
  // CONVERSATION HANDOFFS
  // ============================================================================

  const createHandoff = useCallback(
    async (input: Omit<CreateHandoffInput, 'appId' | 'teamId'>): Promise<AIConversationHandoff | null> => {
      if (!serviceRef.current || !currentUser?.id || !appId) return null;

      try {
        const result = await serviceRef.current.createHandoff(currentUser.id, {
          ...input,
          appId,
          teamId: teamId || undefined,
        });

        if (result.success) {
          return result.data;
        }
        setError(result.error?.message || 'Failed to create handoff');
        return null;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create handoff');
        return null;
      }
    },
    [appId, teamId, currentUser?.id]
  );

  const loadPendingHandoffs = useCallback(async () => {
    if (!serviceRef.current || !currentUser?.id) return;

    setIsLoading(true);
    try {
      const result = await serviceRef.current.getPendingHandoffs(currentUser.id);
      if (result.success) {
        setPendingHandoffs(result.data);
      }
    } catch (err) {
      console.error('Error loading handoffs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id]);

  const acceptHandoff = useCallback(
    async (handoffId: string): Promise<AIConversationHandoff | null> => {
      if (!serviceRef.current || !currentUser?.id) return null;

      try {
        const result = await serviceRef.current.respondToHandoff(handoffId, currentUser.id, {
          accept: true,
        });

        if (result.success) {
          setPendingHandoffs((prev) => prev.filter((h) => h.id !== handoffId));
          return result.data;
        }
        setError(result.error?.message || 'Failed to accept handoff');
        return null;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to accept handoff');
        return null;
      }
    },
    [currentUser?.id]
  );

  const declineHandoff = useCallback(
    async (handoffId: string, reason?: string): Promise<boolean> => {
      if (!serviceRef.current || !currentUser?.id) return false;

      try {
        const result = await serviceRef.current.respondToHandoff(handoffId, currentUser.id, {
          accept: false,
          declinedReason: reason,
        });

        if (result.success) {
          setPendingHandoffs((prev) => prev.filter((h) => h.id !== handoffId));
          return true;
        }
        setError(result.error?.message || 'Failed to decline handoff');
        return false;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to decline handoff');
        return false;
      }
    },
    [currentUser?.id]
  );

  // ============================================================================
  // PHASE PLANNING
  // ============================================================================

  const createPlanningSession = useCallback(
    async (input: Omit<CreatePlanningSessionInput, 'appId' | 'teamId'>): Promise<PhasePlanningSession | null> => {
      if (!serviceRef.current || !currentUser?.id || !appId) return null;

      try {
        const result = await serviceRef.current.createPlanningSession(currentUser.id, {
          ...input,
          appId,
          teamId: teamId || undefined,
        });

        if (result.success) {
          setPlanningSession(result.data);
          return result.data;
        }
        setError(result.error?.message || 'Failed to create planning session');
        return null;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create planning session');
        return null;
      }
    },
    [appId, teamId, currentUser?.id]
  );

  const loadPlanningSession = useCallback(async () => {
    if (!serviceRef.current || !appId) return;

    setIsLoading(true);
    try {
      const result = await serviceRef.current.getPlanningSession(appId);
      if (result.success) {
        setPlanningSession(result.data);
      }
    } catch (err) {
      console.error('Error loading planning session:', err);
    } finally {
      setIsLoading(false);
    }
  }, [appId]);

  const addPhaseSuggestion = useCallback(
    async (input: CreatePhaseSuggestionInput): Promise<boolean> => {
      if (!serviceRef.current || !currentUser?.id || !planningSession) return false;

      try {
        const result = await serviceRef.current.addPhaseSuggestion(
          planningSession.id,
          currentUser.id,
          input
        );

        if (result.success) {
          await loadPlanningSession();
          return true;
        }
        setError(result.error?.message || 'Failed to add suggestion');
        return false;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add suggestion');
        return false;
      }
    },
    [planningSession, currentUser?.id, loadPlanningSession]
  );

  const votePlanningSession = useCallback(
    async (input: CastPlanningVoteInput): Promise<boolean> => {
      if (!serviceRef.current || !currentUser?.id || !planningSession) return false;

      try {
        const result = await serviceRef.current.votePlanningSession(
          planningSession.id,
          currentUser.id,
          input
        );

        if (result.success) {
          await loadPlanningSession();
          return true;
        }
        setError(result.error?.message || 'Failed to vote');
        return false;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to vote');
        return false;
      }
    },
    [planningSession, currentUser?.id, loadPlanningSession]
  );

  const updateProposedPhases = useCallback(
    async (phases: ProposedPhase[]): Promise<boolean> => {
      if (!serviceRef.current || !planningSession) return false;

      try {
        const result = await serviceRef.current.updateProposedPhases(planningSession.id, phases);

        if (result.success) {
          setPlanningSession(result.data);
          return true;
        }
        setError(result.error?.message || 'Failed to update phases');
        return false;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update phases');
        return false;
      }
    },
    [planningSession]
  );

  // ============================================================================
  // FEATURE OWNERSHIP
  // ============================================================================

  const assignFeatureOwner = useCallback(
    async (input: Omit<CreateFeatureOwnershipInput, 'appId' | 'teamId'>): Promise<FeatureOwnership | null> => {
      if (!serviceRef.current || !currentUser?.id || !appId) return null;

      try {
        const result = await serviceRef.current.assignFeatureOwner(currentUser.id, {
          ...input,
          appId,
          teamId: teamId || undefined,
        });

        if (result.success) {
          setFeatureOwnerships((prev) => {
            const existing = prev.findIndex((o) => o.featureName === input.featureName);
            if (existing >= 0) {
              const updated = [...prev];
              updated[existing] = result.data;
              return updated;
            }
            return [...prev, result.data];
          });
          return result.data;
        }
        setError(result.error?.message || 'Failed to assign owner');
        return null;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to assign owner');
        return null;
      }
    },
    [appId, teamId, currentUser?.id]
  );

  const loadFeatureOwnerships = useCallback(async () => {
    if (!serviceRef.current || !appId) return;

    setIsLoading(true);
    try {
      const result = await serviceRef.current.getFeatureOwnerships(appId);
      if (result.success) {
        setFeatureOwnerships(result.data);
      }
    } catch (err) {
      console.error('Error loading ownerships:', err);
    } finally {
      setIsLoading(false);
    }
  }, [appId]);

  const updateFeatureOwnership = useCallback(
    async (ownershipId: string, input: UpdateFeatureOwnershipInput): Promise<boolean> => {
      if (!serviceRef.current) return false;

      try {
        const result = await serviceRef.current.updateFeatureOwnership(ownershipId, input);

        if (result.success) {
          setFeatureOwnerships((prev) =>
            prev.map((o) => (o.id === ownershipId ? result.data : o))
          );
          return true;
        }
        setError(result.error?.message || 'Failed to update ownership');
        return false;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update ownership');
        return false;
      }
    },
    []
  );

  const getOwnedFeatures = useCallback(async (): Promise<FeatureOwnership[]> => {
    if (!serviceRef.current || !currentUser?.id) return [];

    try {
      const result = await serviceRef.current.getOwnedFeatures(currentUser.id);
      return result.success ? result.data : [];
    } catch (err) {
      console.error('Error getting owned features:', err);
      return [];
    }
  }, [currentUser?.id]);

  // ============================================================================
  // AI REVIEW WORKFLOW
  // ============================================================================

  const createReview = useCallback(
    async (input: Omit<CreateReviewRequestInput, 'appId' | 'teamId'>): Promise<AIReviewRequest | null> => {
      if (!serviceRef.current || !currentUser?.id || !appId) return null;

      try {
        const result = await serviceRef.current.createReviewRequest(currentUser.id, {
          ...input,
          appId,
          teamId: teamId || undefined,
        });

        if (result.success) {
          setReviews((prev) => [result.data, ...prev]);
          return result.data;
        }
        setError(result.error?.message || 'Failed to create review');
        return null;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create review');
        return null;
      }
    },
    [appId, teamId, currentUser?.id]
  );

  const loadReviews = useCallback(
    async (status?: string) => {
      if (!serviceRef.current || !appId) return;

      setIsLoading(true);
      try {
        const result = await serviceRef.current.getReviews({
          appId,
          status,
          limit: 50,
        });
        if (result.success) {
          setReviews(result.data);
        }
      } catch (err) {
        console.error('Error loading reviews:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [appId]
  );

  const submitReviewResponse = useCallback(
    async (reviewId: string, input: CreateReviewResponseInput): Promise<boolean> => {
      if (!serviceRef.current || !currentUser?.id) return false;

      try {
        const result = await serviceRef.current.submitReviewResponse(reviewId, currentUser.id, input);

        if (result.success) {
          await loadReviews();
          return true;
        }
        setError(result.error?.message || 'Failed to submit review');
        return false;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to submit review');
        return false;
      }
    },
    [currentUser?.id, loadReviews]
  );

  const applyReviewChanges = useCallback(
    async (reviewId: string): Promise<boolean> => {
      if (!serviceRef.current || !currentUser?.id) return false;

      try {
        const result = await serviceRef.current.applyReviewChanges(reviewId, currentUser.id);

        if (result.success) {
          setReviews((prev) =>
            prev.map((r) => (r.id === reviewId ? result.data : r))
          );
          return true;
        }
        setError(result.error?.message || 'Failed to apply changes');
        return false;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to apply changes');
        return false;
      }
    },
    [currentUser?.id]
  );

  const getMyReviews = useCallback(async (): Promise<AIReviewRequest[]> => {
    if (!serviceRef.current || !currentUser?.id) return [];

    try {
      const result = await serviceRef.current.getReviews({
        reviewerId: currentUser.id,
        status: 'pending',
      });
      return result.success ? result.data : [];
    } catch (err) {
      console.error('Error getting my reviews:', err);
      return [];
    }
  }, [currentUser?.id]);

  // ============================================================================
  // STATISTICS
  // ============================================================================

  const loadStats = useCallback(async () => {
    if (!serviceRef.current || !teamId) return;

    try {
      const result = await serviceRef.current.getStats(teamId, appId || undefined);
      if (result.success) {
        setStats(result.data);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }, [teamId, appId]);

  // ============================================================================
  // AUTO-LOAD EFFECTS
  // ============================================================================

  useEffect(() => {
    if (autoLoad && teamId) {
      loadTemplates();
      loadContexts();
      refreshCombinedContext();
    }
  }, [autoLoad, teamId, loadTemplates, loadContexts, refreshCombinedContext]);

  useEffect(() => {
    if (autoLoad && appId) {
      loadContributions();
      loadDecisions();
      loadPlanningSession();
      loadFeatureOwnerships();
      loadReviews();
    }
  }, [autoLoad, appId, loadContributions, loadDecisions, loadPlanningSession, loadFeatureOwnerships, loadReviews]);

  useEffect(() => {
    if (autoLoad && currentUser?.id) {
      loadPendingHandoffs();
    }
  }, [autoLoad, currentUser?.id, loadPendingHandoffs]);

  // Clear state when IDs change
  useEffect(() => {
    if (!teamId && !appId) {
      setContributions([]);
      setTemplates([]);
      setDecisions([]);
      setContexts([]);
      setPlanningSession(null);
      setFeatureOwnerships([]);
      setReviews([]);
      setStats(null);
      setCombinedContext('');
    }
  }, [teamId, appId]);

  return {
    // State
    contributions,
    templates,
    decisions,
    contexts,
    pendingHandoffs,
    planningSession,
    featureOwnerships,
    reviews,
    stats,
    isLoading,
    error,
    combinedContext,

    // Prompt Contributions
    recordContribution,
    loadContributions,

    // Prompt Templates
    createTemplate,
    loadTemplates,
    useTemplate,

    // AI Decisions
    createDecision,
    loadDecisions,
    castVote,
    applyDecision,

    // Shared AI Context
    createContext,
    updateContext,
    loadContexts,
    refreshCombinedContext,

    // Conversation Handoffs
    createHandoff,
    loadPendingHandoffs,
    acceptHandoff,
    declineHandoff,

    // Phase Planning
    createPlanningSession,
    loadPlanningSession,
    addPhaseSuggestion,
    votePlanningSession,
    updateProposedPhases,

    // Feature Ownership
    assignFeatureOwner,
    loadFeatureOwnerships,
    updateFeatureOwnership,
    getOwnedFeatures,

    // AI Review Workflow
    createReview,
    loadReviews,
    submitReviewResponse,
    applyReviewChanges,
    getMyReviews,

    // Statistics
    loadStats,
  };
}

export default useAICollaboration;
