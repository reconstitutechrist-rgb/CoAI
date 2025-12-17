'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  MessageSquareIcon,
  UsersIcon,
  XIcon,
  ChevronDownIcon,
  LoaderIcon,
  RefreshIcon,
} from '../ui/Icons';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { useTeamChat } from '@/hooks/useTeamChat';
import { useAuth } from '@/contexts/AuthContext';
import type { TeamChatMessage, UserInfo } from '@/types/collaboration';

export interface TeamChatPanelProps {
  /** Team ID for team-wide chat */
  teamId?: string | null;
  /** App ID for app-specific chat */
  appId?: string | null;
  /** Team members for @mentions */
  members?: UserInfo[];
  /** Whether the panel is open */
  isOpen?: boolean;
  /** Callback to close the panel */
  onClose?: () => void;
  /** Whether to show as full panel or sidebar */
  variant?: 'panel' | 'sidebar';
  /** Panel height (for panel variant) */
  height?: string;
}

/**
 * TeamChatPanel - Main chat interface for team collaboration
 */
export function TeamChatPanel({
  teamId,
  appId,
  members = [],
  isOpen = true,
  onClose,
  variant = 'panel',
  height = '500px',
}: TeamChatPanelProps) {
  const {
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
  } = useTeamChat({
    teamId,
    appId,
    autoLoad: isOpen,
    realtime: true,
  });

  const { user: currentUser } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [replyTo, setReplyTo] = useState<TeamChatMessage | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current && !isLoadingMore) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isLoadingMore]);

  // Detect scroll position for "scroll to bottom" button
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);

    // Load more messages when scrolled to top
    if (scrollTop < 50 && hasMore && !isLoadingMore) {
      loadMoreMessages();
    }
  }, [hasMore, isLoadingMore, loadMoreMessages]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Send message handler
  const handleSend = useCallback(
    async (content: string, mentions?: string[], replyToId?: string) => {
      await sendMessage(content, {
        mentions,
        replyTo: replyToId,
      });
      setReplyTo(null);
    },
    [sendMessage]
  );

  // Edit message handler
  const handleEdit = useCallback(
    async (messageId: string, content: string) => {
      await editMessage(messageId, content);
    },
    [editMessage]
  );

  // Delete message handler
  const handleDelete = useCallback(
    async (messageId: string) => {
      if (confirm('Are you sure you want to delete this message?')) {
        await deleteMessage(messageId);
      }
    },
    [deleteMessage]
  );

  // Reply handler
  const handleReply = useCallback(
    (messageId: string) => {
      const message = messages.find((m) => m.id === messageId);
      if (message) {
        setReplyTo(message);
      }
    },
    [messages]
  );

  // Reaction handler
  const handleReaction = useCallback(
    async (messageId: string, emoji: string, add: boolean) => {
      if (add) {
        await addReaction(messageId, emoji);
      } else {
        await removeReaction(messageId, emoji);
      }
    },
    [addReaction, removeReaction]
  );

  // Generate AI summary
  const handleGenerateSummary = useCallback(async () => {
    setIsGeneratingSummary(true);
    try {
      await generateSummary({ format: 'summary', postToChat: true });
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [generateSummary]);

  if (!isOpen) return null;

  const containerClass =
    variant === 'sidebar'
      ? 'flex flex-col h-full bg-zinc-900 border-l border-zinc-700'
      : `flex flex-col bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden`;

  return (
    <div className={containerClass} style={variant === 'panel' ? { height } : undefined}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700 bg-zinc-800/50">
        <div className="flex items-center gap-2">
          <MessageSquareIcon size={18} className="text-blue-400" />
          <h3 className="font-medium text-zinc-200">
            {teamId ? 'Team Chat' : appId ? 'App Chat' : 'Chat'}
          </h3>
          {members.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-zinc-500">
              <UsersIcon size={12} />
              {members.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Refresh button */}
          <button
            onClick={() => loadMessages()}
            disabled={isLoading}
            className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 disabled:opacity-50 transition-colors"
            title="Refresh messages"
          >
            <RefreshIcon size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>

          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Close chat"
            >
              <XIcon size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {/* Loading more indicator */}
        {isLoadingMore && (
          <div className="py-4 text-center">
            <LoaderIcon size={20} className="inline-block animate-spin text-zinc-500" />
          </div>
        )}

        {/* Has more messages indicator */}
        {hasMore && !isLoadingMore && messages.length > 0 && (
          <button
            onClick={loadMoreMessages}
            className="w-full py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Load older messages
          </button>
        )}

        {/* Empty state */}
        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
            <MessageSquareIcon size={40} className="text-zinc-600 mb-3" />
            <h4 className="text-zinc-400 font-medium mb-1">No messages yet</h4>
            <p className="text-zinc-500 text-sm">
              Start the conversation by sending a message below.
            </p>
          </div>
        )}

        {/* Initial loading state */}
        {isLoading && messages.length === 0 && (
          <div className="flex items-center justify-center h-full py-12">
            <LoaderIcon size={24} className="animate-spin text-zinc-500" />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="mx-4 my-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Messages list */}
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            currentUserId={currentUser?.id}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onReply={handleReply}
            onReaction={handleReaction}
          />
        ))}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <div className="absolute bottom-24 right-4">
          <button
            onClick={scrollToBottom}
            className="p-2 rounded-full bg-zinc-700 text-zinc-300 hover:bg-zinc-600 shadow-lg transition-colors"
            title="Scroll to bottom"
          >
            <ChevronDownIcon size={18} />
          </button>
        </div>
      )}

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        isSending={isSending}
        members={members}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
        onGenerateSummary={handleGenerateSummary}
        isGeneratingSummary={isGeneratingSummary}
        disabled={!teamId && !appId}
        placeholder={
          !teamId && !appId
            ? 'Select a team or app to start chatting'
            : 'Type a message...'
        }
      />
    </div>
  );
}

export default TeamChatPanel;
