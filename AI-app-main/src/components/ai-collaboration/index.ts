/**
 * AI Collaboration Components
 *
 * Comprehensive UI components for AI-centric team collaboration features.
 */

// Main Hub
export { default as AICollaborationHub } from './AICollaborationHub';

// AI Decision Voting
export { default as AIDecisionPanel } from './AIDecisionPanel';
export { default as AIDecisionCard } from './AIDecisionCard';
export { default as CreateDecisionModal } from './CreateDecisionModal';

// Shared AI Context
export { default as SharedContextPanel } from './SharedContextPanel';
export { default as SharedContextEditor } from './SharedContextEditor';

// Conversation Handoffs
export { default as HandoffPanel } from './HandoffPanel';
export { default as HandoffCard } from './HandoffCard';
export { default as CreateHandoffModal } from './CreateHandoffModal';

// Phase Planning
export { default as PhasePlanningPanel } from './PhasePlanningPanel';
export { default as PhaseSuggestionCard } from './PhaseSuggestionCard';
export { default as AddSuggestionModal } from './AddSuggestionModal';

// Feature Ownership
export { default as FeatureOwnershipPanel } from './FeatureOwnershipPanel';
export { default as AssignOwnerModal } from './AssignOwnerModal';

// AI Review Workflow
export { default as AIReviewPanel } from './AIReviewPanel';
export { default as ReviewRequestCard } from './ReviewRequestCard';
export { default as CreateReviewModal } from './CreateReviewModal';

// Prompt Templates
export { default as PromptTemplatesPanel } from './PromptTemplatesPanel';

// Notifications
export {
  default as CollaborationNotifications,
  NotificationBell,
} from './CollaborationNotifications';
export type {
  CollaborationNotification,
  NotificationType,
} from './CollaborationNotifications';
