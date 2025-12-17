/**
 * useTeamChat Hook - Real-time team chat management
 *
 * Provides functionality for sending messages, reactions, and AI summaries.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { TeamChatService } from '@/services/TeamChatService';
import { useAuth } from '@/contexts/AuthContext';
import type {
  TeamChatMessage,
  SendMessageInput,
  SummaryOptions,
  MeetingNotes,
} from '@/types/collaboration';

/**
 * Options for useTeamChat hook
 */
export interface UseTeamChatOptions {
  /** Team ID for team chat */
  teamId?: string | null;
  /** App ID for app-specific chat */
  appId?: string | null;
  /** Whether to auto-load messages on mount */
  autoLoad?: boolean;
  /** Whether to subscribe to real-time updates */
  realtime?: boolean;
}

/**
 * Return type for useTeamChat hook
 */
export interface UseTeamChatReturn {
  // State
  /** Chat messages */
  messages: TeamChatMessage[];
  /** Whether messages are being loaded */
  isLoading: boolean;
  /** Whether more messages are being loaded */
  isLoadingMore: boolean;
  /** Whether there are more messages to load */
  hasMore: boolean;
  /** Error message if any */
  error: string | null;
  /** Whether currently sending a message */
  isSending: boolean;

  // Message actions
  /** Load messages */
  loadMessages: () => Promise<void>;
  /** Load more (older) messages */
  loadMoreMessages: () => Promise<void>;
  /** Send a new message */
  sendMessage: (content: string, options?: Partial<SendMessageInput>) => Promise<boolean>;
  /** Edit a message */
  editMessage: (messageId: string, content: string) => Promise<boolean>;
  /** Delete a message */
  deleteMessage: (messageId: string) => Promise<boolean>;

  // Reaction actions
  /** Add a reaction to a message */
  addReaction: (messageId: string, emoji: string) => Promise<boolean>;
  /** Remove a reaction from a message */
  removeReaction: (messageId: string, emoji: string) => Promise<boolean>;

  // AI actions
  /** Generate a summary of recent messages */
  generateSummary: (options?: Partial<SummaryOptions>) => Promise<TeamChatMessage | null>;
  /** Generate meeting notes */
  generateMeetingNotes: (timeRange: { start: string; end: string }) => Promise<MeetingNotes | null>;

  // Utilities
  /** Clear all messages (local state only) */
  clearMessages: () => void;
  /** Mark messages as read (for unread tracking) */
  markAsRead: () => void;
}

/**
 * Hook for managing team chat
 *
 * @param options - Configuration options
 * @returns Chat management methods and state
 *
 * @example
 * ```tsx
 * const { messages, sendMessage, isLoading } = useTeamChat({
 *   teamId: 'team-123',
 *   realtime: true,
 * });
 *
 * const handleSend = async () => {
 *   await sendMessage('Hello team!');
 * };
 * ```
 */
export function useTeamChat(options: UseTeamChatOptions): UseTeamChatReturn {
  const { teamId, appId, autoLoad = true, realtime = true } = options;

  const [messages, setMessages] = useState<TeamChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const serviceRef = useRef<TeamChatService | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const oldestMessageRef = useRef<string | null>(null);

  // Get current user from auth context
  const { user: currentUser } = useAuth();

  // Initialize service
  useEffect(() => {
    const supabase = createClient();
    serviceRef.current = new TeamChatService(supabase);

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      serviceRef.current?.unsubscribeAll();
    };
  }, []);

  /**
   * Load messages
   */
  const loadMessages = useCallback(async () => {
    if (!serviceRef.current || (!teamId && !appId)) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await serviceRef.current.getMessages({
        teamId: teamId || undefined,
        appId: appId || undefined,
        limit: 50,
      });

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to load messages');
      }

      setMessages(result.data.items);
      setHasMore(result.data.hasMore);

      if (result.data.items.length > 0) {
        oldestMessageRef.current = result.data.items[0].createdAt;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load messages';
      setError(message);
      console.error('Error loading messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [teamId, appId]);

  /**
   * Load more (older) messages
   */
  const loadMoreMessages = useCallback(async () => {
    if (!serviceRef.current || (!teamId && !appId) || !hasMore || isLoadingMore) return;

    setIsLoadingMore(true);

    try {
      const result = await serviceRef.current.getMessages({
        teamId: teamId || undefined,
        appId: appId || undefined,
        before: oldestMessageRef.current || undefined,
        limit: 50,
      });

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to load more messages');
      }

      if (result.data.items.length > 0) {
        setMessages((prev) => [...result.data.items, ...prev]);
        oldestMessageRef.current = result.data.items[0].createdAt;
      }
      setHasMore(result.data.hasMore);
    } catch (err) {
      console.error('Error loading more messages:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [teamId, appId, hasMore, isLoadingMore]);

  /**
   * Send a new message
   */
  const sendMessage = useCallback(
    async (content: string, messageOptions?: Partial<SendMessageInput>): Promise<boolean> => {
      if (!serviceRef.current || !currentUser?.id || (!teamId && !appId)) return false;

      setIsSending(true);
      setError(null);

      try {
        const result = await serviceRef.current.sendMessage(currentUser.id, {
          content,
          teamId: teamId || undefined,
          appId: appId || undefined,
          ...messageOptions,
        });

        if (!result.success) {
          throw new Error(result.error?.message || 'Failed to send message');
        }

        // Add to local state (will also come via realtime)
        if (!realtime) {
          setMessages((prev) => [...prev, result.data]);
        }

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to send message';
        setError(message);
        console.error('Error sending message:', err);
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [teamId, appId, currentUser?.id, realtime]
  );

  /**
   * Edit a message
   */
  const editMessage = useCallback(
    async (messageId: string, content: string): Promise<boolean> => {
      if (!serviceRef.current || !currentUser?.id) return false;

      setError(null);

      try {
        const result = await serviceRef.current.editMessage(messageId, currentUser.id, content);

        if (!result.success) {
          throw new Error(result.error?.message || 'Failed to edit message');
        }

        // Update local state
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? result.data : m))
        );

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to edit message';
        setError(message);
        console.error('Error editing message:', err);
        return false;
      }
    },
    [currentUser?.id]
  );

  /**
   * Delete a message
   */
  const deleteMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      if (!serviceRef.current || !currentUser?.id) return false;

      setError(null);

      try {
        const result = await serviceRef.current.deleteMessage(messageId, currentUser.id);

        if (!result.success) {
          throw new Error(result.error?.message || 'Failed to delete message');
        }

        // Remove from local state
        setMessages((prev) => prev.filter((m) => m.id !== messageId));

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete message';
        setError(message);
        console.error('Error deleting message:', err);
        return false;
      }
    },
    [currentUser?.id]
  );

  /**
   * Add a reaction to a message
   */
  const addReaction = useCallback(
    async (messageId: string, emoji: string): Promise<boolean> => {
      if (!serviceRef.current || !currentUser?.id) return false;

      try {
        const result = await serviceRef.current.addReaction(messageId, currentUser.id, emoji);

        if (!result.success) {
          throw new Error(result.error?.message || 'Failed to add reaction');
        }

        // Update local state
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? result.data : m))
        );

        return true;
      } catch (err) {
        console.error('Error adding reaction:', err);
        return false;
      }
    },
    [currentUser?.id]
  );

  /**
   * Remove a reaction from a message
   */
  const removeReaction = useCallback(
    async (messageId: string, emoji: string): Promise<boolean> => {
      if (!serviceRef.current || !currentUser?.id) return false;

      try {
        const result = await serviceRef.current.removeReaction(messageId, currentUser.id, emoji);

        if (!result.success) {
          throw new Error(result.error?.message || 'Failed to remove reaction');
        }

        // Update local state
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? result.data : m))
        );

        return true;
      } catch (err) {
        console.error('Error removing reaction:', err);
        return false;
      }
    },
    [currentUser?.id]
  );

  /**
   * Generate a summary of recent messages
   */
  const generateSummary = useCallback(
    async (summaryOptions?: Partial<SummaryOptions>): Promise<TeamChatMessage | null> => {
      if (!serviceRef.current || !currentUser?.id || (!teamId && !appId)) return null;

      setError(null);

      try {
        const result = await serviceRef.current.generateSummary(
          {
            format: 'summary',
            postToChat: true,
            teamId: teamId || undefined,
            appId: appId || undefined,
            ...summaryOptions,
          },
          currentUser.id
        );

        if (!result.success) {
          throw new Error(result.error?.message || 'Failed to generate summary');
        }

        // Add to messages if posted to chat
        if (summaryOptions?.postToChat !== false) {
          setMessages((prev) => [...prev, result.data]);
        }

        return result.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate summary';
        setError(message);
        console.error('Error generating summary:', err);
        return null;
      }
    },
    [teamId, appId, currentUser?.id]
  );

  /**
   * Generate meeting notes
   */
  const generateMeetingNotes = useCallback(
    async (timeRange: { start: string; end: string }): Promise<MeetingNotes | null> => {
      if (!serviceRef.current || !currentUser?.id || !teamId) return null;

      setError(null);

      try {
        const result = await serviceRef.current.generateMeetingNotes(
          teamId,
          timeRange,
          currentUser.id
        );

        if (!result.success) {
          throw new Error(result.error?.message || 'Failed to generate meeting notes');
        }

        return result.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate meeting notes';
        setError(message);
        console.error('Error generating meeting notes:', err);
        return null;
      }
    },
    [teamId, currentUser?.id]
  );

  /**
   * Clear all messages (local state only)
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    oldestMessageRef.current = null;
    setHasMore(true);
  }, []);

  /**
   * Mark messages as read
   */
  const markAsRead = useCallback(() => {
    // This would update unread count in the store
    // Implementation depends on how you track unread messages
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    if (!serviceRef.current || !realtime || (!teamId && !appId)) return;

    const channelKey = teamId || appId || '';

    unsubscribeRef.current = serviceRef.current.subscribe(
      channelKey,
      { teamId: teamId || undefined, appId: appId || undefined },
      (message, eventType) => {
        if (eventType === 'INSERT') {
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === message.id)) return prev;
            return [...prev, message];
          });
        } else if (eventType === 'UPDATE') {
          setMessages((prev) =>
            prev.map((m) => (m.id === message.id ? message : m))
          );
        } else if (eventType === 'DELETE') {
          setMessages((prev) => prev.filter((m) => m.id !== message.id));
        }
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [teamId, appId, realtime]);

  // Auto-load on mount and when IDs change
  useEffect(() => {
    if (autoLoad && (teamId || appId)) {
      clearMessages();
      loadMessages();
    }
  }, [autoLoad, teamId, appId, loadMessages, clearMessages]);

  // Clear state when IDs change to null
  useEffect(() => {
    if (!teamId && !appId) {
      clearMessages();
      setError(null);
    }
  }, [teamId, appId, clearMessages]);

  return {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    isSending,
    loadMessages,
    loadMoreMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    generateSummary,
    generateMeetingNotes,
    clearMessages,
    markAsRead,
  };
}

export default useTeamChat;
