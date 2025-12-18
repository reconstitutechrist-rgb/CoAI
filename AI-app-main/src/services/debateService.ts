/**
 * Debate Service
 *
 * Database service layer for debate persistence.
 * Handles CRUD operations for debate sessions, messages, and analytics.
 */

import { createClient } from "@supabase/supabase-js";
import type {
  DebateSession,
  DebateMessage,
  DebateConsensus,
  DebateCost,
  DebateStyle,
  DebateModelId,
  DebateParticipant,
  DebateInterjection,
  DebateTemplate,
} from "@/types/aiCollaboration";

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================================================
// TYPES
// ============================================================================

interface SearchFilters {
  appId?: string;
  teamId?: string;
  style?: DebateStyle;
  status?: DebateSession["status"];
  participantModel?: DebateModelId;
  dateFrom?: string;
  dateTo?: string;
  query?: string;
}

interface PaginationParams {
  page?: number;
  limit?: number;
}

interface AnalyticsData {
  totalDebates: number;
  completedDebates: number;
  averageRounds: number;
  averageCost: number;
  agreementRate: number;
  modelUsage: Record<DebateModelId, number>;
  styleDistribution: Record<DebateStyle, number>;
  topicsOverTime: { date: string; count: number }[];
}

// ============================================================================
// SESSION OPERATIONS
// ============================================================================

/**
 * Create a new debate session
 */
export async function createSession(
  session: Omit<DebateSession, "id" | "createdAt" | "updatedAt">
): Promise<DebateSession> {
  const { data, error } = await supabase
    .from("debate_sessions")
    .insert({
      app_id: session.appId,
      team_id: session.teamId,
      user_question: session.userQuestion,
      style: session.style || "cooperative",
      status: session.status,
      max_rounds: session.maxRounds,
      round_count: session.roundCount,
      participants: session.participants,
      consensus: session.consensus,
      cost: session.cost,
    })
    .select()
    .single();

  if (error) {
    console.error("[DebateService] Error creating session:", error);
    throw new Error(`Failed to create session: ${error.message}`);
  }

  return mapSessionFromDb(data);
}

/**
 * Get a session by ID
 */
export async function getSession(sessionId: string): Promise<DebateSession | null> {
  const { data, error } = await supabase
    .from("debate_sessions")
    .select("*, debate_messages(*)")
    .eq("id", sessionId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    console.error("[DebateService] Error getting session:", error);
    throw new Error(`Failed to get session: ${error.message}`);
  }

  return mapSessionFromDb(data);
}

/**
 * Update a session
 */
export async function updateSession(
  sessionId: string,
  updates: Partial<Pick<DebateSession, "status" | "roundCount" | "consensus" | "cost">>
): Promise<DebateSession> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.status) updateData.status = updates.status;
  if (updates.roundCount !== undefined) updateData.round_count = updates.roundCount;
  if (updates.consensus) updateData.consensus = updates.consensus;
  if (updates.cost) updateData.cost = updates.cost;

  const { data, error } = await supabase
    .from("debate_sessions")
    .update(updateData)
    .eq("id", sessionId)
    .select()
    .single();

  if (error) {
    console.error("[DebateService] Error updating session:", error);
    throw new Error(`Failed to update session: ${error.message}`);
  }

  return mapSessionFromDb(data);
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from("debate_sessions")
    .delete()
    .eq("id", sessionId);

  if (error) {
    console.error("[DebateService] Error deleting session:", error);
    throw new Error(`Failed to delete session: ${error.message}`);
  }
}

// ============================================================================
// MESSAGE OPERATIONS
// ============================================================================

/**
 * Add a message to a session
 */
export async function addMessage(
  sessionId: string,
  message: Omit<DebateMessage, "id" | "timestamp">
): Promise<DebateMessage> {
  const { data, error } = await supabase
    .from("debate_messages")
    .insert({
      session_id: sessionId,
      model_id: message.modelId,
      model_display_name: message.modelDisplayName,
      role: message.role,
      content: message.content,
      turn_number: message.turnNumber,
      is_agreement: message.isAgreement,
      tokens_used: message.tokensUsed,
    })
    .select()
    .single();

  if (error) {
    console.error("[DebateService] Error adding message:", error);
    throw new Error(`Failed to add message: ${error.message}`);
  }

  return mapMessageFromDb(data);
}

/**
 * Get messages for a session
 */
export async function getMessages(sessionId: string): Promise<DebateMessage[]> {
  const { data, error } = await supabase
    .from("debate_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("turn_number", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[DebateService] Error getting messages:", error);
    throw new Error(`Failed to get messages: ${error.message}`);
  }

  return data.map(mapMessageFromDb);
}

// ============================================================================
// SEARCH AND FILTER
// ============================================================================

/**
 * Search debate sessions with filters
 */
export async function searchSessions(
  filters: SearchFilters,
  pagination: PaginationParams = {}
): Promise<{ sessions: DebateSession[]; total: number }> {
  const { page = 1, limit = 20 } = pagination;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("debate_sessions")
    .select("*", { count: "exact" });

  // Apply filters
  if (filters.appId) {
    query = query.eq("app_id", filters.appId);
  }
  if (filters.teamId) {
    query = query.eq("team_id", filters.teamId);
  }
  if (filters.style) {
    query = query.eq("style", filters.style);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("created_at", filters.dateTo);
  }
  if (filters.query) {
    query = query.ilike("user_question", `%${filters.query}%`);
  }
  if (filters.participantModel) {
    query = query.contains("participants", [{ modelId: filters.participantModel }]);
  }

  // Apply pagination and ordering
  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("[DebateService] Error searching sessions:", error);
    throw new Error(`Failed to search sessions: ${error.message}`);
  }

  return {
    sessions: data.map(mapSessionFromDb),
    total: count || 0,
  };
}

/**
 * Get sessions for an app
 */
export async function getSessionsByApp(
  appId: string,
  pagination?: PaginationParams
): Promise<{ sessions: DebateSession[]; total: number }> {
  return searchSessions({ appId }, pagination);
}

// ============================================================================
// INTERJECTIONS
// ============================================================================

/**
 * Add an interjection to a session
 */
export async function addInterjection(
  interjection: Omit<DebateInterjection, "id" | "timestamp">
): Promise<DebateInterjection> {
  const { data, error } = await supabase
    .from("debate_interjections")
    .insert({
      session_id: interjection.sessionId,
      user_id: interjection.userId,
      content: interjection.content,
      interjection_type: interjection.interjectionType,
      target_message_id: interjection.targetMessageId,
      after_turn: interjection.afterTurn,
      acknowledged_by: interjection.acknowledgedBy,
    })
    .select()
    .single();

  if (error) {
    console.error("[DebateService] Error adding interjection:", error);
    throw new Error(`Failed to add interjection: ${error.message}`);
  }

  return mapInterjectionFromDb(data);
}

/**
 * Get interjections for a session
 */
export async function getInterjections(sessionId: string): Promise<DebateInterjection[]> {
  const { data, error } = await supabase
    .from("debate_interjections")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[DebateService] Error getting interjections:", error);
    throw new Error(`Failed to get interjections: ${error.message}`);
  }

  return data.map(mapInterjectionFromDb);
}

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * Get analytics data
 */
export async function getAnalytics(
  filters: { teamId?: string; appId?: string; dateFrom?: string; dateTo?: string } = {}
): Promise<AnalyticsData> {
  let query = supabase.from("debate_analytics").select("*");

  if (filters.teamId) {
    query = query.eq("team_id", filters.teamId);
  }
  if (filters.dateFrom) {
    query = query.gte("date", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("date", filters.dateTo);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[DebateService] Error getting analytics:", error);
    // Return empty analytics on error
    return {
      totalDebates: 0,
      completedDebates: 0,
      averageRounds: 0,
      averageCost: 0,
      agreementRate: 0,
      modelUsage: {} as Record<DebateModelId, number>,
      styleDistribution: {} as Record<DebateStyle, number>,
      topicsOverTime: [],
    };
  }

  // Aggregate data
  const analytics: AnalyticsData = {
    totalDebates: data.reduce((sum, d) => sum + (d.total_debates || 0), 0),
    completedDebates: data.reduce((sum, d) => sum + (d.completed_debates || 0), 0),
    averageRounds:
      data.reduce((sum, d) => sum + (d.avg_rounds || 0), 0) / (data.length || 1),
    averageCost:
      data.reduce((sum, d) => sum + (d.avg_cost || 0), 0) / (data.length || 1),
    agreementRate:
      data.reduce((sum, d) => sum + (d.agreement_rate || 0), 0) / (data.length || 1),
    modelUsage: {} as Record<DebateModelId, number>,
    styleDistribution: {} as Record<DebateStyle, number>,
    topicsOverTime: data.map((d) => ({
      date: d.date,
      count: d.total_debates || 0,
    })),
  };

  // Aggregate model usage
  for (const row of data) {
    if (row.model_usage) {
      for (const [model, count] of Object.entries(row.model_usage)) {
        analytics.modelUsage[model as DebateModelId] =
          (analytics.modelUsage[model as DebateModelId] || 0) + (count as number);
      }
    }
  }

  // Aggregate style distribution
  for (const row of data) {
    if (row.style_distribution) {
      for (const [style, count] of Object.entries(row.style_distribution)) {
        analytics.styleDistribution[style as DebateStyle] =
          (analytics.styleDistribution[style as DebateStyle] || 0) + (count as number);
      }
    }
  }

  return analytics;
}

// ============================================================================
// TEMPLATES
// ============================================================================

/**
 * Get templates (from database or fallback to built-in)
 */
export async function getTemplates(
  filters: { teamId?: string; isPublic?: boolean } = {}
): Promise<DebateTemplate[]> {
  let query = supabase.from("debate_templates").select("*");

  if (filters.teamId) {
    query = query.or(`team_id.eq.${filters.teamId},is_public.eq.true`);
  }
  if (filters.isPublic !== undefined) {
    query = query.eq("is_public", filters.isPublic);
  }

  const { data, error } = await query.order("use_count", { ascending: false });

  if (error) {
    console.error("[DebateService] Error getting templates:", error);
    return []; // Return empty on error
  }

  return data.map(mapTemplateFromDb);
}

/**
 * Increment template use count
 */
export async function incrementTemplateUse(templateId: string): Promise<void> {
  const { error } = await supabase.rpc("increment_template_use", {
    template_id: templateId,
  });

  if (error) {
    console.error("[DebateService] Error incrementing template use:", error);
  }
}

// ============================================================================
// MAPPERS
// ============================================================================

function mapSessionFromDb(data: Record<string, unknown>): DebateSession {
  return {
    id: data.id as string,
    appId: data.app_id as string,
    teamId: data.team_id as string | undefined,
    userQuestion: data.user_question as string,
    style: data.style as DebateStyle,
    messages: (data.debate_messages as unknown[])?.map(mapMessageFromDb) || [],
    participants: data.participants as DebateParticipant[],
    status: data.status as DebateSession["status"],
    roundCount: data.round_count as number,
    maxRounds: data.max_rounds as number,
    consensus: data.consensus as DebateConsensus | undefined,
    cost: data.cost as DebateCost,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function mapMessageFromDb(data: Record<string, unknown>): DebateMessage {
  return {
    id: data.id as string,
    modelId: data.model_id as DebateModelId,
    modelDisplayName: data.model_display_name as string,
    role: data.role as DebateMessage["role"],
    content: data.content as string,
    turnNumber: data.turn_number as number,
    isAgreement: data.is_agreement as boolean,
    tokensUsed: data.tokens_used as { input: number; output: number },
    timestamp: data.created_at as string,
  };
}

function mapInterjectionFromDb(data: Record<string, unknown>): DebateInterjection {
  return {
    id: data.id as string,
    sessionId: data.session_id as string,
    userId: data.user_id as string,
    content: data.content as string,
    interjectionType: data.interjection_type as DebateInterjection["interjectionType"],
    targetMessageId: data.target_message_id as string | undefined,
    afterTurn: data.after_turn as number,
    acknowledgedBy: data.acknowledged_by as DebateModelId[],
    timestamp: data.created_at as string,
  };
}

function mapTemplateFromDb(data: Record<string, unknown>): DebateTemplate {
  return {
    id: data.id as string,
    teamId: data.team_id as string | undefined,
    createdBy: data.created_by as string | undefined,
    name: data.name as string,
    description: data.description as string | undefined,
    templateType: data.template_type as DebateTemplate["templateType"],
    defaultStyle: data.default_style as DebateStyle,
    defaultMaxRounds: data.default_max_rounds as number,
    defaultParticipants: data.default_participants as DebateTemplate["defaultParticipants"],
    systemPromptOverrides: data.system_prompt_overrides as Record<string, string> | undefined,
    useCount: data.use_count as number,
    isPublic: data.is_public as boolean,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const debateService = {
  // Sessions
  createSession,
  getSession,
  updateSession,
  deleteSession,
  searchSessions,
  getSessionsByApp,

  // Messages
  addMessage,
  getMessages,

  // Interjections
  addInterjection,
  getInterjections,

  // Analytics
  getAnalytics,

  // Templates
  getTemplates,
  incrementTemplateUse,
};

export default debateService;
