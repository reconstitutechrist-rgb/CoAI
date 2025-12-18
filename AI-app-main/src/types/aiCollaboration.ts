/**
 * AI Collaboration Type Definitions
 *
 * Types for team AI collaboration features:
 * - Collaborative AI Prompting (attribution, templates)
 * - AI Decision Voting
 * - Shared AI Context
 * - AI Handoffs
 * - Collaborative Phase Planning
 * - Feature Ownership
 * - AI Review Workflow
 *
 * @module aiCollaboration
 */

import type { UserInfo } from "./collaboration";

// ============================================================================
// COMMON TYPES
// ============================================================================

export type BuilderMode = "plan" | "act" | "layout";

// ============================================================================
// 1. AI PROMPT CONTRIBUTIONS & ATTRIBUTION
// ============================================================================

export type PromptType =
  | "message"
  | "instruction"
  | "correction"
  | "clarification"
  | "template";

export interface AIPromptContribution {
  id: string;
  appId: string;
  teamId?: string;
  userId: string;

  // Prompt content
  promptText: string;
  promptType: PromptType;

  // Context
  mode: BuilderMode;
  phaseNumber?: number;

  // AI Response tracking
  aiResponseId?: string;
  aiResponseSummary?: string;
  tokensUsed?: number;

  // Impact tracking
  resultedInCodeChange: boolean;
  filesAffected: string[];
  featuresAffected: string[];

  createdAt: string;

  // Joined
  user?: UserInfo;
}

export interface CreatePromptContributionInput {
  appId: string;
  teamId?: string;
  promptText: string;
  promptType?: PromptType;
  mode: BuilderMode;
  phaseNumber?: number;
}

export interface UpdatePromptContributionInput {
  aiResponseId?: string;
  aiResponseSummary?: string;
  tokensUsed?: number;
  resultedInCodeChange?: boolean;
  filesAffected?: string[];
  featuresAffected?: string[];
}

// ============================================================================
// 2. SHARED PROMPT TEMPLATES
// ============================================================================

export type TemplateCategory =
  | "general"
  | "feature"
  | "bugfix"
  | "design"
  | "refactor"
  | "documentation";

export interface TemplateVariable {
  name: string;
  description: string;
  required: boolean;
  defaultValue?: string;
}

export interface SharedPromptTemplate {
  id: string;
  teamId: string;
  createdBy: string;

  name: string;
  description?: string;
  templateText: string;
  category: TemplateCategory;
  variables: TemplateVariable[];

  useCount: number;
  lastUsedAt?: string;
  lastUsedBy?: string;

  isPublic: boolean;

  createdAt: string;
  updatedAt: string;

  // Joined
  creator?: UserInfo;
}

export interface CreatePromptTemplateInput {
  name: string;
  description?: string;
  templateText: string;
  category?: TemplateCategory;
  variables?: TemplateVariable[];
  isPublic?: boolean;
}

export interface UpdatePromptTemplateInput {
  name?: string;
  description?: string;
  templateText?: string;
  category?: TemplateCategory;
  variables?: TemplateVariable[];
  isPublic?: boolean;
}

// ============================================================================
// 3. AI DECISION VOTING
// ============================================================================

export type DecisionType =
  | "feature"
  | "design"
  | "architecture"
  | "code_change"
  | "phase_plan"
  | "other";
export type VotingType = "majority" | "unanimous" | "threshold";
export type DecisionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "withdrawn";
export type VoteChoice = "approve" | "reject" | "abstain" | "request_changes";

export interface AIAlternative {
  index: number;
  description: string;
  code?: string;
  reasoning?: string;
}

export interface AIDecision {
  id: string;
  appId: string;
  teamId?: string;
  createdBy: string;

  title: string;
  description?: string;
  decisionType: DecisionType;

  // AI suggestion
  aiSuggestion: string;
  aiReasoning?: string;
  aiAlternatives: AIAlternative[];

  // Context
  mode: BuilderMode;
  phaseNumber?: number;
  relatedFeatures: string[];

  // Code preview
  codePreview?: string;
  filesAffected: string[];

  // Voting config
  votingType: VotingType;
  votingThreshold: number;
  requiredVoters: string[];
  votingDeadline?: string;

  // Status
  status: DecisionStatus;
  resolvedAt?: string;
  resolvedBy?: string;

  // Result
  finalDecision?: string;
  appliedAt?: string;

  createdAt: string;
  updatedAt: string;

  // Joined
  creator?: UserInfo;
  votes?: AIDecisionVote[];
  voteCount?: {
    approve: number;
    reject: number;
    abstain: number;
    requestChanges: number;
    total: number;
  };
}

export interface AIDecisionVote {
  id: string;
  decisionId: string;
  userId: string;

  vote: VoteChoice;
  selectedAlternative?: number;

  comment?: string;
  requestedChanges?: string;

  createdAt: string;
  updatedAt: string;

  // Joined
  user?: UserInfo;
}

export interface CreateAIDecisionInput {
  appId: string;
  teamId?: string;
  title: string;
  description?: string;
  decisionType: DecisionType;
  aiSuggestion: string;
  aiReasoning?: string;
  aiAlternatives?: AIAlternative[];
  mode: BuilderMode;
  phaseNumber?: number;
  relatedFeatures?: string[];
  codePreview?: string;
  filesAffected?: string[];
  votingType?: VotingType;
  votingThreshold?: number;
  requiredVoters?: string[];
  votingDeadlineHours?: number;
}

export interface CastVoteInput {
  vote: VoteChoice;
  selectedAlternative?: number;
  comment?: string;
  requestedChanges?: string;
}

// ============================================================================
// 4. SHARED AI CONTEXT
// ============================================================================

export type AIContextType =
  | "coding_standards"
  | "design_guidelines"
  | "business_rules"
  | "terminology"
  | "constraints"
  | "preferences"
  | "learned_patterns"
  | "custom";

export interface SharedAIContext {
  id: string;
  teamId: string;
  appId?: string;

  contextType: AIContextType;
  title: string;
  content: string;
  priority: number;

  isAutoLearned: boolean;
  learnedFromContributionId?: string;

  isActive: boolean;

  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;

  // Joined
  creator?: UserInfo;
}

export interface CreateAIContextInput {
  appId?: string;
  contextType: AIContextType;
  title: string;
  content: string;
  priority?: number;
}

export interface UpdateAIContextInput {
  title?: string;
  content?: string;
  contextType?: AIContextType;
  priority?: number;
  isActive?: boolean;
}

// ============================================================================
// 5. AI CONVERSATION HANDOFFS
// ============================================================================

export type HandoffStatus = "pending" | "accepted" | "declined" | "expired";

export interface AIConversationHandoff {
  id: string;
  appId: string;
  teamId?: string;

  fromUserId: string;
  toUserId: string;

  // Conversation state
  conversationSnapshot: unknown; // ChatMessage[]
  mode: BuilderMode;
  wizardState?: unknown;
  currentPhase?: number;

  // Context
  handoffReason?: string;
  handoffNotes?: string;
  focusAreas: string[];

  // Status
  status: HandoffStatus;
  acceptedAt?: string;
  declinedReason?: string;

  expiresAt: string;
  createdAt: string;

  // Joined
  fromUser?: UserInfo;
  toUser?: UserInfo;
}

export interface CreateHandoffInput {
  appId: string;
  teamId?: string;
  toUserId: string;
  conversationSnapshot: unknown;
  mode: BuilderMode;
  wizardState?: unknown;
  currentPhase?: number;
  handoffReason?: string;
  handoffNotes?: string;
  focusAreas?: string[];
  expiresInHours?: number;
}

export interface RespondToHandoffInput {
  accept: boolean;
  declinedReason?: string;
}

// ============================================================================
// 6. COLLABORATIVE PHASE PLANNING
// ============================================================================

export type PlanningSessionStatus =
  | "draft"
  | "in_review"
  | "voting"
  | "approved"
  | "building";
export type ApprovalType = "majority" | "unanimous" | "owner_only";
export type SuggestionType =
  | "add_phase"
  | "remove_phase"
  | "reorder_phases"
  | "edit_phase"
  | "merge_phases"
  | "split_phase"
  | "add_feature"
  | "remove_feature"
  | "move_feature"
  | "comment";
export type SuggestionStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "superseded";
export type PlanningVote = "approve" | "reject" | "request_changes";

export interface ProposedPhase {
  number: number;
  name: string;
  description: string;
  features: string[];
  dependencies: number[];
  estimatedTokens?: number;
  assignedTo?: string;
}

export interface PhasePlanningSession {
  id: string;
  appId: string;
  teamId?: string;
  createdBy: string;

  name: string;
  description?: string;

  status: PlanningSessionStatus;

  proposedPhases: ProposedPhase[];
  aiGeneratedPlan?: ProposedPhase[];

  requiresApproval: boolean;
  approvalType: ApprovalType;
  approvedAt?: string;
  approvedBy?: string;

  executionStartedAt?: string;
  currentPhase?: number;

  createdAt: string;
  updatedAt: string;

  // Joined
  creator?: UserInfo;
  suggestions?: PhaseSuggestion[];
  votes?: PhasePlanningVote[];
  voteCount?: {
    approve: number;
    reject: number;
    requestChanges: number;
    total: number;
  };
}

export interface PhaseSuggestion {
  id: string;
  sessionId: string;
  userId: string;

  suggestionType: SuggestionType;
  targetPhaseNumber?: number;
  targetFeature?: string;

  suggestionData: Record<string, unknown>;
  reason?: string;

  status: SuggestionStatus;
  resolvedBy?: string;
  resolvedAt?: string;

  createdAt: string;

  // Joined
  user?: UserInfo;
}

export interface PhasePlanningVote {
  id: string;
  sessionId: string;
  userId: string;

  vote: PlanningVote;
  feedback?: string;

  createdAt: string;

  // Joined
  user?: UserInfo;
}

export interface CreatePlanningSessionInput {
  appId: string;
  teamId?: string;
  name?: string;
  description?: string;
  proposedPhases: ProposedPhase[];
  aiGeneratedPlan?: ProposedPhase[];
  requiresApproval?: boolean;
  approvalType?: ApprovalType;
}

export interface CreatePhaseSuggestionInput {
  suggestionType: SuggestionType;
  targetPhaseNumber?: number;
  targetFeature?: string;
  suggestionData: Record<string, unknown>;
  reason?: string;
}

export interface CastPlanningVoteInput {
  vote: PlanningVote;
  feedback?: string;
}

// ============================================================================
// 7. FEATURE OWNERSHIP
// ============================================================================

export type OwnershipResponsibility =
  | "review"
  | "approve"
  | "test"
  | "document";
export type OwnershipStatus =
  | "assigned"
  | "in_progress"
  | "review"
  | "approved"
  | "completed";

export interface FeatureOwnership {
  id: string;
  appId: string;
  teamId?: string;

  featureName: string;
  featureDescription?: string;
  phaseNumber?: number;

  ownerId: string;
  assignedBy: string;

  responsibilities: OwnershipResponsibility[];

  status: OwnershipStatus;

  requiresOwnerApproval: boolean;
  ownerApprovedAt?: string;
  ownerFeedback?: string;

  createdAt: string;
  updatedAt: string;

  // Joined
  owner?: UserInfo;
  assigner?: UserInfo;
}

export interface CreateFeatureOwnershipInput {
  appId: string;
  teamId?: string;
  featureName: string;
  featureDescription?: string;
  phaseNumber?: number;
  ownerId: string;
  responsibilities?: OwnershipResponsibility[];
  requiresOwnerApproval?: boolean;
}

export interface UpdateFeatureOwnershipInput {
  featureDescription?: string;
  responsibilities?: OwnershipResponsibility[];
  status?: OwnershipStatus;
  requiresOwnerApproval?: boolean;
  ownerFeedback?: string;
}

// ============================================================================
// 8. AI REVIEW WORKFLOW
// ============================================================================

export type ReviewType = "code" | "design" | "feature" | "phase" | "full_build";
export type ReviewStatus =
  | "pending"
  | "in_review"
  | "changes_requested"
  | "approved"
  | "rejected"
  | "applied"
  | "expired";
export type ReviewDecision =
  | "approve"
  | "request_changes"
  | "reject"
  | "comment_only";

export interface FileChange {
  path: string;
  content: string;
  language?: string;
}

export interface InlineComment {
  file: string;
  line: number;
  comment: string;
  severity: "info" | "warning" | "error";
}

export interface RequestedChange {
  description: string;
  priority: "low" | "medium" | "high";
  resolved: boolean;
}

export interface AIReviewRequest {
  id: string;
  appId: string;
  teamId?: string;
  createdBy: string;

  title: string;
  description?: string;
  reviewType: ReviewType;

  // AI output
  aiOutput: unknown;
  aiPrompt?: string;
  aiReasoning?: string;

  // Context
  mode: BuilderMode;
  phaseNumber?: number;
  relatedFeatures: string[];

  // Files
  filesToAdd: FileChange[];
  filesToModify: FileChange[];
  filesToDelete: string[];

  // Preview
  previewUrl?: string;
  sandboxId?: string;

  // Assignment
  assignedReviewers: string[];
  requiredApprovals: number;
  autoAssignFeatureOwners: boolean;

  // Status
  status: ReviewStatus;
  resolvedAt?: string;
  appliedAt?: string;
  appliedBy?: string;

  expiresAt?: string;

  createdAt: string;
  updatedAt: string;

  // Joined
  creator?: UserInfo;
  reviewers?: UserInfo[];
  responses?: AIReviewResponse[];
  approvalCount?: number;
}

export interface AIReviewResponse {
  id: string;
  reviewRequestId: string;
  reviewerId: string;

  decision: ReviewDecision;

  overallFeedback?: string;
  inlineComments: InlineComment[];
  requestedChanges: RequestedChange[];

  requestAIRevision: boolean;
  aiRevisionPrompt?: string;

  createdAt: string;
  updatedAt: string;

  // Joined
  reviewer?: UserInfo;
}

export interface CreateReviewRequestInput {
  appId: string;
  teamId?: string;
  title: string;
  description?: string;
  reviewType: ReviewType;
  aiOutput: unknown;
  aiPrompt?: string;
  aiReasoning?: string;
  mode: BuilderMode;
  phaseNumber?: number;
  relatedFeatures?: string[];
  filesToAdd?: FileChange[];
  filesToModify?: FileChange[];
  filesToDelete?: string[];
  assignedReviewers?: string[];
  requiredApprovals?: number;
  autoAssignFeatureOwners?: boolean;
  expiresInHours?: number;
}

export interface CreateReviewResponseInput {
  decision: ReviewDecision;
  overallFeedback?: string;
  inlineComments?: InlineComment[];
  requestedChanges?: RequestedChange[];
  requestAIRevision?: boolean;
  aiRevisionPrompt?: string;
}

// ============================================================================
// 9. NOTIFICATION PREFERENCES
// ============================================================================

export type EmailDigestFrequency = "instant" | "hourly" | "daily" | "weekly";

export interface AICollaborationNotifications {
  id: string;
  userId: string;
  teamId?: string;

  notifyOnDecisionCreated: boolean;
  notifyOnVoteRequested: boolean;
  notifyOnReviewAssigned: boolean;
  notifyOnHandoffReceived: boolean;
  notifyOnFeatureAssigned: boolean;
  notifyOnPhaseSuggestion: boolean;
  notifyOnContextUpdated: boolean;

  inAppEnabled: boolean;
  emailEnabled: boolean;
  emailDigestFrequency: EmailDigestFrequency;

  createdAt: string;
  updatedAt: string;
}

export interface UpdateNotificationPreferencesInput {
  notifyOnDecisionCreated?: boolean;
  notifyOnVoteRequested?: boolean;
  notifyOnReviewAssigned?: boolean;
  notifyOnHandoffReceived?: boolean;
  notifyOnFeatureAssigned?: boolean;
  notifyOnPhaseSuggestion?: boolean;
  notifyOnContextUpdated?: boolean;
  inAppEnabled?: boolean;
  emailEnabled?: boolean;
  emailDigestFrequency?: EmailDigestFrequency;
}

// ============================================================================
// SERVICE RESULT TYPES
// ============================================================================

export type AICollaborationResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: AICollaborationError };

export interface AICollaborationError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// AGGREGATED TYPES FOR UI
// ============================================================================

export interface AICollaborationStats {
  promptContributions: {
    total: number;
    byUser: Record<string, number>;
    resultedInCodeChanges: number;
  };
  decisions: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  reviews: {
    total: number;
    pending: number;
    approved: number;
    changesRequested: number;
  };
  featureOwnership: {
    total: number;
    byOwner: Record<string, number>;
    completed: number;
  };
}

export interface TeamAICollaborationDashboard {
  teamId: string;
  stats: AICollaborationStats;
  recentActivity: {
    contributions: AIPromptContribution[];
    decisions: AIDecision[];
    reviews: AIReviewRequest[];
    handoffs: AIConversationHandoff[];
  };
  pendingActions: {
    decisionsToVote: AIDecision[];
    reviewsToComplete: AIReviewRequest[];
    handoffsToAccept: AIConversationHandoff[];
  };
  sharedContexts: SharedAIContext[];
  templates: SharedPromptTemplate[];
}

// ============================================================================
// 10. COLLABORATIVE AI DEBATE (Multi-Model)
// ============================================================================

export type DebateModelId =
  | "claude-opus-4"
  | "claude-sonnet-4"
  | "gpt-5"
  | "gpt-4o";

export type DebateStatus =
  | "starting"
  | "debating"
  | "agreed"
  | "user-ended"
  | "error";

export type DebateRole = "strategic-architect" | "implementation-specialist";

/**
 * A single message in a debate conversation between AI models
 */
export interface DebateMessage {
  id: string;
  modelId: DebateModelId;
  modelDisplayName: string;
  role: DebateRole;
  content: string;
  turnNumber: number;
  isAgreement: boolean; // Did this message express agreement?
  tokensUsed: {
    input: number;
    output: number;
  };
  timestamp: string;
}

/**
 * Action item extracted from debate consensus
 */
export interface DebateActionItem {
  id: string;
  description: string;
  priority: "high" | "medium" | "low";
  suggestedBy: DebateModelId;
  agreedUponBy: DebateModelId[];
}

/**
 * The final consensus reached by the debating models
 */
export interface DebateConsensus {
  summary: string;
  actionItems: DebateActionItem[];
  keyDecisions: string[];
  implementable: boolean;
  implementedAt?: string;
  implementationDetails?: {
    filesAffected: string[];
    changesSummary: string;
  };
}

/**
 * Cost breakdown for a debate session
 */
export interface DebateCost {
  byModel: Record<
    DebateModelId,
    {
      inputTokens: number;
      outputTokens: number;
      cost: number;
    }
  >;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
}

/**
 * A complete debate session
 */
export interface DebateSession {
  id: string;
  appId: string;
  userQuestion: string;
  messages: DebateMessage[];
  participants: {
    modelId: DebateModelId;
    displayName: string;
    role: DebateRole;
  }[];
  status: DebateStatus;
  roundCount: number;
  maxRounds: number;
  consensus?: DebateConsensus;
  cost: DebateCost;
  createdAt: string;
  updatedAt: string;
  endedAt?: string;
}

/**
 * SSE event types for streaming debate updates
 */
export type DebateStreamEventType =
  | "debate_start"
  | "model_start"
  | "model_chunk"
  | "model_complete"
  | "agreement_detected"
  | "synthesis_start"
  | "synthesis_complete"
  | "cost_update"
  | "debate_complete"
  | "debate_error";

export interface DebateStreamEvent {
  type: DebateStreamEventType;
  timestamp: number;
  sessionId: string;

  // Model-specific data
  modelId?: DebateModelId;
  modelDisplayName?: string;
  turnNumber?: number;
  content?: string;

  // Agreement data
  agreementDetected?: boolean;
  agreementReason?: string;

  // Consensus data
  consensus?: DebateConsensus;

  // Cost data
  cost?: DebateCost;

  // Error data
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Request body for starting a debate
 */
export interface StartDebateRequest {
  appId: string;
  userQuestion: string;
  maxRounds?: number; // Default: 3
  models?: DebateModelId[]; // Default: ['claude-opus-4', 'gpt-5']
  currentAppState?: {
    name?: string;
    files?: Array<{ path: string; content: string }>;
  };
}

/**
 * Request body for ending a debate
 */
export interface EndDebateRequest {
  sessionId: string;
  reason: "user-ended" | "agreed";
}

/**
 * Agreement detection phrases
 */
export const AGREEMENT_PHRASES = [
  "i agree",
  "that works",
  "good approach",
  "let's go with",
  "i think we're aligned",
  "that covers it",
  "nothing to add",
  "well said",
  "exactly right",
  "perfect",
  "i'm on board",
  "sounds good",
  "that makes sense",
  "i concur",
];

/**
 * Check if a message contains agreement language
 */
export function detectAgreement(content: string): boolean {
  const lowerContent = content.toLowerCase();
  return AGREEMENT_PHRASES.some((phrase) => lowerContent.includes(phrase));
}
