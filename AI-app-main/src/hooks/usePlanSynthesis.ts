/**
 * usePlanSynthesis Hook - Plan Synthesis Management
 *
 * Provides functionality for managing project briefs and plan synthesis.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTeam } from '@/hooks/useTeam';
import type {
  ProjectBrief,
  PlanSynthesisResult,
  CreateProjectBriefInput,
  UpdateProjectBriefInput,
  DesiredFeature,
  FeaturePriority,
  PlanConflict,
} from '@/types/projectIntegration';

// ============================================================================
// TYPES
// ============================================================================

export interface UsePlanSynthesisOptions {
  /** Team ID (required) */
  teamId: string | null;
  /** Whether to auto-load on mount */
  autoLoad?: boolean;
}

export interface UsePlanSynthesisReturn {
  // Project Brief
  projectBrief: ProjectBrief | null;
  canEditBrief: boolean;
  isLoadingBrief: boolean;
  briefError: string | null;

  // Brief actions
  createBrief: (input: Omit<CreateProjectBriefInput, 'teamId'>) => Promise<boolean>;
  updateBrief: (updates: UpdateProjectBriefInput) => Promise<boolean>;
  deleteBrief: () => Promise<boolean>;
  refreshBrief: () => Promise<void>;

  // Synthesis
  synthesis: PlanSynthesisResult | null;
  isSynthesizing: boolean;
  isLoadingSynthesis: boolean;
  synthesisError: string | null;

  // Synthesis actions
  triggerSynthesis: (forceRefresh?: boolean) => Promise<boolean>;
  refreshSynthesis: () => Promise<void>;

  // Gap actions
  isExecutingAction: boolean;
  actionError: string | null;
  createTaskFromGap: (input: GapTaskInput) => Promise<{ success: boolean; taskId?: string }>;
  assignFeatureOwner: (input: AssignFeatureOwnerInput) => Promise<{ success: boolean; ownershipId?: string }>;
  getDebatePromptForConflict: (conflict: PlanConflict) => Promise<{ success: boolean; debatePrompt?: DebatePrompt }>;

  // Computed
  hasProjectBrief: boolean;
  hasSynthesis: boolean;
  completionPercentage: number;
  gapsCount: number;
  conflictsCount: number;
  readyToBuild: boolean;
}

// Gap action input types
// Note: Named differently from projectIntegration.ts CreateTaskFromGapInput to avoid collision
export interface GapTaskInput {
  appId?: string;
  gapType: 'missing-feature' | 'incomplete-area';
  featureName: string;
  description: string;
  priority: FeaturePriority;
  assigneeId?: string;
}

export interface AssignFeatureOwnerInput {
  appId: string;
  featureName: string;
  featureDescription?: string;
  ownerId: string;
  phaseNumber?: number;
}

export interface DebatePrompt {
  question: string;
  context: string;
  style: 'cooperative' | 'adversarial';
}

// ============================================================================
// HOOK
// ============================================================================

export function usePlanSynthesis(options: UsePlanSynthesisOptions): UsePlanSynthesisReturn {
  const { teamId, autoLoad = true } = options;
  const { user } = useAuth();
  const { team, members } = useTeam({ teamId });

  // Project Brief state
  const [projectBrief, setProjectBrief] = useState<ProjectBrief | null>(null);
  const [isLoadingBrief, setIsLoadingBrief] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);

  // Synthesis state
  const [synthesis, setSynthesis] = useState<PlanSynthesisResult | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isLoadingSynthesis, setIsLoadingSynthesis] = useState(false);
  const [synthesisError, setSynthesisError] = useState<string | null>(null);

  // Gap action state
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Track initialization
  const initialized = useRef(false);

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  // Check if current user can edit the brief (owner or admin)
  const canEditBrief = Boolean(
    user &&
      members?.some(
        (m) => m.userId === user.id && m.status === 'active' && ['owner', 'admin'].includes(m.role)
      )
  );

  const hasProjectBrief = projectBrief !== null;
  const hasSynthesis = synthesis !== null;
  const completionPercentage = synthesis?.gapAnalysis?.completionPercentage || 0;
  const gapsCount =
    (synthesis?.gapAnalysis?.missingFeatures?.length || 0) +
    (synthesis?.gapAnalysis?.incompleteAreas?.length || 0);
  const conflictsCount = synthesis?.gapAnalysis?.conflicts?.length || 0;
  const readyToBuild = synthesis?.gapAnalysis?.readyToBuild || false;

  // ==========================================================================
  // PROJECT BRIEF ACTIONS
  // ==========================================================================

  /**
   * Load project brief
   */
  const loadBrief = useCallback(async () => {
    if (!teamId) return;

    setIsLoadingBrief(true);
    setBriefError(null);

    try {
      const response = await fetch(`/api/project-brief?teamId=${teamId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load project brief');
      }

      setProjectBrief(data.projectBrief);
    } catch (err) {
      setBriefError(err instanceof Error ? err.message : 'Failed to load project brief');
    } finally {
      setIsLoadingBrief(false);
    }
  }, [teamId]);

  /**
   * Create project brief
   */
  const createBrief = useCallback(
    async (input: Omit<CreateProjectBriefInput, 'teamId'>): Promise<boolean> => {
      if (!teamId || !user) return false;

      setIsLoadingBrief(true);
      setBriefError(null);

      try {
        const response = await fetch('/api/project-brief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...input, teamId }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create project brief');
        }

        setProjectBrief(data.projectBrief);
        return true;
      } catch (err) {
        setBriefError(err instanceof Error ? err.message : 'Failed to create project brief');
        return false;
      } finally {
        setIsLoadingBrief(false);
      }
    },
    [teamId, user]
  );

  /**
   * Update project brief
   */
  const updateBrief = useCallback(
    async (updates: UpdateProjectBriefInput): Promise<boolean> => {
      if (!teamId || !projectBrief) return false;

      setIsLoadingBrief(true);
      setBriefError(null);

      try {
        const response = await fetch('/api/project-brief', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...updates, teamId, briefId: projectBrief.id }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to update project brief');
        }

        setProjectBrief(data.projectBrief);
        return true;
      } catch (err) {
        setBriefError(err instanceof Error ? err.message : 'Failed to update project brief');
        return false;
      } finally {
        setIsLoadingBrief(false);
      }
    },
    [teamId, projectBrief]
  );

  /**
   * Delete project brief
   */
  const deleteBrief = useCallback(async (): Promise<boolean> => {
    if (!teamId || !projectBrief) return false;

    setIsLoadingBrief(true);
    setBriefError(null);

    try {
      const response = await fetch(
        `/api/project-brief?teamId=${teamId}&briefId=${projectBrief.id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete project brief');
      }

      setProjectBrief(null);
      setSynthesis(null); // Clear synthesis when brief is deleted
      return true;
    } catch (err) {
      setBriefError(err instanceof Error ? err.message : 'Failed to delete project brief');
      return false;
    } finally {
      setIsLoadingBrief(false);
    }
  }, [teamId, projectBrief]);

  /**
   * Refresh project brief
   */
  const refreshBrief = useCallback(async () => {
    await loadBrief();
  }, [loadBrief]);

  // ==========================================================================
  // SYNTHESIS ACTIONS
  // ==========================================================================

  /**
   * Load latest synthesis
   */
  const loadSynthesis = useCallback(async () => {
    if (!teamId) return;

    setIsLoadingSynthesis(true);
    setSynthesisError(null);

    try {
      const response = await fetch(`/api/plan-synthesis?teamId=${teamId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load synthesis');
      }

      setSynthesis(data.synthesis);
    } catch (err) {
      setSynthesisError(err instanceof Error ? err.message : 'Failed to load synthesis');
    } finally {
      setIsLoadingSynthesis(false);
    }
  }, [teamId]);

  /**
   * Trigger new synthesis
   */
  const triggerSynthesis = useCallback(
    async (forceRefresh = false): Promise<boolean> => {
      if (!teamId) return false;

      setIsSynthesizing(true);
      setSynthesisError(null);

      try {
        const response = await fetch('/api/plan-synthesis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamId, forceRefresh }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || data.error || 'Failed to synthesize plan');
        }

        setSynthesis(data.synthesis);
        return true;
      } catch (err) {
        setSynthesisError(err instanceof Error ? err.message : 'Failed to synthesize plan');
        return false;
      } finally {
        setIsSynthesizing(false);
      }
    },
    [teamId]
  );

  /**
   * Refresh synthesis
   */
  const refreshSynthesis = useCallback(async () => {
    await loadSynthesis();
  }, [loadSynthesis]);

  // ==========================================================================
  // GAP ACTION METHODS
  // ==========================================================================

  /**
   * Create a task from a gap (missing feature or incomplete area)
   */
  const createTaskFromGap = useCallback(
    async (input: GapTaskInput): Promise<{ success: boolean; taskId?: string }> => {
      if (!teamId || !synthesis) {
        return { success: false };
      }

      setIsExecutingAction(true);
      setActionError(null);

      try {
        const response = await fetch('/api/plan-synthesis/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create-task',
            teamId,
            synthesisId: synthesis.id,
            ...input,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || data.error || 'Failed to create task');
        }

        return { success: true, taskId: data.taskId };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create task';
        setActionError(errorMessage);
        return { success: false };
      } finally {
        setIsExecutingAction(false);
      }
    },
    [teamId, synthesis]
  );

  /**
   * Assign a feature to a team member
   */
  const assignFeatureOwner = useCallback(
    async (input: AssignFeatureOwnerInput): Promise<{ success: boolean; ownershipId?: string }> => {
      if (!teamId) {
        return { success: false };
      }

      setIsExecutingAction(true);
      setActionError(null);

      try {
        const response = await fetch('/api/plan-synthesis/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'assign-owner',
            teamId,
            ...input,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || data.error || 'Failed to assign owner');
        }

        return { success: true, ownershipId: data.ownershipId };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to assign owner';
        setActionError(errorMessage);
        return { success: false };
      } finally {
        setIsExecutingAction(false);
      }
    },
    [teamId]
  );

  /**
   * Get debate prompt for a conflict
   */
  const getDebatePromptForConflict = useCallback(
    async (conflict: PlanConflict): Promise<{ success: boolean; debatePrompt?: DebatePrompt }> => {
      setIsExecutingAction(true);
      setActionError(null);

      try {
        const response = await fetch('/api/plan-synthesis/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get-debate-prompt',
            conflict,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || data.error || 'Failed to get debate prompt');
        }

        return { success: true, debatePrompt: data.debatePrompt };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get debate prompt';
        setActionError(errorMessage);
        return { success: false };
      } finally {
        setIsExecutingAction(false);
      }
    },
    []
  );

  // ==========================================================================
  // EFFECTS
  // ==========================================================================

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad && teamId && !initialized.current) {
      initialized.current = true;
      loadBrief();
      loadSynthesis();
    }
  }, [autoLoad, teamId, loadBrief, loadSynthesis]);

  // Reset when team changes
  useEffect(() => {
    if (teamId) {
      initialized.current = false;
      setProjectBrief(null);
      setSynthesis(null);
      setBriefError(null);
      setSynthesisError(null);
    }
  }, [teamId]);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // Project Brief
    projectBrief,
    canEditBrief,
    isLoadingBrief,
    briefError,

    // Brief actions
    createBrief,
    updateBrief,
    deleteBrief,
    refreshBrief,

    // Synthesis
    synthesis,
    isSynthesizing,
    isLoadingSynthesis,
    synthesisError,

    // Synthesis actions
    triggerSynthesis,
    refreshSynthesis,

    // Gap actions
    isExecutingAction,
    actionError,
    createTaskFromGap,
    assignFeatureOwner,
    getDebatePromptForConflict,

    // Computed
    hasProjectBrief,
    hasSynthesis,
    completionPercentage,
    gapsCount,
    conflictsCount,
    readyToBuild,
  };
}

export default usePlanSynthesis;
