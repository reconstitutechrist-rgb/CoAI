/**
 * TeamChatService - Real-time team chat service
 *
 * Features:
 * - Send and receive messages with real-time updates
 * - @mentions and replies
 * - Reactions on messages
 * - AI-powered chat summaries
 * - Meeting notes generation
 *
 * @example Browser (Client Component)
 * ```typescript
 * import { createClient } from '@/utils/supabase/client';
 * const supabase = createClient();
 * const chatService = new TeamChatService(supabase);
 * const result = await chatService.sendMessage(userId, { content: 'Hello!', teamId: 'xxx' });
 * ```
 */

import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import {
  TeamChatMessage,
  SendMessageInput,
  GetMessagesOptions,
  SummaryOptions,
  MeetingNotes,
  ChatReaction,
  ChatAttachment,
  AIMessageMetadata,
  ServiceResult,
  PaginatedResult,
  UserInfo,
  createServiceError,
} from '@/types/collaboration';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_MESSAGE_LIMIT = 50;
const MAX_MESSAGE_LIMIT = 100;

// ============================================================================
// TYPES
// ============================================================================

interface RealtimeMessagePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}

type MessageCallback = (message: TeamChatMessage, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void;

// ============================================================================
// TEAMCHATSERVICE CLASS
// ============================================================================

export class TeamChatService {
  private client: SupabaseClient<Database>;
  private channels: Map<string, RealtimeChannel> = new Map();

  /**
   * Create a new TeamChatService instance
   * @param client - Supabase client (browser or server)
   */
  constructor(client: SupabaseClient<Database>) {
    this.client = client;
  }

  // ==========================================================================
  // MESSAGE OPERATIONS
  // ==========================================================================

  /**
   * Send a new message
   * @param userId - User sending the message
   * @param input - Message content and metadata
   */
  async sendMessage(
    userId: string,
    input: SendMessageInput
  ): Promise<ServiceResult<TeamChatMessage>> {
    try {
      if (!input.teamId && !input.appId) {
        return {
          success: false,
          error: createServiceError('INVALID_INPUT', 'Either teamId or appId is required'),
        };
      }

      const { data, error } = await this.client
        .from('team_chat_messages')
        .insert({
          team_id: input.teamId || null,
          app_id: input.appId || null,
          user_id: userId,
          content: input.content,
          message_type: 'text',
          mentions: input.mentions || [],
          reply_to: input.replyTo || null,
          ai_generated: false,
          reactions: [],
          attachments: input.attachments || [],
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: createServiceError('SEND_FAILED', `Failed to send message: ${error.message}`),
        };
      }

      return { success: true, data: this.mapMessageFromDb(data) };
    } catch (err) {
      return {
        success: false,
        error: createServiceError('UNEXPECTED_ERROR', 'An unexpected error occurred'),
      };
    }
  }

  /**
   * Get messages with pagination
   * @param options - Query options
   */
  async getMessages(
    options: GetMessagesOptions
  ): Promise<ServiceResult<PaginatedResult<TeamChatMessage>>> {
    try {
      if (!options.teamId && !options.appId) {
        return {
          success: false,
          error: createServiceError('INVALID_INPUT', 'Either teamId or appId is required'),
        };
      }

      const limit = Math.min(options.limit || DEFAULT_MESSAGE_LIMIT, MAX_MESSAGE_LIMIT);

      let query = this.client
        .from('team_chat_messages')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (options.teamId) {
        query = query.eq('team_id', options.teamId);
      }
      if (options.appId) {
        query = query.eq('app_id', options.appId);
      }
      if (options.before) {
        query = query.lt('created_at', options.before);
      }
      if (options.after) {
        query = query.gt('created_at', options.after);
      }
      if (!options.includeDeleted) {
        query = query.is('deleted_at', null);
      }

      const { data, error, count } = await query;

      if (error) {
        return {
          success: false,
          error: createServiceError('FETCH_FAILED', `Failed to fetch messages: ${error.message}`),
        };
      }

      // Fetch user details
      const userIds = [...new Set(data.map((m) => m.user_id))];
      const userMap = await this.fetchUserMap(userIds);

      // Fetch reply-to messages if needed
      const replyToIds = data.filter((m) => m.reply_to).map((m) => m.reply_to as string);
      const replyToMap = await this.fetchReplyToMessages(replyToIds);

      const messages = data.map((row) => {
        const message = this.mapMessageFromDb(row);
        message.user = userMap.get(message.userId);
        if (message.replyTo && replyToMap.has(message.replyTo)) {
          message.replyToMessage = replyToMap.get(message.replyTo);
        }
        return message;
      });

      // Reverse to get chronological order
      messages.reverse();

      const hasMore = data.length === limit;
      const nextCursor = hasMore ? data[data.length - 1].created_at : undefined;

      return {
        success: true,
        data: {
          items: messages,
          total: count || 0,
          hasMore,
          nextCursor,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: createServiceError('UNEXPECTED_ERROR', 'An unexpected error occurred'),
      };
    }
  }

  /**
   * Edit a message
   * @param messageId - Message ID
   * @param userId - User editing (must be message author)
   * @param content - New content
   */
  async editMessage(
    messageId: string,
    userId: string,
    content: string
  ): Promise<ServiceResult<TeamChatMessage>> {
    try {
      // Verify ownership
      const { data: existing } = await this.client
        .from('team_chat_messages')
        .select('user_id')
        .eq('id', messageId)
        .single();

      if (!existing || existing.user_id !== userId) {
        return {
          success: false,
          error: createServiceError('FORBIDDEN', 'You can only edit your own messages'),
        };
      }

      const { data, error } = await this.client
        .from('team_chat_messages')
        .update({
          content,
          edited_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: createServiceError('UPDATE_FAILED', `Failed to edit message: ${error.message}`),
        };
      }

      return { success: true, data: this.mapMessageFromDb(data) };
    } catch (err) {
      return {
        success: false,
        error: createServiceError('UNEXPECTED_ERROR', 'An unexpected error occurred'),
      };
    }
  }

  /**
   * Delete a message (soft delete)
   * @param messageId - Message ID
   * @param userId - User deleting (must be message author or admin)
   */
  async deleteMessage(messageId: string, userId: string): Promise<ServiceResult<void>> {
    try {
      // For now, only allow message author to delete
      const { data: existing } = await this.client
        .from('team_chat_messages')
        .select('user_id')
        .eq('id', messageId)
        .single();

      if (!existing || existing.user_id !== userId) {
        return {
          success: false,
          error: createServiceError('FORBIDDEN', 'You can only delete your own messages'),
        };
      }

      const { error } = await this.client
        .from('team_chat_messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageId);

      if (error) {
        return {
          success: false,
          error: createServiceError('DELETE_FAILED', `Failed to delete message: ${error.message}`),
        };
      }

      return { success: true, data: undefined };
    } catch (err) {
      return {
        success: false,
        error: createServiceError('UNEXPECTED_ERROR', 'An unexpected error occurred'),
      };
    }
  }

  // ==========================================================================
  // REACTIONS
  // ==========================================================================

  /**
   * Add a reaction to a message
   * @param messageId - Message ID
   * @param userId - User reacting
   * @param emoji - Emoji to add
   */
  async addReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<ServiceResult<TeamChatMessage>> {
    try {
      // Get current reactions
      const { data: existing } = await this.client
        .from('team_chat_messages')
        .select('reactions')
        .eq('id', messageId)
        .single();

      if (!existing) {
        return {
          success: false,
          error: createServiceError('NOT_FOUND', 'Message not found'),
        };
      }

      const reactions = (existing.reactions as ChatReaction[]) || [];
      const existingReaction = reactions.find((r) => r.emoji === emoji);

      if (existingReaction) {
        // Add user to existing reaction
        if (!existingReaction.userIds.includes(userId)) {
          existingReaction.userIds.push(userId);
        }
      } else {
        // Create new reaction
        reactions.push({ emoji, userIds: [userId] });
      }

      const { data, error } = await this.client
        .from('team_chat_messages')
        .update({ reactions })
        .eq('id', messageId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: createServiceError('UPDATE_FAILED', `Failed to add reaction: ${error.message}`),
        };
      }

      return { success: true, data: this.mapMessageFromDb(data) };
    } catch (err) {
      return {
        success: false,
        error: createServiceError('UNEXPECTED_ERROR', 'An unexpected error occurred'),
      };
    }
  }

  /**
   * Remove a reaction from a message
   * @param messageId - Message ID
   * @param userId - User removing reaction
   * @param emoji - Emoji to remove
   */
  async removeReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<ServiceResult<TeamChatMessage>> {
    try {
      const { data: existing } = await this.client
        .from('team_chat_messages')
        .select('reactions')
        .eq('id', messageId)
        .single();

      if (!existing) {
        return {
          success: false,
          error: createServiceError('NOT_FOUND', 'Message not found'),
        };
      }

      const reactions = (existing.reactions as ChatReaction[]) || [];
      const reactionIndex = reactions.findIndex((r) => r.emoji === emoji);

      if (reactionIndex !== -1) {
        const reaction = reactions[reactionIndex];
        reaction.userIds = reaction.userIds.filter((id) => id !== userId);

        if (reaction.userIds.length === 0) {
          reactions.splice(reactionIndex, 1);
        }
      }

      const { data, error } = await this.client
        .from('team_chat_messages')
        .update({ reactions })
        .eq('id', messageId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: createServiceError('UPDATE_FAILED', `Failed to remove reaction: ${error.message}`),
        };
      }

      return { success: true, data: this.mapMessageFromDb(data) };
    } catch (err) {
      return {
        success: false,
        error: createServiceError('UNEXPECTED_ERROR', 'An unexpected error occurred'),
      };
    }
  }

  // ==========================================================================
  // AI FEATURES
  // ==========================================================================

  /**
   * Generate an AI summary of recent messages
   * @param options - Summary options
   * @param userId - User requesting summary
   */
  async generateSummary(
    options: SummaryOptions & { teamId?: string; appId?: string },
    userId: string
  ): Promise<ServiceResult<TeamChatMessage>> {
    try {
      // Fetch messages to summarize
      let messages: TeamChatMessage[] = [];

      if (options.messageIds) {
        // Fetch specific messages
        const { data } = await this.client
          .from('team_chat_messages')
          .select('*')
          .in('id', options.messageIds)
          .order('created_at', { ascending: true });

        messages = (data || []).map((row) => this.mapMessageFromDb(row));
      } else if (options.timeRange) {
        // Fetch messages in time range
        const result = await this.getMessages({
          teamId: options.teamId,
          appId: options.appId,
          after: options.timeRange.start,
          before: options.timeRange.end,
          limit: 100,
        });

        if (result.success) {
          messages = result.data.items;
        }
      } else {
        // Fetch recent messages
        const result = await this.getMessages({
          teamId: options.teamId,
          appId: options.appId,
          limit: 50,
        });

        if (result.success) {
          messages = result.data.items;
        }
      }

      if (messages.length === 0) {
        return {
          success: false,
          error: createServiceError('NO_MESSAGES', 'No messages to summarize'),
        };
      }

      // Generate summary using AI (this would call your AI service)
      const summaryContent = await this.callAIForSummary(messages, options.format);

      // If postToChat is true, save as a message
      if (options.postToChat) {
        const messageType =
          options.format === 'meeting_notes' ? 'meeting_notes' : 'ai_summary';

        const { data, error } = await this.client
          .from('team_chat_messages')
          .insert({
            team_id: options.teamId || null,
            app_id: options.appId || null,
            user_id: userId,
            content: summaryContent,
            message_type: messageType,
            mentions: [],
            ai_generated: true,
            ai_metadata: {
              model: 'claude-3',
              summaryType: options.format,
              messageRange: {
                start: messages[0].id,
                end: messages[messages.length - 1].id,
                count: messages.length,
              },
            } as AIMessageMetadata,
            reactions: [],
          })
          .select()
          .single();

        if (error) {
          return {
            success: false,
            error: createServiceError('SAVE_FAILED', `Failed to save summary: ${error.message}`),
          };
        }

        return { success: true, data: this.mapMessageFromDb(data) };
      }

      // Return as a virtual message (not saved)
      return {
        success: true,
        data: {
          id: 'virtual',
          teamId: options.teamId,
          appId: options.appId,
          userId,
          content: summaryContent,
          messageType: options.format === 'meeting_notes' ? 'meeting_notes' : 'ai_summary',
          mentions: [],
          aiGenerated: true,
          aiMetadata: {
            summaryType: options.format,
            messageRange: {
              start: messages[0].id,
              end: messages[messages.length - 1].id,
              count: messages.length,
            },
          },
          reactions: [],
          attachments: [],
          createdAt: new Date().toISOString(),
        },
      };
    } catch (err) {
      return {
        success: false,
        error: createServiceError('UNEXPECTED_ERROR', 'An unexpected error occurred'),
      };
    }
  }

  /**
   * Generate meeting notes from a discussion
   * @param teamId - Team ID
   * @param timeRange - Time range to analyze
   * @param userId - User requesting notes
   */
  async generateMeetingNotes(
    teamId: string,
    timeRange: { start: string; end: string },
    userId: string
  ): Promise<ServiceResult<MeetingNotes>> {
    try {
      // Fetch messages in range
      const result = await this.getMessages({
        teamId,
        after: timeRange.start,
        before: timeRange.end,
        limit: 100,
      });

      if (!result.success || result.data.items.length === 0) {
        return {
          success: false,
          error: createServiceError('NO_MESSAGES', 'No messages found in the time range'),
        };
      }

      const messages = result.data.items;
      const participants = [...new Set(messages.map((m) => m.userId))];

      // Fetch participant info
      const userMap = await this.fetchUserMap(participants);
      const participantInfo = participants
        .map((id) => userMap.get(id))
        .filter((u): u is UserInfo => u !== undefined);

      // Generate meeting notes using AI (placeholder)
      const notes = await this.callAIForMeetingNotes(messages, participantInfo);

      return {
        success: true,
        data: {
          title: `Discussion Notes - ${new Date(timeRange.start).toLocaleDateString()}`,
          date: timeRange.start,
          participants: participantInfo,
          ...notes,
          rawContent: messages.map((m) => m.content).join('\n'),
        },
      };
    } catch (err) {
      return {
        success: false,
        error: createServiceError('UNEXPECTED_ERROR', 'An unexpected error occurred'),
      };
    }
  }

  // ==========================================================================
  // REAL-TIME SUBSCRIPTIONS
  // ==========================================================================

  /**
   * Subscribe to real-time message updates
   * @param channelKey - Unique key for the channel (team or app ID)
   * @param options - Filter options (teamId or appId)
   * @param callback - Callback for new messages
   */
  subscribe(
    channelKey: string,
    options: { teamId?: string; appId?: string },
    callback: MessageCallback
  ): () => void {
    const channelName = `chat:${channelKey}`;

    // Clean up existing subscription
    this.unsubscribe(channelKey);

    const channel = this.client
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_chat_messages',
          filter: options.teamId
            ? `team_id=eq.${options.teamId}`
            : `app_id=eq.${options.appId}`,
        },
        async (payload: RealtimeMessagePayload) => {
          const eventType = payload.eventType;
          const record = eventType === 'DELETE' ? payload.old : payload.new;
          const message = this.mapMessageFromDb(record);

          // Fetch user info for the message
          if (message.userId) {
            const userMap = await this.fetchUserMap([message.userId]);
            message.user = userMap.get(message.userId);
          }

          callback(message, eventType);
        }
      )
      .subscribe();

    this.channels.set(channelKey, channel);

    // Return unsubscribe function
    return () => this.unsubscribe(channelKey);
  }

  /**
   * Unsubscribe from real-time updates
   * @param channelKey - Channel key to unsubscribe from
   */
  unsubscribe(channelKey: string): void {
    const channel = this.channels.get(channelKey);
    if (channel) {
      this.client.removeChannel(channel);
      this.channels.delete(channelKey);
    }
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll(): void {
    for (const [key] of this.channels) {
      this.unsubscribe(key);
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Fetch user info for a list of user IDs
   */
  private async fetchUserMap(userIds: string[]): Promise<Map<string, UserInfo>> {
    if (userIds.length === 0) return new Map();

    const { data } = await this.client
      .from('user_profiles')
      .select('user_id, email, full_name, avatar_url')
      .in('user_id', userIds);

    return new Map(
      data?.map((u) => [
        u.user_id,
        {
          id: u.user_id,
          email: u.email,
          fullName: u.full_name || undefined,
          avatarUrl: u.avatar_url || undefined,
        },
      ]) || []
    );
  }

  /**
   * Fetch reply-to message previews
   */
  private async fetchReplyToMessages(
    messageIds: string[]
  ): Promise<Map<string, Pick<TeamChatMessage, 'id' | 'content' | 'userId' | 'user'>>> {
    if (messageIds.length === 0) return new Map();

    const { data } = await this.client
      .from('team_chat_messages')
      .select('id, content, user_id')
      .in('id', messageIds);

    if (!data) return new Map();

    const userIds = [...new Set(data.map((m) => m.user_id))];
    const userMap = await this.fetchUserMap(userIds);

    return new Map(
      data.map((row) => [
        row.id,
        {
          id: row.id,
          content: row.content.substring(0, 100),
          userId: row.user_id,
          user: userMap.get(row.user_id),
        },
      ])
    );
  }

  /**
   * Call AI service for summary generation (placeholder)
   */
  private async callAIForSummary(
    messages: TeamChatMessage[],
    format: 'summary' | 'meeting_notes' | 'action_items'
  ): Promise<string> {
    // This would integrate with your AI service
    // For now, return a placeholder
    const messageCount = messages.length;
    const timeSpan = messages.length > 1
      ? `from ${new Date(messages[0].createdAt).toLocaleString()} to ${new Date(messages[messages.length - 1].createdAt).toLocaleString()}`
      : '';

    if (format === 'action_items') {
      return `**Action Items from Discussion**\n\nBased on ${messageCount} messages ${timeSpan}:\n\n- [ ] Review and follow up on discussion points\n- [ ] Assign owners to identified tasks\n- [ ] Schedule follow-up if needed`;
    }

    if (format === 'meeting_notes') {
      return `**Meeting Notes**\n\n**Attendees:** ${[...new Set(messages.map((m) => m.user?.fullName || m.user?.email || 'Unknown'))].join(', ')}\n\n**Summary:** A productive discussion covering ${messageCount} messages.\n\n**Key Points:**\n- Discussion captured ${timeSpan}\n- Multiple topics were covered\n\n**Next Steps:**\n- Review action items\n- Follow up on open questions`;
    }

    return `**Summary** (${messageCount} messages ${timeSpan})\n\nThis is a summary of the recent discussion. The conversation covered various topics and included input from team members.`;
  }

  /**
   * Call AI service for meeting notes generation (placeholder)
   */
  private async callAIForMeetingNotes(
    messages: TeamChatMessage[],
    participants: UserInfo[]
  ): Promise<{ summary: string[]; decisions: string[]; actionItems: Array<{ description: string; assignee?: string; dueDate?: string }> }> {
    // This would integrate with your AI service
    // For now, return a placeholder
    return {
      summary: [
        `Discussion with ${participants.length} participants`,
        `${messages.length} messages exchanged`,
        'Topics covered include project updates and next steps',
      ],
      decisions: [
        'Continue with current approach',
        'Schedule follow-up meeting',
      ],
      actionItems: [
        { description: 'Review discussion points', assignee: participants[0]?.id },
        { description: 'Share notes with team' },
      ],
    };
  }

  /**
   * Map database row to TeamChatMessage type
   */
  private mapMessageFromDb(row: Record<string, unknown>): TeamChatMessage {
    return {
      id: row.id as string,
      teamId: row.team_id as string | undefined,
      appId: row.app_id as string | undefined,
      userId: row.user_id as string,
      content: row.content as string,
      messageType: (row.message_type as TeamChatMessage['messageType']) || 'text',
      mentions: (row.mentions as string[]) || [],
      replyTo: row.reply_to as string | undefined,
      aiGenerated: (row.ai_generated as boolean) || false,
      aiMetadata: row.ai_metadata as AIMessageMetadata | undefined,
      reactions: (row.reactions as ChatReaction[]) || [],
      attachments: (row.attachments as ChatAttachment[]) || [],
      editedAt: row.edited_at as string | undefined,
      deletedAt: row.deleted_at as string | undefined,
      createdAt: row.created_at as string,
    };
  }
}

export default TeamChatService;
