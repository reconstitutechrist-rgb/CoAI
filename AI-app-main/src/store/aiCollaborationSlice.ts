/**
 * AI Collaboration Zustand Store Slice
 *
 * State management for AI collaboration features.
 */

import { StateCreator } from 'zustand';
import type {
  AIDecision,
  SharedAIContext,
  AIConversationHandoff,
  PhasePlanningSession,
  FeatureOwnership,
  AIReviewRequest,
  BuilderMode,
} from '@/types/aiCollaboration';

/**
 * AI Collaboration state
 */
export interface AICollaborationState {
  // Current context
  activeTeamId: string | null;
  activeAppId: string | null;

  // AI collaboration data
  decisions: AIDecision[];
  contexts: SharedAIContext[];
  handoffs: AIConversationHandoff[];
  planningSession: PhasePlanningSession | null;
  featureOwnerships: FeatureOwnership[];
  reviews: AIReviewRequest[];

  // Combined AI context string
  combinedAIContext: string;

  // Current builder state (for handoffs)
  currentMode: BuilderMode;
  currentPhase: string | null;
  conversationSnapshot: unknown | null;

  // UI state
  collaborationPanelOpen: boolean;
  activeCollaborationTab: string;

  // Notification counts
  pendingDecisions: number;
  pendingHandoffs: number;
  pendingReviews: number;
}

/**
 * AI Collaboration actions
 */
export interface AICollaborationActions {
  // Context setters
  setActiveTeamId: (teamId: string | null) => void;
  setActiveAppId: (appId: string | null) => void;

  // Data setters
  setDecisions: (decisions: AIDecision[]) => void;
  addDecision: (decision: AIDecision) => void;
  updateDecision: (id: string, updates: Partial<AIDecision>) => void;
  removeDecision: (id: string) => void;

  setContexts: (contexts: SharedAIContext[]) => void;
  addContext: (context: SharedAIContext) => void;
  updateContext: (id: string, updates: Partial<SharedAIContext>) => void;
  removeContext: (id: string) => void;

  setHandoffs: (handoffs: AIConversationHandoff[]) => void;
  addHandoff: (handoff: AIConversationHandoff) => void;
  updateHandoff: (id: string, updates: Partial<AIConversationHandoff>) => void;
  removeHandoff: (id: string) => void;

  setPlanningSession: (session: PhasePlanningSession | null) => void;
  updatePlanningSession: (updates: Partial<PhasePlanningSession>) => void;

  setFeatureOwnerships: (ownerships: FeatureOwnership[]) => void;
  addFeatureOwnership: (ownership: FeatureOwnership) => void;
  updateFeatureOwnership: (id: string, updates: Partial<FeatureOwnership>) => void;
  removeFeatureOwnership: (id: string) => void;

  setReviews: (reviews: AIReviewRequest[]) => void;
  addReview: (review: AIReviewRequest) => void;
  updateReview: (id: string, updates: Partial<AIReviewRequest>) => void;
  removeReview: (id: string) => void;

  // Combined context
  setCombinedAIContext: (context: string) => void;

  // Builder state (for handoffs)
  setCurrentMode: (mode: BuilderMode) => void;
  setCurrentPhase: (phase: string | null) => void;
  setConversationSnapshot: (snapshot: unknown | null) => void;

  // UI state
  setCollaborationPanelOpen: (open: boolean) => void;
  toggleCollaborationPanel: () => void;
  setActiveCollaborationTab: (tab: string) => void;

  // Notification counts
  updateNotificationCounts: () => void;

  // Clear all collaboration state
  clearCollaborationState: () => void;
}

export type AICollaborationSlice = AICollaborationState & AICollaborationActions;

/**
 * Initial state
 */
const initialState: AICollaborationState = {
  activeTeamId: null,
  activeAppId: null,
  decisions: [],
  contexts: [],
  handoffs: [],
  planningSession: null,
  featureOwnerships: [],
  reviews: [],
  combinedAIContext: '',
  currentMode: 'plan',
  currentPhase: null,
  conversationSnapshot: null,
  collaborationPanelOpen: false,
  activeCollaborationTab: 'decisions',
  pendingDecisions: 0,
  pendingHandoffs: 0,
  pendingReviews: 0,
};

/**
 * Create AI Collaboration slice
 */
export const createAICollaborationSlice: StateCreator<
  AICollaborationSlice,
  [],
  [],
  AICollaborationSlice
> = (set, get) => ({
  ...initialState,

  // Context setters
  setActiveTeamId: (teamId) => set({ activeTeamId: teamId }),
  setActiveAppId: (appId) => set({ activeAppId: appId }),

  // Decisions
  setDecisions: (decisions) => {
    set({ decisions });
    get().updateNotificationCounts();
  },
  addDecision: (decision) => {
    set((state) => ({ decisions: [decision, ...state.decisions] }));
    get().updateNotificationCounts();
  },
  updateDecision: (id, updates) => {
    set((state) => ({
      decisions: state.decisions.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
    }));
    get().updateNotificationCounts();
  },
  removeDecision: (id) => {
    set((state) => ({
      decisions: state.decisions.filter((d) => d.id !== id),
    }));
    get().updateNotificationCounts();
  },

  // Contexts
  setContexts: (contexts) => set({ contexts }),
  addContext: (context) => {
    set((state) => ({ contexts: [context, ...state.contexts] }));
  },
  updateContext: (id, updates) => {
    set((state) => ({
      contexts: state.contexts.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
  },
  removeContext: (id) => {
    set((state) => ({
      contexts: state.contexts.filter((c) => c.id !== id),
    }));
  },

  // Handoffs
  setHandoffs: (handoffs) => {
    set({ handoffs });
    get().updateNotificationCounts();
  },
  addHandoff: (handoff) => {
    set((state) => ({ handoffs: [handoff, ...state.handoffs] }));
    get().updateNotificationCounts();
  },
  updateHandoff: (id, updates) => {
    set((state) => ({
      handoffs: state.handoffs.map((h) =>
        h.id === id ? { ...h, ...updates } : h
      ),
    }));
    get().updateNotificationCounts();
  },
  removeHandoff: (id) => {
    set((state) => ({
      handoffs: state.handoffs.filter((h) => h.id !== id),
    }));
    get().updateNotificationCounts();
  },

  // Planning session
  setPlanningSession: (session) => set({ planningSession: session }),
  updatePlanningSession: (updates) => {
    set((state) => ({
      planningSession: state.planningSession
        ? { ...state.planningSession, ...updates }
        : null,
    }));
  },

  // Feature ownerships
  setFeatureOwnerships: (ownerships) => set({ featureOwnerships: ownerships }),
  addFeatureOwnership: (ownership) => {
    set((state) => ({
      featureOwnerships: [ownership, ...state.featureOwnerships],
    }));
  },
  updateFeatureOwnership: (id, updates) => {
    set((state) => ({
      featureOwnerships: state.featureOwnerships.map((o) =>
        o.id === id ? { ...o, ...updates } : o
      ),
    }));
  },
  removeFeatureOwnership: (id) => {
    set((state) => ({
      featureOwnerships: state.featureOwnerships.filter((o) => o.id !== id),
    }));
  },

  // Reviews
  setReviews: (reviews) => {
    set({ reviews });
    get().updateNotificationCounts();
  },
  addReview: (review) => {
    set((state) => ({ reviews: [review, ...state.reviews] }));
    get().updateNotificationCounts();
  },
  updateReview: (id, updates) => {
    set((state) => ({
      reviews: state.reviews.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    }));
    get().updateNotificationCounts();
  },
  removeReview: (id) => {
    set((state) => ({
      reviews: state.reviews.filter((r) => r.id !== id),
    }));
    get().updateNotificationCounts();
  },

  // Combined context
  setCombinedAIContext: (context) => set({ combinedAIContext: context }),

  // Builder state
  setCurrentMode: (mode) => set({ currentMode: mode }),
  setCurrentPhase: (phase) => set({ currentPhase: phase }),
  setConversationSnapshot: (snapshot) => set({ conversationSnapshot: snapshot }),

  // UI state
  setCollaborationPanelOpen: (open) => set({ collaborationPanelOpen: open }),
  toggleCollaborationPanel: () => {
    set((state) => ({ collaborationPanelOpen: !state.collaborationPanelOpen }));
  },
  setActiveCollaborationTab: (tab) => set({ activeCollaborationTab: tab }),

  // Update notification counts
  updateNotificationCounts: () => {
    const state = get();
    set({
      pendingDecisions: state.decisions.filter((d) => d.status === 'pending').length,
      pendingHandoffs: state.handoffs.filter(
        (h) => h.status === 'pending'
      ).length,
      pendingReviews: state.reviews.filter(
        (r) => r.status === 'pending' || r.status === 'in_review'
      ).length,
    });
  },

  // Clear all state
  clearCollaborationState: () => set(initialState),
});

/**
 * Helper selectors
 */
export const aiCollaborationSelectors = {
  // Get total pending notifications
  getTotalPendingCount: (state: AICollaborationSlice) =>
    state.pendingDecisions + state.pendingHandoffs + state.pendingReviews,

  // Get decisions for current app
  getAppDecisions: (state: AICollaborationSlice) =>
    state.decisions.filter((d) => d.appId === state.activeAppId),

  // Get active contexts
  getActiveContexts: (state: AICollaborationSlice) =>
    state.contexts.filter((c) => c.isActive),

  // Get pending handoffs for a user
  getPendingHandoffsForUser: (state: AICollaborationSlice, userId: string) =>
    state.handoffs.filter(
      (h) => h.toUserId === userId && h.status === 'pending'
    ),

  // Get reviews awaiting user response
  getReviewsAwaitingResponse: (state: AICollaborationSlice, userId: string) =>
    state.reviews.filter(
      (r) =>
        r.assignedReviewers.includes(userId) &&
        (r.status === 'pending' || r.status === 'in_review') &&
        !r.responses?.some((resp) => resp.reviewerId === userId)
    ),

  // Get owned features for a user
  getOwnedFeatures: (state: AICollaborationSlice, userId: string) =>
    state.featureOwnerships.filter((o) => o.ownerId === userId),
};
