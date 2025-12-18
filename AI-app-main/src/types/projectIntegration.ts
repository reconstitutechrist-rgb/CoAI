/**
 * Project Integration Types
 *
 * Types for the Project Brief (owner's master vision), Plan Synthesis,
 * Gap Analysis, and Integration Planning features.
 *
 * Workflow:
 * 1. Project Owner creates a Project Brief defining the app vision
 * 2. Team members contribute partial plans as artifacts
 * 3. AI synthesizes all artifacts into a unified AppConcept
 * 4. Gap analysis shows what's still missing
 * 5. Integration plan shows how features connect
 */

import type { AppConcept, Feature } from './appConcept';
import type { ArtifactType } from './projectArtifacts';
import type { UserInfo } from './collaboration';

// ============================================================================
// PROJECT BRIEF - Owner's Master Vision
// ============================================================================

/**
 * Priority levels for desired features
 */
export type FeaturePriority = 'must-have' | 'should-have' | 'nice-to-have';

/**
 * A desired feature in the project brief
 */
export interface DesiredFeature {
  /** Unique identifier */
  id: string;
  /** Feature name */
  name: string;
  /** What this feature does */
  description: string;
  /** How important is this feature */
  priority: FeaturePriority;
  /** Additional notes from the owner */
  notes?: string;
}

/**
 * Project Brief - The owner's master vision for the app
 * This defines what the complete app should be and serves as
 * the source of truth for gap analysis.
 */
export interface ProjectBrief {
  /** Unique identifier */
  id: string;
  /** Team this brief belongs to */
  teamId: string;
  /** User who created the brief (must be owner/admin) */
  createdBy: string;

  // === The Vision ===
  /** Name of the app being built */
  appName: string;
  /** High-level description of the app */
  appDescription: string;
  /** What problem does this app solve? */
  problemStatement: string;
  /** Who are the target users? */
  targetUsers: string;
  /** How do we know the app is successful/complete? */
  successCriteria: string[];

  // === Features ===
  /** List of features the owner wants in the app */
  desiredFeatures: DesiredFeature[];

  // === Constraints ===
  /** Technical constraints (e.g., "Must work offline", "No backend") */
  technicalConstraints?: string[];
  /** Design constraints (e.g., "Must match brand", "Mobile-first") */
  designConstraints?: string[];

  // === Metadata ===
  createdAt: string;
  updatedAt: string;

  // === Creator info (populated on fetch) ===
  creator?: UserInfo;
}

/**
 * Input for creating a project brief
 */
export interface CreateProjectBriefInput {
  teamId: string;
  appName: string;
  appDescription: string;
  problemStatement: string;
  targetUsers: string;
  successCriteria: string[];
  desiredFeatures: Omit<DesiredFeature, 'id'>[];
  technicalConstraints?: string[];
  designConstraints?: string[];
}

/**
 * Input for updating a project brief
 */
export interface UpdateProjectBriefInput {
  appName?: string;
  appDescription?: string;
  problemStatement?: string;
  targetUsers?: string;
  successCriteria?: string[];
  desiredFeatures?: Omit<DesiredFeature, 'id'>[];
  technicalConstraints?: string[];
  designConstraints?: string[];
}

// ============================================================================
// GAP ANALYSIS
// ============================================================================

/**
 * A feature from the Project Brief that hasn't been planned yet
 */
export interface MissingFeature {
  /** Feature name from Project Brief */
  featureName: string;
  /** Priority from Project Brief */
  priority: FeaturePriority;
  /** AI's suggestion for how to approach this feature */
  suggestion: string;
  /** Recommended team member to work on this (based on skills/availability) */
  suggestedOwner?: string;
  /** Reference to the desired feature ID in Project Brief */
  desiredFeatureId: string;
}

/**
 * An area that has been partially planned but needs more detail
 */
export interface IncompleteArea {
  /** Area name (e.g., "Authentication flow") */
  area: string;
  /** What specific details are missing */
  whatsMissing: string;
  /** Which artifact mentioned this area */
  fromArtifactId?: string;
  fromArtifactName?: string;
  /** AI's suggestion for completing this area */
  suggestion: string;
}

/**
 * A position in a conflict
 */
export interface ConflictPosition {
  /** The viewpoint/approach */
  position: string;
  /** Which artifact holds this position */
  fromArtifactId: string;
  fromArtifactName: string;
  /** Who created that artifact */
  contributedBy: string;
  /** Supporting reasoning */
  reasoning?: string;
}

/**
 * A conflict between different artifacts/team members
 */
export interface PlanConflict {
  /** Unique identifier */
  id: string;
  /** Topic of conflict (e.g., "Database choice") */
  topic: string;
  /** Different positions from artifacts */
  positions: ConflictPosition[];
  /** AI's recommended resolution */
  aiRecommendation: string;
  /** Should the team discuss this via AI Debate? */
  needsDebate: boolean;
  /** Has this conflict been resolved? */
  resolved: boolean;
  /** Resolution details if resolved */
  resolution?: string;
}

/**
 * Complete gap analysis results
 */
export interface GapAnalysis {
  /** Features from Project Brief not yet addressed */
  missingFeatures: MissingFeature[];
  /** Areas needing more detail */
  incompleteAreas: IncompleteArea[];
  /** Conflicting decisions from different artifacts */
  conflicts: PlanConflict[];
  /** Overall completion percentage (0-100) */
  completionPercentage: number;
  /** Is the plan ready to start building? */
  readyToBuild: boolean;
  /** What's blocking the plan from being ready */
  blockers: string[];
}

// ============================================================================
// INTEGRATION PLAN
// ============================================================================

/**
 * How two features connect
 */
export type ConnectionType = 'data-flow' | 'navigation' | 'shared-state' | 'dependency' | 'api-call';

/**
 * A connection between two features
 */
export interface FeatureConnection {
  /** First feature name */
  feature1: string;
  /** Second feature name */
  feature2: string;
  /** Type of connection */
  connectionType: ConnectionType;
  /** Description of the connection */
  description: string;
  /** Design considerations for this connection */
  designConsiderations: string[];
}

/**
 * A shared element needed across features
 */
export interface SharedElement {
  /** Element name (e.g., "UserContext", "AuthProvider") */
  name: string;
  /** Type of element */
  elementType: 'context' | 'store' | 'component' | 'hook' | 'utility' | 'type' | 'api';
  /** What this element provides */
  description: string;
  /** Which features use this element */
  usedByFeatures: string[];
  /** Implementation notes */
  implementationNotes?: string;
}

/**
 * A suggested build phase
 */
export interface SuggestedPhase {
  /** Phase number */
  phaseNumber: number;
  /** Phase name */
  name: string;
  /** Phase description */
  description: string;
  /** Features to build in this phase */
  features: string[];
  /** Dependencies (phases that must complete first) */
  dependsOn: number[];
  /** Estimated complexity */
  complexity: 'low' | 'medium' | 'high';
}

/**
 * Integration plan showing how features connect
 */
export interface IntegrationPlan {
  /** How features connect to each other */
  featureConnections: FeatureConnection[];
  /** Shared components/state/utilities needed */
  sharedElements: SharedElement[];
  /** Suggested order to build features */
  suggestedPhases: SuggestedPhase[];
}

// ============================================================================
// ARTIFACT CONTRIBUTION
// ============================================================================

/**
 * Tracks what an artifact contributed to the plan
 */
export interface ArtifactContribution {
  /** Artifact ID */
  artifactId: string;
  /** Artifact name */
  artifactName: string;
  /** Artifact type */
  artifactType: ArtifactType;
  /** Who created the artifact */
  contributedBy: string;
  contributorInfo?: UserInfo;
  /** Features this artifact added to the plan */
  contributedFeatures: string[];
  /** Key decisions from this artifact (especially from debates) */
  keyDecisions: string[];
  /** When the artifact was created */
  createdAt: string;
}

// ============================================================================
// SYNTHESIS RESULT
// ============================================================================

/**
 * AI confidence level
 */
export type ConfidenceLevel = 'low' | 'medium' | 'high';

/**
 * Complete plan synthesis result
 */
export interface PlanSynthesisResult {
  /** Unique identifier */
  id: string;
  /** Team this synthesis is for */
  teamId: string;
  /** When the synthesis was performed */
  synthesizedAt: string;

  // === The Unified Plan ===
  /** Complete, merged AppConcept from all artifacts */
  unifiedAppConcept: AppConcept;

  // === Analysis ===
  /** Gap analysis results */
  gapAnalysis: GapAnalysis;
  /** Integration plan */
  integrationPlan: IntegrationPlan;

  // === Source Tracking ===
  /** Artifacts that contributed to this synthesis */
  contributingArtifacts: ArtifactContribution[];
  /** Project Brief used (if any) */
  projectBriefId?: string;

  // === Metadata ===
  /** AI model used for synthesis */
  aiModel: string;
  /** Confidence score (0-100) */
  confidence: number;
  /** Confidence level */
  confidenceLevel: ConfidenceLevel;
  /** Warnings generated during synthesis */
  warnings: string[];
}

// ============================================================================
// API INPUT/OUTPUT TYPES
// ============================================================================

/**
 * Input for triggering plan synthesis
 */
export interface TriggerSynthesisInput {
  teamId: string;
  /** Force re-synthesis even if recent result exists */
  forceRefresh?: boolean;
}

/**
 * Input for creating a task from a gap
 */
export interface CreateTaskFromGapInput {
  /** Gap type */
  gapType: 'missing-feature' | 'incomplete-area' | 'conflict';
  /** Reference (feature name, area name, or conflict ID) */
  reference: string;
  /** Synthesis result ID */
  synthesisId: string;
  /** Optional assignee */
  assigneeId?: string;
}

/**
 * Input for assigning ownership from synthesis
 */
export interface AssignOwnershipFromSynthesisInput {
  /** Feature name */
  featureName: string;
  /** Synthesis result ID */
  synthesisId: string;
  /** Owner user ID */
  ownerId: string;
}

// ============================================================================
// DATABASE ROW TYPES
// ============================================================================

/**
 * Database row type for project_briefs
 */
export interface ProjectBriefRow {
  id: string;
  team_id: string;
  created_by: string;
  app_name: string;
  app_description: string;
  problem_statement: string;
  target_users: string;
  success_criteria: string[];
  desired_features: DesiredFeature[];
  technical_constraints: string[] | null;
  design_constraints: string[] | null;
  created_at: string;
  updated_at: string;
}

/**
 * Database row type for plan_synthesis_results
 */
export interface PlanSynthesisResultRow {
  id: string;
  team_id: string;
  project_brief_id: string | null;
  unified_app_concept: AppConcept;
  gap_analysis: GapAnalysis;
  integration_plan: IntegrationPlan;
  contributing_artifacts: ArtifactContribution[];
  ai_model: string;
  confidence: number;
  confidence_level: ConfidenceLevel;
  warnings: string[];
  synthesized_at: string;
  created_at: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Map database row to ProjectBrief
 */
export function mapRowToProjectBrief(row: ProjectBriefRow): ProjectBrief {
  return {
    id: row.id,
    teamId: row.team_id,
    createdBy: row.created_by,
    appName: row.app_name,
    appDescription: row.app_description,
    problemStatement: row.problem_statement,
    targetUsers: row.target_users,
    successCriteria: row.success_criteria,
    desiredFeatures: row.desired_features,
    technicalConstraints: row.technical_constraints || undefined,
    designConstraints: row.design_constraints || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Map database row to PlanSynthesisResult
 */
export function mapRowToSynthesisResult(row: PlanSynthesisResultRow): PlanSynthesisResult {
  return {
    id: row.id,
    teamId: row.team_id,
    synthesizedAt: row.synthesized_at,
    unifiedAppConcept: row.unified_app_concept,
    gapAnalysis: row.gap_analysis,
    integrationPlan: row.integration_plan,
    contributingArtifacts: row.contributing_artifacts,
    projectBriefId: row.project_brief_id || undefined,
    aiModel: row.ai_model,
    confidence: row.confidence,
    confidenceLevel: row.confidence_level,
    warnings: row.warnings,
  };
}

/**
 * Get display label for feature priority
 */
export function getPriorityLabel(priority: FeaturePriority): string {
  const labels: Record<FeaturePriority, string> = {
    'must-have': 'Must Have',
    'should-have': 'Should Have',
    'nice-to-have': 'Nice to Have',
  };
  return labels[priority];
}

/**
 * Get color class for feature priority
 */
export function getPriorityColor(priority: FeaturePriority): string {
  const colors: Record<FeaturePriority, string> = {
    'must-have': 'text-red-400 bg-red-500/20',
    'should-have': 'text-yellow-400 bg-yellow-500/20',
    'nice-to-have': 'text-green-400 bg-green-500/20',
  };
  return colors[priority];
}

/**
 * Get display label for connection type
 */
export function getConnectionTypeLabel(type: ConnectionType): string {
  const labels: Record<ConnectionType, string> = {
    'data-flow': 'Data Flow',
    'navigation': 'Navigation',
    'shared-state': 'Shared State',
    'dependency': 'Dependency',
    'api-call': 'API Call',
  };
  return labels[type];
}

/**
 * Get color class for confidence level
 */
export function getConfidenceColor(level: ConfidenceLevel): string {
  const colors: Record<ConfidenceLevel, string> = {
    low: 'text-red-400',
    medium: 'text-yellow-400',
    high: 'text-green-400',
  };
  return colors[level];
}

/**
 * Calculate confidence level from score
 */
export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}
