/**
 * AICollaborationService - Comprehensive AI collaboration features
 *
 * Handles:
 * - Prompt attribution and templates
 * - AI decision voting
 * - Shared AI context
 * - Conversation handoffs
 * - Phase planning collaboration
 * - Feature ownership
 * - AI review workflow
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type {
  AIPromptContribution,
  CreatePromptContributionInput,
  UpdatePromptContributionInput,
  SharedPromptTemplate,
  CreatePromptTemplateInput,
  UpdatePromptTemplateInput,
  AIDecision,
  AIDecisionVote,
  CreateAIDecisionInput,
  CastVoteInput,
  SharedAIContext,
  CreateAIContextInput,
  UpdateAIContextInput,
  AIConversationHandoff,
  CreateHandoffInput,
  RespondToHandoffInput,
  PhasePlanningSession,
  PhaseSuggestion,
  PhasePlanningVote,
  CreatePlanningSessionInput,
  CreatePhaseSuggestionInput,
  CastPlanningVoteInput,
  FeatureOwnership,
  CreateFeatureOwnershipInput,
  UpdateFeatureOwnershipInput,
  AIReviewRequest,
  AIReviewResponse,
  CreateReviewRequestInput,
  CreateReviewResponseInput,
  AICollaborationNotifications,
  UpdateNotificationPreferencesInput,
  AICollaborationResult,
  AICollaborationStats,
} from '@/types/aiCollaboration';

// Database row interfaces
interface PromptContributionRow {
  id: string;
  app_id: string;
  team_id: string | null;
  user_id: string;
  prompt_text: string;
  prompt_type: string;
  mode: string;
  phase_number: number | null;
  ai_response_id: string | null;
  ai_response_summary: string | null;
  tokens_used: number | null;
  resulted_in_code_change: boolean;
  files_affected: string[] | null;
  features_affected: string[] | null;
  created_at: string;
}

interface UserProfileRow {
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

/**
 * Service for managing AI collaboration features
 */
export class AICollaborationService {
  constructor(private supabase: SupabaseClient) {}

  // ============================================================================
  // PROMPT CONTRIBUTIONS
  // ============================================================================

  /**
   * Record a prompt contribution
   */
  async createPromptContribution(
    userId: string,
    input: CreatePromptContributionInput
  ): Promise<AICollaborationResult<AIPromptContribution>> {
    try {
      const { data, error } = await this.supabase
        .from('ai_prompt_contributions')
        .insert({
          app_id: input.appId,
          team_id: input.teamId || null,
          user_id: userId,
          prompt_text: input.promptText,
          prompt_type: input.promptType || 'message',
          mode: input.mode,
          phase_number: input.phaseNumber || null,
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: this.transformContribution(data) };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CONTRIBUTION_CREATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create contribution',
        },
      };
    }
  }

  /**
   * Update a prompt contribution with AI response info
   */
  async updatePromptContribution(
    contributionId: string,
    input: UpdatePromptContributionInput
  ): Promise<AICollaborationResult<AIPromptContribution>> {
    try {
      const updateData: Record<string, unknown> = {};
      if (input.aiResponseId !== undefined) updateData.ai_response_id = input.aiResponseId;
      if (input.aiResponseSummary !== undefined) updateData.ai_response_summary = input.aiResponseSummary;
      if (input.tokensUsed !== undefined) updateData.tokens_used = input.tokensUsed;
      if (input.resultedInCodeChange !== undefined) updateData.resulted_in_code_change = input.resultedInCodeChange;
      if (input.filesAffected !== undefined) updateData.files_affected = input.filesAffected;
      if (input.featuresAffected !== undefined) updateData.features_affected = input.featuresAffected;

      const { data, error } = await this.supabase
        .from('ai_prompt_contributions')
        .update(updateData)
        .eq('id', contributionId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: this.transformContribution(data) };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CONTRIBUTION_UPDATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update contribution',
        },
      };
    }
  }

  /**
   * Get prompt contributions for an app
   */
  async getPromptContributions(
    appId: string,
    options?: { userId?: string; limit?: number; offset?: number }
  ): Promise<AICollaborationResult<{ items: AIPromptContribution[]; total: number }>> {
    try {
      let query = this.supabase
        .from('ai_prompt_contributions')
        .select('*, user_profiles!inner(user_id, email, full_name, avatar_url)', { count: 'exact' })
        .eq('app_id', appId)
        .order('created_at', { ascending: false });

      if (options?.userId) {
        query = query.eq('user_id', options.userId);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options?.limit || 50) - 1);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        success: true,
        data: {
          items: (data || []).map((row) => this.transformContributionWithUser(row)),
          total: count || 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CONTRIBUTIONS_FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch contributions',
        },
      };
    }
  }

  // ============================================================================
  // PROMPT TEMPLATES
  // ============================================================================

  /**
   * Create a shared prompt template
   */
  async createPromptTemplate(
    teamId: string,
    userId: string,
    input: CreatePromptTemplateInput
  ): Promise<AICollaborationResult<SharedPromptTemplate>> {
    try {
      const { data, error } = await this.supabase
        .from('shared_prompt_templates')
        .insert({
          team_id: teamId,
          created_by: userId,
          name: input.name,
          description: input.description || null,
          template_text: input.templateText,
          category: input.category || 'general',
          variables: input.variables || [],
          is_public: input.isPublic || false,
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: this.transformTemplate(data) };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TEMPLATE_CREATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create template',
        },
      };
    }
  }

  /**
   * Get prompt templates for a team
   */
  async getPromptTemplates(
    teamId: string,
    options?: { category?: string; includePublic?: boolean }
  ): Promise<AICollaborationResult<SharedPromptTemplate[]>> {
    try {
      let query = this.supabase
        .from('shared_prompt_templates')
        .select('*')
        .order('use_count', { ascending: false });

      if (options?.includePublic) {
        query = query.or(`team_id.eq.${teamId},is_public.eq.true`);
      } else {
        query = query.eq('team_id', teamId);
      }

      if (options?.category) {
        query = query.eq('category', options.category);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data: (data || []).map((row) => this.transformTemplate(row)) };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TEMPLATES_FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch templates',
        },
      };
    }
  }

  /**
   * Use a template (increments usage count)
   */
  async useTemplate(
    templateId: string,
    userId: string
  ): Promise<AICollaborationResult<SharedPromptTemplate>> {
    try {
      const { data, error } = await this.supabase
        .from('shared_prompt_templates')
        .update({
          use_count: this.supabase.rpc('increment', { row_id: templateId }),
          last_used_at: new Date().toISOString(),
          last_used_by: userId,
        })
        .eq('id', templateId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: this.transformTemplate(data) };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TEMPLATE_USE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to use template',
        },
      };
    }
  }

  /**
   * Update a prompt template
   */
  async updatePromptTemplate(
    templateId: string,
    input: Partial<CreatePromptTemplateInput>
  ): Promise<AICollaborationResult<SharedPromptTemplate>> {
    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.templateText !== undefined) updateData.template_text = input.templateText;
      if (input.category !== undefined) updateData.category = input.category;
      if (input.variables !== undefined) updateData.variables = input.variables;
      if (input.isPublic !== undefined) updateData.is_public = input.isPublic;

      const { data, error } = await this.supabase
        .from('shared_prompt_templates')
        .update(updateData)
        .eq('id', templateId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: this.transformTemplate(data) };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TEMPLATE_UPDATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update template',
        },
      };
    }
  }

  /**
   * Delete a prompt template
   */
  async deletePromptTemplate(templateId: string): Promise<AICollaborationResult<void>> {
    try {
      const { error } = await this.supabase
        .from('shared_prompt_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TEMPLATE_DELETE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete template',
        },
      };
    }
  }

  // ============================================================================
  // AI DECISIONS
  // ============================================================================

  /**
   * Create an AI decision for voting
   */
  async createDecision(
    userId: string,
    input: CreateAIDecisionInput
  ): Promise<AICollaborationResult<AIDecision>> {
    try {
      const votingDeadline = input.votingDeadlineHours
        ? new Date(Date.now() + input.votingDeadlineHours * 60 * 60 * 1000).toISOString()
        : null;

      const { data, error } = await this.supabase
        .from('ai_decisions')
        .insert({
          app_id: input.appId,
          team_id: input.teamId || null,
          created_by: userId,
          title: input.title,
          description: input.description || null,
          decision_type: input.decisionType,
          ai_suggestion: input.aiSuggestion,
          ai_reasoning: input.aiReasoning || null,
          ai_alternatives: input.aiAlternatives || [],
          mode: input.mode,
          phase_number: input.phaseNumber || null,
          related_features: input.relatedFeatures || [],
          code_preview: input.codePreview || null,
          files_affected: input.filesAffected || [],
          voting_type: input.votingType || 'majority',
          voting_threshold: input.votingThreshold || 50,
          required_voters: input.requiredVoters || [],
          voting_deadline: votingDeadline,
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: this.transformDecision(data) };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DECISION_CREATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create decision',
        },
      };
    }
  }

  /**
   * Get pending decisions for a team/app
   */
  async getDecisions(
    options: { teamId?: string; appId?: string; status?: string; limit?: number }
  ): Promise<AICollaborationResult<AIDecision[]>> {
    try {
      let query = this.supabase
        .from('ai_decisions')
        .select('*, ai_decision_votes(*)')
        .order('created_at', { ascending: false });

      if (options.teamId) {
        query = query.eq('team_id', options.teamId);
      }
      if (options.appId) {
        query = query.eq('app_id', options.appId);
      }
      if (options.status) {
        query = query.eq('status', options.status);
      }
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: (data || []).map((row) => this.transformDecisionWithVotes(row)),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DECISIONS_FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch decisions',
        },
      };
    }
  }

  /**
   * Cast a vote on a decision
   */
  async castVote(
    decisionId: string,
    userId: string,
    input: CastVoteInput
  ): Promise<AICollaborationResult<AIDecisionVote>> {
    try {
      const { data, error } = await this.supabase
        .from('ai_decision_votes')
        .upsert({
          decision_id: decisionId,
          user_id: userId,
          vote: input.vote,
          selected_alternative: input.selectedAlternative || null,
          comment: input.comment || null,
          requested_changes: input.requestedChanges || null,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: this.transformVote(data) };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'VOTE_CAST_ERROR',
          message: error instanceof Error ? error.message : 'Failed to cast vote',
        },
      };
    }
  }

  /**
   * Apply an approved decision
   */
  async applyDecision(
    decisionId: string,
    userId: string,
    selectedOption?: string
  ): Promise<AICollaborationResult<AIDecision>> {
    try {
      const { data, error } = await this.supabase
        .from('ai_decisions')
        .update({
          status: 'approved',
          final_decision: selectedOption || 'original',
          applied_at: new Date().toISOString(),
          resolved_by: userId,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', decisionId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: this.transformDecision(data) };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DECISION_APPLY_ERROR',
          message: error instanceof Error ? error.message : 'Failed to apply decision',
        },
      };
    }
  }

  /**
   * Withdraw a decision (creator only)
   */
  async withdrawDecision(
    decisionId: string,
    userId: string
  ): Promise<AICollaborationResult<void>> {
    try {
      const { error } = await this.supabase
        .from('ai_decisions')
        .update({
          status: 'withdrawn',
          resolved_by: userId,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', decisionId)
        .eq('created_by', userId)
        .eq('status', 'pending');

      if (error) throw error;

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DECISION_WITHDRAW_ERROR',
          message: error instanceof Error ? error.message : 'Failed to withdraw decision',
        },
      };
    }
  }

  // ============================================================================
  // SHARED AI CONTEXT
  // ============================================================================

  /**
   * Create shared AI context
   */
  async createContext(
    teamId: string,
    userId: string,
    input: CreateAIContextInput
  ): Promise<AICollaborationResult<SharedAIContext>> {
    try {
      const { data, error } = await this.supabase
        .from('shared_ai_context')
        .insert({
          team_id: teamId,
          app_id: input.appId || null,
          context_type: input.contextType,
          title: input.title,
          content: input.content,
          priority: input.priority || 0,
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: this.transformContext(data) };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CONTEXT_CREATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create context',
        },
      };
    }
  }

  /**
   * Get shared contexts for a team
   */
  async getContexts(
    teamId: string,
    options?: { appId?: string; activeOnly?: boolean }
  ): Promise<AICollaborationResult<SharedAIContext[]>> {
    try {
      let query = this.supabase
        .from('shared_ai_context')
        .select('*')
        .eq('team_id', teamId)
        .order('priority', { ascending: false });

      if (options?.appId) {
        query = query.or(`app_id.eq.${options.appId},app_id.is.null`);
      }

      if (options?.activeOnly !== false) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data: (data || []).map((row) => this.transformContext(row)) };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CONTEXTS_FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch contexts',
        },
      };
    }
  }

  /**
   * Build combined context string for AI
   */
  async buildCombinedContext(teamId: string, appId?: string): Promise<string> {
    const result = await this.getContexts(teamId, { appId, activeOnly: true });
    if (!result.success) return '';

    const contexts = result.data;
    if (contexts.length === 0) return '';

    const sections = contexts.map((ctx) => {
      return `## ${ctx.title} (${ctx.contextType})\n${ctx.content}`;
    });

    return `# Team AI Context\n\n${sections.join('\n\n')}`;
  }

  /**
   * Update shared context
   */
  async updateContext(
    contextId: string,
    userId: string,
    input: UpdateAIContextInput
  ): Promise<AICollaborationResult<SharedAIContext>> {
    try {
      const updateData: Record<string, unknown> = {
        updated_by: userId,
        updated_at: new Date().toISOString(),
      };

      if (input.title !== undefined) updateData.title = input.title;
      if (input.content !== undefined) updateData.content = input.content;
      if (input.contextType !== undefined) updateData.context_type = input.contextType;
      if (input.priority !== undefined) updateData.priority = input.priority;
      if (input.isActive !== undefined) updateData.is_active = input.isActive;

      const { data, error } = await this.supabase
        .from('shared_ai_context')
        .update(updateData)
        .eq('id', contextId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: this.transformContext(data) };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CONTEXT_UPDATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update context',
        },
      };
    }
  }

  /**
   * Delete shared context
   */
  async deleteContext(contextId: string): Promise<AICollaborationResult<void>> {
    try {
      const { error } = await this.supabase
        .from('shared_ai_context')
        .delete()
        .eq('id', contextId);

      if (error) throw error;

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CONTEXT_DELETE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete context',
        },
      };
    }
  }

  // ============================================================================
  // CONVERSATION HANDOFFS
  // ============================================================================

  /**
   * Create a conversation handoff
   */
  async createHandoff(
    userId: string,
    input: CreateHandoffInput
  ): Promise<AICollaborationResult<AIConversationHandoff>> {
    try {
      const expiresAt = new Date(
        Date.now() + (input.expiresInHours || 24) * 60 * 60 * 1000
      ).toISOString();

      const { data, error } = await this.supabase
        .from('ai_conversation_handoffs')
        .insert({
          app_id: input.appId,
          team_id: input.teamId || null,
          from_user_id: userId,
          to_user_id: input.toUserId,
          conversation_snapshot: input.conversationSnapshot,
          mode: input.mode,
          wizard_state: input.wizardState || null,
          current_phase: input.currentPhase || null,
          handoff_reason: input.handoffReason || null,
          handoff_notes: input.handoffNotes || null,
          focus_areas: input.focusAreas || [],
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: this.transformHandoff(data) };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'HANDOFF_CREATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create handoff',
        },
      };
    }
  }

  /**
   * Get pending handoffs for a user
   */
  async getPendingHandoffs(userId: string): Promise<AICollaborationResult<AIConversationHandoff[]>> {
    try {
      const { data, error } = await this.supabase
        .from('ai_conversation_handoffs')
        .select('*')
        .eq('to_user_id', userId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, data: (data || []).map((row) => this.transformHandoff(row)) };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'HANDOFFS_FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch handoffs',
        },
      };
    }
  }

  /**
   * Respond to a handoff
   */
  async respondToHandoff(
    handoffId: string,
    userId: string,
    input: RespondToHandoffInput
  ): Promise<AICollaborationResult<AIConversationHandoff>> {
    try {
      const updateData: Record<string, unknown> = {
        status: input.accept ? 'accepted' : 'declined',
      };

      if (input.accept) {
        updateData.accepted_at = new Date().toISOString();
      } else {
        updateData.declined_reason = input.declinedReason || null;
      }

      const { data, error } = await this.supabase
        .from('ai_conversation_handoffs')
        .update(updateData)
        .eq('id', handoffId)
        .eq('to_user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: this.transformHandoff(data) };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'HANDOFF_RESPOND_ERROR',
          message: error instanceof Error ? error.message : 'Failed to respond to handoff',
        },
      };
    }
  }

  /**
   * Complete a handoff
   */
  async completeHandoff(
    handoffId: string,
    userId: string
  ): Promise<AICollaborationResult<AIConversationHandoff>> {
    try {
      const { data, error } = await this.supabase
        .from('ai_conversation_handoffs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', handoffId)
        .eq('to_user_id', userId)
        .eq('status', 'accepted')
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: this.transformHandoff(data) };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'HANDOFF_COMPLETE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to complete handoff',
        },
      };
    }
  }

  // ============================================================================
  // PHASE PLANNING
  // ============================================================================

  /**
   * Create a phase planning session
   */
  async createPlanningSession(
    userId: string,
    input: CreatePlanningSessionInput
  ): Promise<AICollaborationResult<PhasePlanningSession>> {
    try {
      const { data, error } = await this.supabase
        .from('phase_planning_sessions')
        .insert({
          app_id: input.appId,
          team_id: input.teamId || null,
          created_by: userId,
          name: input.name || 'Phase Planning Session',
          description: input.description || null,
          proposed_phases: input.proposedPhases,
          ai_generated_plan: input.aiGeneratedPlan || null,
          requires_approval: input.requiresApproval !== false,
          approval_type: input.approvalType || 'majority',
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: this.transformPlanningSession(data) };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SESSION_CREATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create session',
        },
      };
    }
  }

  /**
   * Get planning session for an app
   */
  async getPlanningSession(
    appId: string
  ): Promise<AICollaborationResult<PhasePlanningSession | null>> {
    try {
      const { data, error } = await this.supabase
        .from('phase_planning_sessions')
        .select('*, phase_suggestions(*), phase_planning_votes(*)')
        .eq('app_id', appId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return {
        success: true,
        data: data ? this.transformPlanningSessionWithDetails(data) : null,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SESSION_FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch session',
        },
      };
    }
  }

  /**
   * Add a suggestion to a planning session
   */
  async addPhaseSuggestion(
    sessionId: string,
    userId: string,
    input: CreatePhaseSuggestionInput
  ): Promise<AICollaborationResult<PhaseSuggestion>> {
    try {
      const { data, error } = await this.supabase
        .from('phase_suggestions')
        .insert({
          session_id: sessionId,
          user_id: userId,
          suggestion_type: input.suggestionType,
          target_phase_number: input.targetPhaseNumber || null,
          target_feature: input.targetFeature || null,
          suggestion_data: input.suggestionData,
          reason: input.reason || null,
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: this.transformSuggestion(data) };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SUGGESTION_CREATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create suggestion',
        },
      };
    }
  }

  /**
   * Vote on a planning session
   */
  async votePlanningSession(
    sessionId: string,
    userId: string,
    input: CastPlanningVoteInput
  ): Promise<AICollaborationResult<PhasePlanningVote>> {
    try {
      const { data, error } = await this.supabase
        .from('phase_planning_votes')
        .upsert({
          session_id: sessionId,
          user_id: userId,
          vote: input.vote,
          feedback: input.feedback || null,
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: this.transformPlanningVote(data) };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PLANNING_VOTE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to vote',
        },
      };
    }
  }

  /**
   * Update proposed phases in a session
   */
  async updateProposedPhases(
    sessionId: string,
    proposedPhases: unknown[]
  ): Promise<AICollaborationResult<PhasePlanningSession>> {
    try {
      const { data, error } = await this.supabase
        .from('phase_planning_sessions')
        .update({
          proposed_phases: proposedPhases,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: this.transformPlanningSession(data) };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PHASES_UPDATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update phases',
        },
      };
    }
  }

  /**
   * Approve a planning session
   */
  async approvePlanningSession(
    sessionId: string,
    userId: string
  ): Promise<AICollaborationResult<PhasePlanningSession>> {
    try {
      const { data, error } = await this.supabase
        .from('phase_planning_sessions')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: this.transformPlanningSession(data) };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SESSION_APPROVE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to approve session',
        },
      };
    }
  }

  /**
   * Reject a planning session
   */
  async rejectPlanningSession(
    sessionId: string,
    userId: string
  ): Promise<AICollaborationResult<PhasePlanningSession>> {
    try {
      const { data, error } = await this.supabase
        .from('phase_planning_sessions')
        .update({
          status: 'rejected',
          approved_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: this.transformPlanningSession(data) };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SESSION_REJECT_ERROR',
          message: error instanceof Error ? error.message : 'Failed to reject session',
        },
      };
    }
  }

  /**
   * Finalize a planning session and start execution
   */
  async finalizePlanningSession(
    sessionId: string,
    userId: string
  ): Promise<AICollaborationResult<PhasePlanningSession>> {
    try {
      const { data, error } = await this.supabase
        .from('phase_planning_sessions')
        .update({
          status: 'in_progress',
          execution_started_at: new Date().toISOString(),
          current_phase: 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .eq('status', 'approved')
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: this.transformPlanningSession(data) };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SESSION_FINALIZE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to finalize session',
        },
      };
    }
  }

  // ============================================================================
  // FEATURE OWNERSHIP
  // ============================================================================

  /**
   * Assign feature ownership
   */
  async assignFeatureOwner(
    userId: string,
    input: CreateFeatureOwnershipInput
  ): Promise<AICollaborationResult<FeatureOwnership>> {
    try {
      const { data, error } = await this.supabase
        .from('feature_ownership')
        .upsert({
          app_id: input.appId,
          team_id: input.teamId || null,
          feature_name: input.featureName,
          feature_description: input.featureDescription || null,
          phase_number: input.phaseNumber || null,
          owner_id: input.ownerId,
          assigned_by: userId,
          responsibilities: input.responsibilities || ['review', 'approve'],
          requires_owner_approval: input.requiresOwnerApproval !== false,
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: this.transformOwnership(data) };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'OWNERSHIP_ASSIGN_ERROR',
          message: error instanceof Error ? error.message : 'Failed to assign ownership',
        },
      };
    }
  }

  /**
   * Get feature ownerships for an app
   */
  async getFeatureOwnerships(appId: string): Promise<AICollaborationResult<FeatureOwnership[]>> {
    try {
      const { data, error } = await this.supabase
        .from('feature_ownership')
        .select('*')
        .eq('app_id', appId)
        .order('phase_number', { ascending: true });

      if (error) throw error;

      return { success: true, data: (data || []).map((row) => this.transformOwnership(row)) };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'OWNERSHIPS_FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch ownerships',
        },
      };
    }
  }

  /**
   * Get features owned by a user
   */
  async getOwnedFeatures(userId: string): Promise<AICollaborationResult<FeatureOwnership[]>> {
    try {
      const { data, error } = await this.supabase
        .from('feature_ownership')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, data: (data || []).map((row) => this.transformOwnership(row)) };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'OWNED_FEATURES_FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch owned features',
        },
      };
    }
  }

  /**
   * Update feature ownership status
   */
  async updateFeatureOwnership(
    ownershipId: string,
    input: UpdateFeatureOwnershipInput
  ): Promise<AICollaborationResult<FeatureOwnership>> {
    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (input.featureDescription !== undefined) updateData.feature_description = input.featureDescription;
      if (input.responsibilities !== undefined) updateData.responsibilities = input.responsibilities;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.requiresOwnerApproval !== undefined) updateData.requires_owner_approval = input.requiresOwnerApproval;
      if (input.ownerFeedback !== undefined) updateData.owner_feedback = input.ownerFeedback;

      if (input.status === 'approved') {
        updateData.owner_approved_at = new Date().toISOString();
      }

      const { data, error } = await this.supabase
        .from('feature_ownership')
        .update(updateData)
        .eq('id', ownershipId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: this.transformOwnership(data) };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'OWNERSHIP_UPDATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update ownership',
        },
      };
    }
  }

  /**
   * Remove feature ownership
   */
  async removeFeatureOwnership(ownershipId: string): Promise<AICollaborationResult<void>> {
    try {
      const { error } = await this.supabase
        .from('feature_ownership')
        .delete()
        .eq('id', ownershipId);

      if (error) throw error;

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'OWNERSHIP_REMOVE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to remove ownership',
        },
      };
    }
  }

  // ============================================================================
  // AI REVIEW WORKFLOW
  // ============================================================================

  /**
   * Create an AI review request
   */
  async createReviewRequest(
    userId: string,
    input: CreateReviewRequestInput
  ): Promise<AICollaborationResult<AIReviewRequest>> {
    try {
      const expiresAt = input.expiresInHours
        ? new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000).toISOString()
        : null;

      const { data, error } = await this.supabase
        .from('ai_review_requests')
        .insert({
          app_id: input.appId,
          team_id: input.teamId || null,
          created_by: userId,
          title: input.title,
          description: input.description || null,
          review_type: input.reviewType,
          ai_output: input.aiOutput,
          ai_prompt: input.aiPrompt || null,
          ai_reasoning: input.aiReasoning || null,
          mode: input.mode,
          phase_number: input.phaseNumber || null,
          related_features: input.relatedFeatures || [],
          files_to_add: input.filesToAdd || [],
          files_to_modify: input.filesToModify || [],
          files_to_delete: input.filesToDelete || [],
          assigned_reviewers: input.assignedReviewers || [],
          required_approvals: input.requiredApprovals || 1,
          auto_assign_feature_owners: input.autoAssignFeatureOwners !== false,
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: this.transformReviewRequest(data) };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REVIEW_CREATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create review',
        },
      };
    }
  }

  /**
   * Get reviews for an app or assigned to a user
   */
  async getReviews(
    options: { appId?: string; reviewerId?: string; status?: string; limit?: number }
  ): Promise<AICollaborationResult<AIReviewRequest[]>> {
    try {
      let query = this.supabase
        .from('ai_review_requests')
        .select('*, ai_review_responses(*)')
        .order('created_at', { ascending: false });

      if (options.appId) {
        query = query.eq('app_id', options.appId);
      }

      if (options.reviewerId) {
        query = query.contains('assigned_reviewers', [options.reviewerId]);
      }

      if (options.status) {
        query = query.eq('status', options.status);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: (data || []).map((row) => this.transformReviewRequestWithResponses(row)),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REVIEWS_FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch reviews',
        },
      };
    }
  }

  /**
   * Submit a review response
   */
  async submitReviewResponse(
    reviewId: string,
    userId: string,
    input: CreateReviewResponseInput
  ): Promise<AICollaborationResult<AIReviewResponse>> {
    try {
      const { data, error } = await this.supabase
        .from('ai_review_responses')
        .upsert({
          review_request_id: reviewId,
          reviewer_id: userId,
          decision: input.decision,
          overall_feedback: input.overallFeedback || null,
          inline_comments: input.inlineComments || [],
          requested_changes: input.requestedChanges || [],
          request_ai_revision: input.requestAIRevision || false,
          ai_revision_prompt: input.aiRevisionPrompt || null,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Update review status based on responses
      await this.updateReviewStatus(reviewId);

      return { success: true, data: this.transformReviewResponse(data) };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REVIEW_RESPONSE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to submit review',
        },
      };
    }
  }

  /**
   * Update review status based on responses
   */
  private async updateReviewStatus(reviewId: string): Promise<void> {
    const { data: review } = await this.supabase
      .from('ai_review_requests')
      .select('*, ai_review_responses(*)')
      .eq('id', reviewId)
      .single();

    if (!review) return;

    const responses = review.ai_review_responses || [];
    const approvals = responses.filter((r: { decision: string }) => r.decision === 'approve').length;
    const rejections = responses.filter((r: { decision: string }) => r.decision === 'reject').length;
    const changesRequested = responses.filter((r: { decision: string }) => r.decision === 'request_changes').length;

    let newStatus = review.status;

    if (rejections > 0) {
      newStatus = 'rejected';
    } else if (changesRequested > 0) {
      newStatus = 'changes_requested';
    } else if (approvals >= review.required_approvals) {
      newStatus = 'approved';
    } else if (responses.length > 0) {
      newStatus = 'in_review';
    }

    if (newStatus !== review.status) {
      await this.supabase
        .from('ai_review_requests')
        .update({
          status: newStatus,
          resolved_at: ['approved', 'rejected'].includes(newStatus)
            ? new Date().toISOString()
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewId);
    }
  }

  /**
   * Apply approved review changes
   */
  async applyReviewChanges(
    reviewId: string,
    userId: string
  ): Promise<AICollaborationResult<AIReviewRequest>> {
    try {
      const { data, error } = await this.supabase
        .from('ai_review_requests')
        .update({
          status: 'applied',
          applied_at: new Date().toISOString(),
          applied_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewId)
        .eq('status', 'approved')
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: this.transformReviewRequest(data) };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REVIEW_APPLY_ERROR',
          message: error instanceof Error ? error.message : 'Failed to apply changes',
        },
      };
    }
  }

  /**
   * Withdraw a review request (creator only, pending status only)
   */
  async withdrawReviewRequest(
    reviewId: string,
    userId: string
  ): Promise<AICollaborationResult<void>> {
    try {
      // Verify user is the creator and review is still pending
      const { data: review, error: fetchError } = await this.supabase
        .from('ai_review_requests')
        .select('created_by, status')
        .eq('id', reviewId)
        .single();

      if (fetchError) throw fetchError;

      if (review.created_by !== userId) {
        return {
          success: false,
          error: {
            code: 'REVIEW_NOT_CREATOR',
            message: 'Only the creator can withdraw a review request',
          },
        };
      }

      if (review.status !== 'pending') {
        return {
          success: false,
          error: {
            code: 'REVIEW_NOT_PENDING',
            message: 'Can only withdraw pending review requests',
          },
        };
      }

      const { error } = await this.supabase
        .from('ai_review_requests')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REVIEW_WITHDRAW_ERROR',
          message: error instanceof Error ? error.message : 'Failed to withdraw review',
        },
      };
    }
  }

  // ============================================================================
  // NOTIFICATION PREFERENCES
  // ============================================================================

  /**
   * Get notification preferences
   */
  async getNotificationPreferences(
    userId: string,
    teamId?: string
  ): Promise<AICollaborationResult<AICollaborationNotifications | null>> {
    try {
      let query = this.supabase
        .from('ai_collaboration_notifications')
        .select('*')
        .eq('user_id', userId);

      if (teamId) {
        query = query.eq('team_id', teamId);
      } else {
        query = query.is('team_id', null);
      }

      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') throw error;

      return {
        success: true,
        data: data ? this.transformNotifications(data) : null,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NOTIFICATIONS_FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch preferences',
        },
      };
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    userId: string,
    input: UpdateNotificationPreferencesInput,
    teamId?: string
  ): Promise<AICollaborationResult<AICollaborationNotifications>> {
    try {
      const { data, error } = await this.supabase
        .from('ai_collaboration_notifications')
        .upsert({
          user_id: userId,
          team_id: teamId || null,
          ...this.mapNotificationInput(input),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: this.transformNotifications(data) };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NOTIFICATIONS_UPDATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update preferences',
        },
      };
    }
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Get AI collaboration statistics
   */
  async getStats(
    teamId: string,
    appId?: string
  ): Promise<AICollaborationResult<AICollaborationStats>> {
    try {
      // Get contribution stats
      const contributionsQuery = this.supabase
        .from('ai_prompt_contributions')
        .select('user_id, resulted_in_code_change')
        .eq('team_id', teamId);

      if (appId) contributionsQuery.eq('app_id', appId);

      const { data: contributions } = await contributionsQuery;

      // Get decision stats
      const decisionsQuery = this.supabase
        .from('ai_decisions')
        .select('status')
        .eq('team_id', teamId);

      if (appId) decisionsQuery.eq('app_id', appId);

      const { data: decisions } = await decisionsQuery;

      // Get review stats
      const reviewsQuery = this.supabase
        .from('ai_review_requests')
        .select('status')
        .eq('team_id', teamId);

      if (appId) reviewsQuery.eq('app_id', appId);

      const { data: reviews } = await reviewsQuery;

      // Get ownership stats
      const ownershipsQuery = this.supabase
        .from('feature_ownership')
        .select('owner_id, status')
        .eq('team_id', teamId);

      if (appId) ownershipsQuery.eq('app_id', appId);

      const { data: ownerships } = await ownershipsQuery;

      // Calculate stats
      const stats: AICollaborationStats = {
        promptContributions: {
          total: contributions?.length || 0,
          byUser: (contributions || []).reduce((acc, c) => {
            acc[c.user_id] = (acc[c.user_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          resultedInCodeChanges: (contributions || []).filter((c) => c.resulted_in_code_change).length,
        },
        decisions: {
          total: decisions?.length || 0,
          pending: (decisions || []).filter((d) => d.status === 'pending').length,
          approved: (decisions || []).filter((d) => d.status === 'approved').length,
          rejected: (decisions || []).filter((d) => d.status === 'rejected').length,
        },
        reviews: {
          total: reviews?.length || 0,
          pending: (reviews || []).filter((r) => r.status === 'pending').length,
          approved: (reviews || []).filter((r) => r.status === 'approved').length,
          changesRequested: (reviews || []).filter((r) => r.status === 'changes_requested').length,
        },
        featureOwnership: {
          total: ownerships?.length || 0,
          byOwner: (ownerships || []).reduce((acc, o) => {
            acc[o.owner_id] = (acc[o.owner_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          completed: (ownerships || []).filter((o) => o.status === 'completed').length,
        },
      };

      return { success: true, data: stats };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'STATS_FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch stats',
        },
      };
    }
  }

  // ============================================================================
  // TRANSFORM HELPERS
  // ============================================================================

  private transformContribution(row: PromptContributionRow): AIPromptContribution {
    return {
      id: row.id,
      appId: row.app_id,
      teamId: row.team_id || undefined,
      userId: row.user_id,
      promptText: row.prompt_text,
      promptType: row.prompt_type as AIPromptContribution['promptType'],
      mode: row.mode as AIPromptContribution['mode'],
      phaseNumber: row.phase_number || undefined,
      aiResponseId: row.ai_response_id || undefined,
      aiResponseSummary: row.ai_response_summary || undefined,
      tokensUsed: row.tokens_used || undefined,
      resultedInCodeChange: row.resulted_in_code_change,
      filesAffected: row.files_affected || [],
      featuresAffected: row.features_affected || [],
      createdAt: row.created_at,
    };
  }

  private transformContributionWithUser(row: PromptContributionRow & { user_profiles?: UserProfileRow }): AIPromptContribution {
    const base = this.transformContribution(row);
    if (row.user_profiles) {
      base.user = {
        id: row.user_profiles.user_id,
        email: row.user_profiles.email,
        fullName: row.user_profiles.full_name || undefined,
        avatarUrl: row.user_profiles.avatar_url || undefined,
      };
    }
    return base;
  }

  private transformTemplate(row: Record<string, unknown>): SharedPromptTemplate {
    return {
      id: row.id as string,
      teamId: row.team_id as string,
      createdBy: row.created_by as string,
      name: row.name as string,
      description: row.description as string | undefined,
      templateText: row.template_text as string,
      category: row.category as SharedPromptTemplate['category'],
      variables: (row.variables as SharedPromptTemplate['variables']) || [],
      useCount: row.use_count as number,
      lastUsedAt: row.last_used_at as string | undefined,
      lastUsedBy: row.last_used_by as string | undefined,
      isPublic: row.is_public as boolean,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private transformDecision(row: Record<string, unknown>): AIDecision {
    return {
      id: row.id as string,
      appId: row.app_id as string,
      teamId: row.team_id as string | undefined,
      createdBy: row.created_by as string,
      title: row.title as string,
      description: row.description as string | undefined,
      decisionType: row.decision_type as AIDecision['decisionType'],
      aiSuggestion: row.ai_suggestion as string,
      aiReasoning: row.ai_reasoning as string | undefined,
      aiAlternatives: (row.ai_alternatives as AIDecision['aiAlternatives']) || [],
      mode: row.mode as AIDecision['mode'],
      phaseNumber: row.phase_number as number | undefined,
      relatedFeatures: (row.related_features as string[]) || [],
      codePreview: row.code_preview as string | undefined,
      filesAffected: (row.files_affected as string[]) || [],
      votingType: row.voting_type as AIDecision['votingType'],
      votingThreshold: row.voting_threshold as number,
      requiredVoters: (row.required_voters as string[]) || [],
      votingDeadline: row.voting_deadline as string | undefined,
      status: row.status as AIDecision['status'],
      resolvedAt: row.resolved_at as string | undefined,
      resolvedBy: row.resolved_by as string | undefined,
      finalDecision: row.final_decision as string | undefined,
      appliedAt: row.applied_at as string | undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private transformDecisionWithVotes(row: Record<string, unknown> & { ai_decision_votes?: Record<string, unknown>[] }): AIDecision {
    const base = this.transformDecision(row);
    if (row.ai_decision_votes) {
      base.votes = row.ai_decision_votes.map((v) => this.transformVote(v));
      base.voteCount = {
        approve: base.votes.filter((v) => v.vote === 'approve').length,
        reject: base.votes.filter((v) => v.vote === 'reject').length,
        abstain: base.votes.filter((v) => v.vote === 'abstain').length,
        requestChanges: base.votes.filter((v) => v.vote === 'request_changes').length,
        total: base.votes.length,
      };
    }
    return base;
  }

  private transformVote(row: Record<string, unknown>): AIDecisionVote {
    return {
      id: row.id as string,
      decisionId: row.decision_id as string,
      userId: row.user_id as string,
      vote: row.vote as AIDecisionVote['vote'],
      selectedAlternative: row.selected_alternative as number | undefined,
      comment: row.comment as string | undefined,
      requestedChanges: row.requested_changes as string | undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private transformContext(row: Record<string, unknown>): SharedAIContext {
    return {
      id: row.id as string,
      teamId: row.team_id as string,
      appId: row.app_id as string | undefined,
      contextType: row.context_type as SharedAIContext['contextType'],
      title: row.title as string,
      content: row.content as string,
      priority: row.priority as number,
      isAutoLearned: row.is_auto_learned as boolean,
      learnedFromContributionId: row.learned_from_contribution_id as string | undefined,
      isActive: row.is_active as boolean,
      createdBy: row.created_by as string,
      updatedBy: row.updated_by as string | undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private transformHandoff(row: Record<string, unknown>): AIConversationHandoff {
    return {
      id: row.id as string,
      appId: row.app_id as string,
      teamId: row.team_id as string | undefined,
      fromUserId: row.from_user_id as string,
      toUserId: row.to_user_id as string,
      conversationSnapshot: row.conversation_snapshot,
      mode: row.mode as AIConversationHandoff['mode'],
      wizardState: row.wizard_state,
      currentPhase: row.current_phase as number | undefined,
      handoffReason: row.handoff_reason as string | undefined,
      handoffNotes: row.handoff_notes as string | undefined,
      focusAreas: (row.focus_areas as string[]) || [],
      status: row.status as AIConversationHandoff['status'],
      acceptedAt: row.accepted_at as string | undefined,
      declinedReason: row.declined_reason as string | undefined,
      expiresAt: row.expires_at as string,
      createdAt: row.created_at as string,
    };
  }

  private transformPlanningSession(row: Record<string, unknown>): PhasePlanningSession {
    return {
      id: row.id as string,
      appId: row.app_id as string,
      teamId: row.team_id as string | undefined,
      createdBy: row.created_by as string,
      name: row.name as string,
      description: row.description as string | undefined,
      status: row.status as PhasePlanningSession['status'],
      proposedPhases: (row.proposed_phases as PhasePlanningSession['proposedPhases']) || [],
      aiGeneratedPlan: row.ai_generated_plan as PhasePlanningSession['aiGeneratedPlan'],
      requiresApproval: row.requires_approval as boolean,
      approvalType: row.approval_type as PhasePlanningSession['approvalType'],
      approvedAt: row.approved_at as string | undefined,
      approvedBy: row.approved_by as string | undefined,
      executionStartedAt: row.execution_started_at as string | undefined,
      currentPhase: row.current_phase as number | undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private transformPlanningSessionWithDetails(
    row: Record<string, unknown> & {
      phase_suggestions?: Record<string, unknown>[];
      phase_planning_votes?: Record<string, unknown>[];
    }
  ): PhasePlanningSession {
    const base = this.transformPlanningSession(row);
    if (row.phase_suggestions) {
      base.suggestions = row.phase_suggestions.map((s) => this.transformSuggestion(s));
    }
    if (row.phase_planning_votes) {
      base.votes = row.phase_planning_votes.map((v) => this.transformPlanningVote(v));
      base.voteCount = {
        approve: base.votes.filter((v) => v.vote === 'approve').length,
        reject: base.votes.filter((v) => v.vote === 'reject').length,
        requestChanges: base.votes.filter((v) => v.vote === 'request_changes').length,
        total: base.votes.length,
      };
    }
    return base;
  }

  private transformSuggestion(row: Record<string, unknown>): PhaseSuggestion {
    return {
      id: row.id as string,
      sessionId: row.session_id as string,
      userId: row.user_id as string,
      suggestionType: row.suggestion_type as PhaseSuggestion['suggestionType'],
      targetPhaseNumber: row.target_phase_number as number | undefined,
      targetFeature: row.target_feature as string | undefined,
      suggestionData: (row.suggestion_data as Record<string, unknown>) || {},
      reason: row.reason as string | undefined,
      status: row.status as PhaseSuggestion['status'],
      resolvedBy: row.resolved_by as string | undefined,
      resolvedAt: row.resolved_at as string | undefined,
      createdAt: row.created_at as string,
    };
  }

  private transformPlanningVote(row: Record<string, unknown>): PhasePlanningVote {
    return {
      id: row.id as string,
      sessionId: row.session_id as string,
      userId: row.user_id as string,
      vote: row.vote as PhasePlanningVote['vote'],
      feedback: row.feedback as string | undefined,
      createdAt: row.created_at as string,
    };
  }

  private transformOwnership(row: Record<string, unknown>): FeatureOwnership {
    return {
      id: row.id as string,
      appId: row.app_id as string,
      teamId: row.team_id as string | undefined,
      featureName: row.feature_name as string,
      featureDescription: row.feature_description as string | undefined,
      phaseNumber: row.phase_number as number | undefined,
      ownerId: row.owner_id as string,
      assignedBy: row.assigned_by as string,
      responsibilities: (row.responsibilities as FeatureOwnership['responsibilities']) || [],
      status: row.status as FeatureOwnership['status'],
      requiresOwnerApproval: row.requires_owner_approval as boolean,
      ownerApprovedAt: row.owner_approved_at as string | undefined,
      ownerFeedback: row.owner_feedback as string | undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private transformReviewRequest(row: Record<string, unknown>): AIReviewRequest {
    return {
      id: row.id as string,
      appId: row.app_id as string,
      teamId: row.team_id as string | undefined,
      createdBy: row.created_by as string,
      title: row.title as string,
      description: row.description as string | undefined,
      reviewType: row.review_type as AIReviewRequest['reviewType'],
      aiOutput: row.ai_output,
      aiPrompt: row.ai_prompt as string | undefined,
      aiReasoning: row.ai_reasoning as string | undefined,
      mode: row.mode as AIReviewRequest['mode'],
      phaseNumber: row.phase_number as number | undefined,
      relatedFeatures: (row.related_features as string[]) || [],
      filesToAdd: (row.files_to_add as AIReviewRequest['filesToAdd']) || [],
      filesToModify: (row.files_to_modify as AIReviewRequest['filesToModify']) || [],
      filesToDelete: (row.files_to_delete as string[]) || [],
      assignedReviewers: (row.assigned_reviewers as string[]) || [],
      requiredApprovals: row.required_approvals as number,
      autoAssignFeatureOwners: row.auto_assign_feature_owners as boolean,
      status: row.status as AIReviewRequest['status'],
      resolvedAt: row.resolved_at as string | undefined,
      appliedAt: row.applied_at as string | undefined,
      appliedBy: row.applied_by as string | undefined,
      expiresAt: row.expires_at as string | undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private transformReviewRequestWithResponses(
    row: Record<string, unknown> & { ai_review_responses?: Record<string, unknown>[] }
  ): AIReviewRequest {
    const base = this.transformReviewRequest(row);
    if (row.ai_review_responses) {
      base.responses = row.ai_review_responses.map((r) => this.transformReviewResponse(r));
      base.approvalCount = base.responses.filter((r) => r.decision === 'approve').length;
    }
    return base;
  }

  private transformReviewResponse(row: Record<string, unknown>): AIReviewResponse {
    return {
      id: row.id as string,
      reviewRequestId: row.review_request_id as string,
      reviewerId: row.reviewer_id as string,
      decision: row.decision as AIReviewResponse['decision'],
      overallFeedback: row.overall_feedback as string | undefined,
      inlineComments: (row.inline_comments as AIReviewResponse['inlineComments']) || [],
      requestedChanges: (row.requested_changes as AIReviewResponse['requestedChanges']) || [],
      requestAIRevision: row.request_ai_revision as boolean,
      aiRevisionPrompt: row.ai_revision_prompt as string | undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private transformNotifications(row: Record<string, unknown>): AICollaborationNotifications {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      teamId: row.team_id as string | undefined,
      notifyOnDecisionCreated: row.notify_on_decision_created as boolean,
      notifyOnVoteRequested: row.notify_on_vote_requested as boolean,
      notifyOnReviewAssigned: row.notify_on_review_assigned as boolean,
      notifyOnHandoffReceived: row.notify_on_handoff_received as boolean,
      notifyOnFeatureAssigned: row.notify_on_feature_assigned as boolean,
      notifyOnPhaseSuggestion: row.notify_on_phase_suggestion as boolean,
      notifyOnContextUpdated: row.notify_on_context_updated as boolean,
      inAppEnabled: row.in_app_enabled as boolean,
      emailEnabled: row.email_enabled as boolean,
      emailDigestFrequency: row.email_digest_frequency as AICollaborationNotifications['emailDigestFrequency'],
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private mapNotificationInput(input: UpdateNotificationPreferencesInput): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    if (input.notifyOnDecisionCreated !== undefined) result.notify_on_decision_created = input.notifyOnDecisionCreated;
    if (input.notifyOnVoteRequested !== undefined) result.notify_on_vote_requested = input.notifyOnVoteRequested;
    if (input.notifyOnReviewAssigned !== undefined) result.notify_on_review_assigned = input.notifyOnReviewAssigned;
    if (input.notifyOnHandoffReceived !== undefined) result.notify_on_handoff_received = input.notifyOnHandoffReceived;
    if (input.notifyOnFeatureAssigned !== undefined) result.notify_on_feature_assigned = input.notifyOnFeatureAssigned;
    if (input.notifyOnPhaseSuggestion !== undefined) result.notify_on_phase_suggestion = input.notifyOnPhaseSuggestion;
    if (input.notifyOnContextUpdated !== undefined) result.notify_on_context_updated = input.notifyOnContextUpdated;
    if (input.inAppEnabled !== undefined) result.in_app_enabled = input.inAppEnabled;
    if (input.emailEnabled !== undefined) result.email_enabled = input.emailEnabled;
    if (input.emailDigestFrequency !== undefined) result.email_digest_frequency = input.emailDigestFrequency;
    return result;
  }
}

export default AICollaborationService;
