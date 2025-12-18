/**
 * PlanSynthesisService - AI-Powered Plan Synthesis
 *
 * Synthesizes team artifacts into a unified AppConcept with gap analysis
 * and integration planning.
 *
 * Workflow:
 * 1. Load Project Brief (master vision)
 * 2. Load all team artifacts
 * 3. Use AI to merge artifacts into unified AppConcept
 * 4. Compare against Project Brief to find gaps
 * 5. Generate integration plan
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { AppConcept, Feature } from '@/types/appConcept';
import type { ProjectArtifact } from '@/types/projectArtifacts';
import type { UserInfo, ServiceResult } from '@/types/collaboration';
import type {
  ProjectBrief,
  ProjectBriefRow,
  PlanSynthesisResult,
  PlanSynthesisResultRow,
  GapAnalysis,
  IntegrationPlan,
  ArtifactContribution,
  MissingFeature,
  IncompleteArea,
  PlanConflict,
  FeatureConnection,
  SharedElement,
  SuggestedPhase,
  TriggerSynthesisInput,
} from '@/types/projectIntegration';
import {
  mapRowToProjectBrief,
  mapRowToSynthesisResult,
  getConfidenceLevel,
} from '@/types/projectIntegration';
import {
  isAIBuilderPlanContent,
  isAIBuilderAppContent,
  isAIDebateSessionContent,
} from '@/types/projectArtifacts';
import Anthropic from '@anthropic-ai/sdk';

// ============================================================================
// CONSTANTS
// ============================================================================

const AI_MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 8000;

// ============================================================================
// SERVICE ERROR HELPER
// ============================================================================

function createError(code: string, message: string): { code: string; message: string } {
  return { code, message };
}

// ============================================================================
// PLAN SYNTHESIS SERVICE
// ============================================================================

export class PlanSynthesisService {
  private client: SupabaseClient<Database>;
  private anthropic: Anthropic;

  constructor(supabaseClient: SupabaseClient<Database>) {
    this.client = supabaseClient;
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  // ==========================================================================
  // PROJECT BRIEF METHODS
  // ==========================================================================

  /**
   * Get the project brief for a team
   */
  async getProjectBrief(teamId: string): Promise<ServiceResult<ProjectBrief | null>> {
    try {
      const { data, error } = await this.client
        .from('project_briefs')
        .select('*')
        .eq('team_id', teamId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: true, data: null };
        }
        return {
          success: false,
          error: createError('FETCH_FAILED', `Failed to fetch project brief: ${error.message}`),
        };
      }

      return { success: true, data: mapRowToProjectBrief(data as ProjectBriefRow) };
    } catch (err) {
      return {
        success: false,
        error: createError('UNEXPECTED_ERROR', 'An unexpected error occurred'),
      };
    }
  }

  // ==========================================================================
  // SYNTHESIS METHODS
  // ==========================================================================

  /**
   * Get the latest synthesis result for a team
   */
  async getLatestSynthesis(teamId: string): Promise<ServiceResult<PlanSynthesisResult | null>> {
    try {
      const { data, error } = await this.client
        .from('plan_synthesis_results')
        .select('*')
        .eq('team_id', teamId)
        .order('synthesized_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: true, data: null };
        }
        return {
          success: false,
          error: createError('FETCH_FAILED', `Failed to fetch synthesis: ${error.message}`),
        };
      }

      return { success: true, data: mapRowToSynthesisResult(data as PlanSynthesisResultRow) };
    } catch (err) {
      return {
        success: false,
        error: createError('UNEXPECTED_ERROR', 'An unexpected error occurred'),
      };
    }
  }

  /**
   * Main synthesis method - analyzes all artifacts and creates unified plan
   */
  async synthesizePlan(
    userId: string,
    input: TriggerSynthesisInput
  ): Promise<ServiceResult<PlanSynthesisResult>> {
    try {
      // 1. Load Project Brief
      const briefResult = await this.getProjectBrief(input.teamId);
      if (!briefResult.success) {
        return { success: false, error: briefResult.error };
      }

      const projectBrief = briefResult.data;
      if (!projectBrief) {
        return {
          success: false,
          error: createError('NO_BRIEF', 'No project brief exists. Create one first.'),
        };
      }

      // 2. Load all team artifacts
      const { data: artifactsData, error: artifactsError } = await this.client
        .from('project_artifacts')
        .select('*')
        .eq('team_id', input.teamId)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (artifactsError) {
        return {
          success: false,
          error: createError('FETCH_FAILED', `Failed to fetch artifacts: ${artifactsError.message}`),
        };
      }

      const artifacts = artifactsData || [];

      if (artifacts.length === 0) {
        return {
          success: false,
          error: createError('NO_ARTIFACTS', 'No artifacts found. Team members need to save their work first.'),
        };
      }

      // 3. Extract contributions from each artifact
      const contributions = await this.extractContributions(artifacts);

      // 4. Use AI to synthesize everything
      const synthesisResult = await this.performAISynthesis(projectBrief, contributions, artifacts);

      // 5. Save the result
      const { data: savedResult, error: saveError } = await this.client
        .from('plan_synthesis_results')
        .insert({
          team_id: input.teamId,
          project_brief_id: projectBrief.id,
          unified_app_concept: synthesisResult.unifiedAppConcept,
          gap_analysis: synthesisResult.gapAnalysis,
          integration_plan: synthesisResult.integrationPlan,
          contributing_artifacts: contributions,
          ai_model: AI_MODEL,
          confidence: synthesisResult.confidence,
          confidence_level: getConfidenceLevel(synthesisResult.confidence),
          warnings: synthesisResult.warnings,
          synthesized_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (saveError) {
        return {
          success: false,
          error: createError('SAVE_FAILED', `Failed to save synthesis: ${saveError.message}`),
        };
      }

      return {
        success: true,
        data: mapRowToSynthesisResult(savedResult as PlanSynthesisResultRow),
      };
    } catch (err) {
      console.error('Synthesis error:', err);
      return {
        success: false,
        error: createError('SYNTHESIS_FAILED', err instanceof Error ? err.message : 'Synthesis failed'),
      };
    }
  }

  /**
   * Extract contributions from artifacts
   */
  private async extractContributions(artifacts: ProjectArtifact[]): Promise<ArtifactContribution[]> {
    const contributions: ArtifactContribution[] = [];

    for (const artifact of artifacts) {
      const contribution: ArtifactContribution = {
        artifactId: artifact.id,
        artifactName: artifact.name,
        artifactType: artifact.artifactType,
        contributedBy: artifact.createdBy,
        contributedFeatures: [],
        keyDecisions: [],
        createdAt: artifact.createdAt,
      };

      const content = artifact.content;

      if (isAIBuilderPlanContent(content)) {
        // Extract features from plan
        if (content.appConcept?.coreFeatures) {
          contribution.contributedFeatures = content.appConcept.coreFeatures.map(f => f.name);
        }
      } else if (isAIBuilderAppContent(content)) {
        // Extract features from built app
        if (content.appConcept?.coreFeatures) {
          contribution.contributedFeatures = content.appConcept.coreFeatures.map(f => f.name);
        }
      } else if (isAIDebateSessionContent(content)) {
        // Extract decisions from debate
        if (content.consensus) {
          contribution.keyDecisions = [
            content.consensus.agreedApproach,
            ...(content.consensus.potentialChallenges || []),
          ].filter(Boolean);
        }
      }

      contributions.push(contribution);
    }

    return contributions;
  }

  /**
   * Perform AI synthesis of all contributions
   */
  private async performAISynthesis(
    projectBrief: ProjectBrief,
    contributions: ArtifactContribution[],
    artifacts: ProjectArtifact[]
  ): Promise<{
    unifiedAppConcept: AppConcept;
    gapAnalysis: GapAnalysis;
    integrationPlan: IntegrationPlan;
    confidence: number;
    warnings: string[];
  }> {
    // Build the synthesis prompt
    const prompt = this.buildSynthesisPrompt(projectBrief, contributions, artifacts);

    // Call AI
    const response = await this.anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      system: `You are an expert software architect helping synthesize multiple team contributions into a unified app plan.

Your task is to:
1. Merge all team contributions into ONE coherent AppConcept
2. Resolve minor conflicts intelligently
3. Identify features from the Project Brief not yet addressed
4. Note major conflicts that need team discussion
5. Plan how features should integrate with each other

You must respond with valid JSON only, following the exact schema provided.`,
    });

    // Parse response
    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = responseText;
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }

      const parsed = JSON.parse(jsonStr);

      return {
        unifiedAppConcept: this.buildAppConcept(parsed.unifiedAppConcept, projectBrief),
        gapAnalysis: this.buildGapAnalysis(parsed.gapAnalysis, projectBrief),
        integrationPlan: this.buildIntegrationPlan(parsed.integrationPlan),
        confidence: parsed.confidence || 70,
        warnings: parsed.warnings || [],
      };
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Return a basic synthesis based on the project brief
      return this.buildFallbackSynthesis(projectBrief, contributions);
    }
  }

  /**
   * Build the synthesis prompt
   */
  private buildSynthesisPrompt(
    projectBrief: ProjectBrief,
    contributions: ArtifactContribution[],
    artifacts: ProjectArtifact[]
  ): string {
    const briefSection = `
## PROJECT BRIEF (Master Vision)
**App Name:** ${projectBrief.appName}
**Description:** ${projectBrief.appDescription}
**Problem:** ${projectBrief.problemStatement}
**Target Users:** ${projectBrief.targetUsers}

**Desired Features:**
${projectBrief.desiredFeatures.map(f => `- ${f.name} (${f.priority}): ${f.description}`).join('\n')}

**Success Criteria:**
${projectBrief.successCriteria.map(c => `- ${c}`).join('\n')}

${projectBrief.technicalConstraints ? `**Technical Constraints:** ${projectBrief.technicalConstraints.join(', ')}` : ''}
${projectBrief.designConstraints ? `**Design Constraints:** ${projectBrief.designConstraints.join(', ')}` : ''}
`;

    const artifactsSection = artifacts.map(artifact => {
      let contentSummary = '';
      const content = artifact.content;

      if (isAIBuilderPlanContent(content)) {
        contentSummary = `
  - App Concept: ${content.appConcept?.name || 'Unnamed'}
  - Features: ${content.appConcept?.coreFeatures?.map(f => f.name).join(', ') || 'None'}
  - Technical: Auth=${content.appConcept?.technical?.needsAuth}, DB=${content.appConcept?.technical?.needsDatabase}`;
      } else if (isAIBuilderAppContent(content)) {
        contentSummary = `
  - Built App: ${content.appConcept?.name || 'Unnamed'}
  - Files: ${content.generatedFiles?.length || 0} files generated
  - Status: ${content.buildStatus}`;
      } else if (isAIDebateSessionContent(content)) {
        contentSummary = `
  - Question: ${content.userQuestion}
  - Consensus: ${content.consensus?.agreedApproach || 'No consensus'}
  - Rounds: ${content.roundCount}`;
      }

      return `
### ${artifact.name} (${artifact.artifactType})
By: ${artifact.createdBy}
${contentSummary}`;
    }).join('\n');

    return `
Analyze the following project brief and team contributions, then synthesize them into a unified app plan.

${briefSection}

## TEAM CONTRIBUTIONS
${artifactsSection}

## YOUR TASK

Create a unified plan by responding with JSON in this exact format:

\`\`\`json
{
  "unifiedAppConcept": {
    "name": "string",
    "description": "string",
    "purpose": "string",
    "targetUsers": "string",
    "coreFeatures": [
      { "id": "string", "name": "string", "description": "string", "priority": "high|medium|low" }
    ],
    "technical": {
      "needsAuth": boolean,
      "needsDatabase": boolean,
      "needsAPI": boolean,
      "needsFileUpload": boolean,
      "needsRealtime": boolean
    },
    "uiPreferences": {
      "style": "modern|minimal|classic",
      "colorScheme": "light|dark|auto",
      "layout": "single-page|multi-page|dashboard"
    }
  },
  "gapAnalysis": {
    "missingFeatures": [
      { "featureName": "string", "priority": "must-have|should-have|nice-to-have", "suggestion": "string" }
    ],
    "incompleteAreas": [
      { "area": "string", "whatsMissing": "string", "suggestion": "string" }
    ],
    "conflicts": [
      { "topic": "string", "positions": ["string"], "aiRecommendation": "string", "needsDebate": boolean }
    ],
    "completionPercentage": number,
    "readyToBuild": boolean,
    "blockers": ["string"]
  },
  "integrationPlan": {
    "featureConnections": [
      { "feature1": "string", "feature2": "string", "connectionType": "data-flow|navigation|shared-state|dependency", "description": "string" }
    ],
    "sharedElements": [
      { "name": "string", "elementType": "context|store|component|hook|utility|type", "description": "string", "usedByFeatures": ["string"] }
    ],
    "suggestedPhases": [
      { "phaseNumber": number, "name": "string", "description": "string", "features": ["string"], "dependsOn": [], "complexity": "low|medium|high" }
    ]
  },
  "confidence": number (0-100),
  "warnings": ["string"]
}
\`\`\`

Important:
- Merge overlapping features from different contributions
- Compare against Project Brief desired features to find gaps
- Identify any conflicting decisions that need team resolution
- Suggest a logical build order based on dependencies
`;
  }

  /**
   * Build AppConcept from AI response
   */
  private buildAppConcept(aiConcept: Partial<AppConcept>, brief: ProjectBrief): AppConcept {
    const now = new Date().toISOString();

    return {
      name: aiConcept?.name || brief.appName,
      description: aiConcept?.description || brief.appDescription,
      purpose: aiConcept?.purpose || brief.problemStatement,
      targetUsers: aiConcept?.targetUsers || brief.targetUsers,
      coreFeatures: (aiConcept?.coreFeatures || []).map((f, i) => ({
        id: f.id || `feature-${i}`,
        name: f.name,
        description: f.description,
        priority: f.priority || 'medium',
      })),
      technical: {
        needsAuth: aiConcept?.technical?.needsAuth ?? false,
        needsDatabase: aiConcept?.technical?.needsDatabase ?? false,
        needsAPI: aiConcept?.technical?.needsAPI ?? false,
        needsFileUpload: aiConcept?.technical?.needsFileUpload ?? false,
        needsRealtime: aiConcept?.technical?.needsRealtime ?? false,
      },
      uiPreferences: {
        style: aiConcept?.uiPreferences?.style || 'modern',
        colorScheme: aiConcept?.uiPreferences?.colorScheme || 'dark',
        layout: aiConcept?.uiPreferences?.layout || 'single-page',
      },
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Build GapAnalysis from AI response
   */
  private buildGapAnalysis(aiGaps: Partial<GapAnalysis>, brief: ProjectBrief): GapAnalysis {
    return {
      missingFeatures: (aiGaps?.missingFeatures || []).map((f, i) => ({
        featureName: f.featureName,
        priority: f.priority || 'should-have',
        suggestion: f.suggestion || 'Work with team to plan this feature',
        desiredFeatureId: brief.desiredFeatures[i]?.id || `desired-${i}`,
      })),
      incompleteAreas: (aiGaps?.incompleteAreas || []).map(a => ({
        area: a.area,
        whatsMissing: a.whatsMissing,
        suggestion: a.suggestion || 'Review and expand this area',
      })),
      conflicts: (aiGaps?.conflicts || []).map((c, i) => ({
        id: `conflict-${i}`,
        topic: c.topic,
        positions: (c.positions || []).map((p: string) => ({
          position: p,
          fromArtifactId: '',
          fromArtifactName: 'Team discussion',
          contributedBy: '',
        })),
        aiRecommendation: c.aiRecommendation || 'Discuss with team',
        needsDebate: c.needsDebate ?? true,
        resolved: false,
      })),
      completionPercentage: aiGaps?.completionPercentage || 0,
      readyToBuild: aiGaps?.readyToBuild ?? false,
      blockers: aiGaps?.blockers || [],
    };
  }

  /**
   * Build IntegrationPlan from AI response
   */
  private buildIntegrationPlan(aiPlan: Partial<IntegrationPlan>): IntegrationPlan {
    return {
      featureConnections: (aiPlan?.featureConnections || []).map(c => ({
        feature1: c.feature1,
        feature2: c.feature2,
        connectionType: c.connectionType || 'dependency',
        description: c.description || '',
        designConsiderations: c.designConsiderations || [],
      })),
      sharedElements: (aiPlan?.sharedElements || []).map(e => ({
        name: e.name,
        elementType: e.elementType || 'utility',
        description: e.description || '',
        usedByFeatures: e.usedByFeatures || [],
      })),
      suggestedPhases: (aiPlan?.suggestedPhases || []).map((p, i) => ({
        phaseNumber: p.phaseNumber || i + 1,
        name: p.name || `Phase ${i + 1}`,
        description: p.description || '',
        features: p.features || [],
        dependsOn: p.dependsOn || [],
        complexity: p.complexity || 'medium',
      })),
    };
  }

  /**
   * Build a fallback synthesis if AI parsing fails
   */
  private buildFallbackSynthesis(
    brief: ProjectBrief,
    contributions: ArtifactContribution[]
  ): {
    unifiedAppConcept: AppConcept;
    gapAnalysis: GapAnalysis;
    integrationPlan: IntegrationPlan;
    confidence: number;
    warnings: string[];
  } {
    const now = new Date().toISOString();

    // Collect all contributed features
    const allFeatures = new Set<string>();
    contributions.forEach(c => c.contributedFeatures.forEach(f => allFeatures.add(f)));

    // Find missing features
    const missingFeatures: MissingFeature[] = brief.desiredFeatures
      .filter(df => !allFeatures.has(df.name))
      .map(df => ({
        featureName: df.name,
        priority: df.priority,
        suggestion: `This feature from the project brief hasn't been planned yet: ${df.description}`,
        desiredFeatureId: df.id,
      }));

    return {
      unifiedAppConcept: {
        name: brief.appName,
        description: brief.appDescription,
        purpose: brief.problemStatement,
        targetUsers: brief.targetUsers,
        coreFeatures: brief.desiredFeatures.map((f, i) => ({
          id: f.id || `feature-${i}`,
          name: f.name,
          description: f.description,
          priority: f.priority === 'must-have' ? 'high' : f.priority === 'should-have' ? 'medium' : 'low',
        })),
        technical: {
          needsAuth: false,
          needsDatabase: false,
          needsAPI: false,
          needsFileUpload: false,
          needsRealtime: false,
        },
        uiPreferences: {
          style: 'modern',
          colorScheme: 'dark',
          layout: 'single-page',
        },
        createdAt: now,
        updatedAt: now,
      },
      gapAnalysis: {
        missingFeatures,
        incompleteAreas: [],
        conflicts: [],
        completionPercentage: Math.round((allFeatures.size / brief.desiredFeatures.length) * 100) || 0,
        readyToBuild: missingFeatures.length === 0,
        blockers: missingFeatures.length > 0 ? ['Some features from the project brief have not been planned'] : [],
      },
      integrationPlan: {
        featureConnections: [],
        sharedElements: [],
        suggestedPhases: [
          {
            phaseNumber: 1,
            name: 'Foundation',
            description: 'Set up the basic app structure',
            features: Array.from(allFeatures).slice(0, 3),
            dependsOn: [],
            complexity: 'medium',
          },
        ],
      },
      confidence: 40,
      warnings: ['AI synthesis had issues - results may be incomplete. Please review carefully.'],
    };
  }

  // ==========================================================================
  // GAP ACTION METHODS
  // ==========================================================================

  /**
   * Create a task from a gap (missing feature or incomplete area)
   */
  async createTaskFromGap(
    userId: string,
    input: {
      teamId: string;
      appId?: string;
      gapType: 'missing-feature' | 'incomplete-area';
      featureName: string;
      description: string;
      priority: 'must-have' | 'should-have' | 'nice-to-have';
      assigneeId?: string;
      synthesisId: string;
    }
  ): Promise<ServiceResult<{ taskId: string }>> {
    try {
      // Map gap priority to task priority
      const taskPriority =
        input.priority === 'must-have'
          ? 'high'
          : input.priority === 'should-have'
            ? 'medium'
            : 'low';

      // Create the task
      const { data: task, error: taskError } = await this.client
        .from('tasks')
        .insert({
          team_id: input.teamId,
          app_id: input.appId || null,
          title: `[Gap] ${input.featureName}`,
          description: `${input.description}\n\n---\nCreated from Plan Synthesis gap analysis.\nSynthesis ID: ${input.synthesisId}`,
          task_type: 'feature',
          status: 'todo',
          priority: taskPriority,
          created_by: userId,
          assigned_to: input.assigneeId || null,
          labels: ['gap-action', input.gapType],
          linked_feature_name: input.featureName,
          position: 0,
        })
        .select('id')
        .single();

      if (taskError) {
        return {
          success: false,
          error: createError('CREATE_TASK_FAILED', taskError.message),
        };
      }

      return { success: true, data: { taskId: task.id } };
    } catch (err) {
      return {
        success: false,
        error: createError('UNEXPECTED_ERROR', 'Failed to create task from gap'),
      };
    }
  }

  /**
   * Assign a feature to a team member
   */
  async assignFeatureOwner(
    userId: string,
    input: {
      teamId: string;
      appId: string;
      featureName: string;
      featureDescription?: string;
      ownerId: string;
      phaseNumber?: number;
    }
  ): Promise<ServiceResult<{ ownershipId: string }>> {
    try {
      const { data: ownership, error: ownershipError } = await this.client
        .from('feature_ownerships')
        .insert({
          app_id: input.appId,
          team_id: input.teamId,
          feature_name: input.featureName,
          feature_description: input.featureDescription || null,
          phase_number: input.phaseNumber || null,
          owner_id: input.ownerId,
          assigned_by: userId,
          responsibilities: ['review', 'approve'],
          status: 'assigned',
          requires_owner_approval: true,
        })
        .select('id')
        .single();

      if (ownershipError) {
        return {
          success: false,
          error: createError('ASSIGN_OWNER_FAILED', ownershipError.message),
        };
      }

      return { success: true, data: { ownershipId: ownership.id } };
    } catch (err) {
      return {
        success: false,
        error: createError('UNEXPECTED_ERROR', 'Failed to assign feature owner'),
      };
    }
  }

  /**
   * Get debate prompt for a conflict
   * (Returns information for the client to start a debate)
   */
  getDebatePromptForConflict(conflict: PlanConflict): {
    question: string;
    context: string;
    style: 'cooperative' | 'adversarial';
  } {
    const positions = conflict.positions
      .map((p) => `- ${p.position} (from ${p.fromArtifactName})`)
      .join('\n');

    return {
      question: `We have a conflict regarding "${conflict.topic}". How should we resolve this?`,
      context: `Current positions:\n${positions}\n\nAI Recommendation: ${conflict.aiRecommendation}`,
      style: 'cooperative',
    };
  }
}

export default PlanSynthesisService;
