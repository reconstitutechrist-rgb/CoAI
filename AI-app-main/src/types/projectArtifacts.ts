/**
 * Project Artifacts Type Definitions
 *
 * Types for saving and managing AI Builder and AI Debate work
 * as team project artifacts.
 *
 * @module projectArtifacts
 */

import type { UserInfo } from './collaboration';
import type { AppConcept } from './appConcept';
import type {
  DebateConsensus,
  DebateModelId,
  DebateRole,
  DebateStatus,
} from './aiCollaboration';

// ============================================================================
// ARTIFACT TYPES
// ============================================================================

/**
 * Types of artifacts that can be saved to a project
 */
export type ArtifactType =
  | 'ai_builder_plan' // AppConcept + conversation
  | 'ai_builder_app' // Full generated app with code
  | 'ai_debate_session'; // Debate session with consensus

/**
 * Artifact status in the project
 */
export type ArtifactStatus = 'draft' | 'published' | 'archived';

// ============================================================================
// ARTIFACT CONTENT SNAPSHOTS
// ============================================================================

/**
 * Content snapshot for AI Builder Plan artifacts
 * Captures the planning state from the conversation wizard
 */
export interface AIBuilderPlanContent {
  /** Full AppConcept from the planning wizard */
  appConcept: AppConcept;
  /** Conversation context for rich detail preservation */
  conversationContext?: string;
  /** Wizard state for resuming */
  wizardState?: {
    step: number;
    completedSteps: number[];
  };
  /** Number of messages in the planning conversation */
  messageCount?: number;
}

/**
 * Content snapshot for AI Builder App artifacts
 * Captures the built application with all generated code
 */
export interface AIBuilderAppContent {
  /** Full AppConcept that defined the app */
  appConcept: AppConcept;
  /** All generated files with their content */
  generatedFiles: Array<{
    path: string;
    content: string;
    language: string;
  }>;
  /** App version identifier */
  version: string;
  /** Preview URL if available */
  previewUrl?: string;
  /** Build status */
  buildStatus: 'planning' | 'building' | 'completed' | 'failed' | 'paused';
  /** Phase execution progress */
  phaseProgress?: {
    current: number;
    total: number;
    completed: number[];
  };
}

/**
 * Content snapshot for AI Debate Session artifacts
 * Captures the debate results and consensus
 */
export interface AIDebateSessionContent {
  /** The original question/topic that was debated */
  userQuestion: string;
  /** Final consensus reached (if any) */
  consensus?: DebateConsensus;
  /** Total messages in the debate */
  messageCount: number;
  /** Participating AI models with their roles */
  participants: Array<{
    modelId: DebateModelId;
    displayName: string;
    role: DebateRole;
  }>;
  /** Final status of the debate */
  debateStatus: DebateStatus;
  /** Number of rounds completed */
  roundCount: number;
  /** Cost summary */
  costSummary?: {
    totalCost: number;
    totalTokens: number;
  };
}

/**
 * Union type for all artifact content types
 */
export type ArtifactContent =
  | AIBuilderPlanContent
  | AIBuilderAppContent
  | AIDebateSessionContent;

// ============================================================================
// MAIN ARTIFACT TYPE
// ============================================================================

/**
 * A project artifact representing saved team work
 */
export interface ProjectArtifact {
  id: string;
  teamId: string;
  createdBy: string;

  /** User-provided name for the artifact */
  name: string;
  /** Optional description */
  description?: string;
  /** Type of artifact */
  artifactType: ArtifactType;
  /** Current status */
  status: ArtifactStatus;

  /** Reference to source debate session (for ai_debate_session type) */
  debateSessionId?: string;
  /** Reference to source app (for ai_builder_app type) */
  appId?: string;

  /** Snapshot content based on artifact type */
  content: ArtifactContent;

  /** Preview image/thumbnail URL */
  previewUrl?: string;

  createdAt: string;
  updatedAt: string;

  /** Joined creator user info */
  creator?: UserInfo;
}

// ============================================================================
// DATABASE ROW TYPE
// ============================================================================

/**
 * Database row representation for project_artifacts table
 */
export interface ProjectArtifactRow {
  id: string;
  team_id: string;
  created_by: string;
  name: string;
  description: string | null;
  artifact_type: ArtifactType;
  status: ArtifactStatus;
  debate_session_id: string | null;
  app_id: string | null;
  content: ArtifactContent;
  preview_url: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// INPUT TYPES
// ============================================================================

/**
 * Input for creating a new artifact
 */
export interface CreateArtifactInput {
  teamId: string;
  name: string;
  description?: string;
  artifactType: ArtifactType;
  status?: ArtifactStatus;
  debateSessionId?: string;
  appId?: string;
  content: ArtifactContent;
  previewUrl?: string;
}

/**
 * Input for updating an existing artifact
 */
export interface UpdateArtifactInput {
  name?: string;
  description?: string;
  status?: ArtifactStatus;
  content?: Partial<ArtifactContent>;
  previewUrl?: string;
}

// ============================================================================
// FILTER AND QUERY TYPES
// ============================================================================

/**
 * Filters for listing artifacts
 */
export interface ArtifactFilters {
  teamId: string;
  artifactType?: ArtifactType;
  status?: ArtifactStatus;
  createdBy?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Paginated list result
 */
export interface ArtifactListResult {
  artifacts: ProjectArtifact[];
  total: number;
  hasMore: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Maps a database row to a ProjectArtifact object
 */
export function mapRowToArtifact(row: ProjectArtifactRow): ProjectArtifact {
  return {
    id: row.id,
    teamId: row.team_id,
    createdBy: row.created_by,
    name: row.name,
    description: row.description ?? undefined,
    artifactType: row.artifact_type,
    status: row.status,
    debateSessionId: row.debate_session_id ?? undefined,
    appId: row.app_id ?? undefined,
    content: row.content,
    previewUrl: row.preview_url ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get human-readable label for artifact type
 */
export function getArtifactTypeLabel(type: ArtifactType): string {
  const labels: Record<ArtifactType, string> = {
    ai_builder_plan: 'App Plan',
    ai_builder_app: 'Built App',
    ai_debate_session: 'AI Debate',
  };
  return labels[type];
}

/**
 * Get icon name for artifact type
 */
export function getArtifactTypeIcon(type: ArtifactType): string {
  const icons: Record<ArtifactType, string> = {
    ai_builder_plan: 'Lightbulb',
    ai_builder_app: 'Code',
    ai_debate_session: 'MessageCircle',
  };
  return icons[type];
}

/**
 * Get status badge color for artifact status
 */
export function getArtifactStatusColor(status: ArtifactStatus): string {
  const colors: Record<ArtifactStatus, string> = {
    draft: 'yellow',
    published: 'green',
    archived: 'gray',
  };
  return colors[status];
}

/**
 * Type guard for AIBuilderPlanContent
 * Checks for appConcept and absence of generatedFiles (which is AIBuilderAppContent)
 * and absence of userQuestion (which is AIDebateSessionContent)
 */
export function isAIBuilderPlanContent(
  content: ArtifactContent
): content is AIBuilderPlanContent {
  return (
    'appConcept' in content &&
    !('generatedFiles' in content) &&
    !('userQuestion' in content)
  );
}

/**
 * Type guard for AIBuilderAppContent
 */
export function isAIBuilderAppContent(
  content: ArtifactContent
): content is AIBuilderAppContent {
  return 'generatedFiles' in content && 'buildStatus' in content;
}

/**
 * Type guard for AIDebateSessionContent
 */
export function isAIDebateSessionContent(
  content: ArtifactContent
): content is AIDebateSessionContent {
  return 'userQuestion' in content && 'participants' in content;
}
