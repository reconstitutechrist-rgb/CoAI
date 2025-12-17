'use client';

import React, { useState, useCallback } from 'react';
import {
  UserIcon,
  BrainIcon,
  PencilIcon,
  TrashIcon,
  SparklesIcon,
  CheckIcon,
  XIcon,
} from '../ui/Icons';
import type { TeamChatMessage, UserInfo } from '@/types/collaboration';

// Simple pencil icon since it might not exist
const PencilIcon2: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    <path d="m15 5 4 4" />
  </svg>
);

// Simple reply icon
const ReplyIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="9 17 4 12 9 7" />
    <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
  </svg>
);

export interface ChatMessageProps {
  /** The message to display */
  message: TeamChatMessage;
  /** Current user ID for permission checks */
  currentUserId?: string;
  /** Whether this message is being edited */
  isEditing?: boolean;
  /** Callback when edit is requested */
  onEdit?: (messageId: string, content: string) => void;
  /** Callback when delete is requested */
  onDelete?: (messageId: string) => void;
  /** Callback when reply is requested */
  onReply?: (messageId: string) => void;
  /** Callback when reaction is toggled */
  onReaction?: (messageId: string, emoji: string, add: boolean) => void;
  /** Available emoji reactions */
  reactionEmojis?: string[];
}

/**
 * ChatMessage - Renders a single chat message with actions
 */
export function ChatMessage({
  message,
  currentUserId,
  isEditing: externalIsEditing,
  onEdit,
  onDelete,
  onReply,
  onReaction,
  reactionEmojis = ['👍', '❤️', '😄', '🎉', '🤔', '👀'],
}: ChatMessageProps) {
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const isOwner = currentUserId === message.userId;
  const isAIMessage = message.aiGenerated || message.messageType === 'ai_summary' || message.messageType === 'meeting_notes';
  const isDeleted = !!message.deletedAt;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const handleEditSave = useCallback(() => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit?.(message.id, editContent.trim());
    }
    setIsEditing(false);
  }, [editContent, message.id, message.content, onEdit]);

  const handleEditCancel = useCallback(() => {
    setEditContent(message.content);
    setIsEditing(false);
  }, [message.content]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleEditSave();
      } else if (e.key === 'Escape') {
        handleEditCancel();
      }
    },
    [handleEditSave, handleEditCancel]
  );

  const toggleReaction = useCallback(
    (emoji: string) => {
      if (!currentUserId) return;
      const reaction = message.reactions.find((r) => r.emoji === emoji);
      const hasReacted = reaction?.userIds.includes(currentUserId);
      onReaction?.(message.id, emoji, !hasReacted);
      setShowReactions(false);
    },
    [currentUserId, message.id, message.reactions, onReaction]
  );

  // System message styling
  if (message.messageType === 'system') {
    return (
      <div className="py-2 px-4 text-center">
        <span className="text-xs text-zinc-500 italic">{message.content}</span>
      </div>
    );
  }

  // Deleted message
  if (isDeleted) {
    return (
      <div className="py-2 px-4 group">
        <div className="flex items-center gap-2 text-zinc-500 italic text-sm">
          <TrashIcon size={14} />
          <span>This message was deleted</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="py-2 px-4 group hover:bg-zinc-800/30 transition-colors"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowReactions(false);
      }}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <div
          className={`w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center ${
            isAIMessage
              ? 'bg-gradient-to-br from-purple-500 to-blue-500'
              : 'bg-zinc-700'
          }`}
        >
          {isAIMessage ? (
            <BrainIcon size={18} className="text-white" />
          ) : message.user?.avatarUrl ? (
            <img
              src={message.user.avatarUrl}
              alt={message.user.fullName || 'User'}
              className="w-full h-full rounded-lg object-cover"
            />
          ) : (
            <UserIcon size={18} className="text-zinc-300" />
          )}
        </div>

        {/* Message content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className={`font-medium text-sm ${isAIMessage ? 'text-purple-300' : 'text-zinc-200'}`}>
              {isAIMessage ? 'AI Assistant' : message.user?.fullName || message.user?.email || 'Unknown'}
            </span>
            <span className="text-xs text-zinc-500">{formatTime(message.createdAt)}</span>
            {message.editedAt && (
              <span className="text-xs text-zinc-500 italic">(edited)</span>
            )}
          </div>

          {/* Reply reference */}
          {message.replyToMessage && (
            <div className="mb-1 pl-3 border-l-2 border-zinc-600 text-sm">
              <span className="text-zinc-500">
                Replying to{' '}
                <span className="text-zinc-400">
                  {message.replyToMessage.user?.fullName || 'Unknown'}
                </span>
              </span>
              <p className="text-zinc-500 truncate text-xs">{message.replyToMessage.content}</p>
            </div>
          )}

          {/* Content */}
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-800 border border-zinc-600 text-zinc-100 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows={3}
                autoFocus
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleEditSave}
                  disabled={!editContent.trim()}
                  className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={handleEditCancel}
                  className="px-3 py-1 text-xs rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors"
                >
                  Cancel
                </button>
                <span className="text-xs text-zinc-500">Press Enter to save, Esc to cancel</span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-zinc-300 whitespace-pre-wrap break-words">
              {/* AI summary badge */}
              {message.messageType === 'ai_summary' && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 mb-1 rounded bg-purple-500/20 text-purple-300 text-xs">
                  <SparklesIcon size={12} />
                  AI Summary
                </div>
              )}
              {message.messageType === 'meeting_notes' && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 mb-1 rounded bg-blue-500/20 text-blue-300 text-xs">
                  <SparklesIcon size={12} />
                  Meeting Notes
                </div>
              )}
              <div className={message.messageType === 'ai_summary' || message.messageType === 'meeting_notes' ? 'mt-2' : ''}>
                {message.content}
              </div>
            </div>
          )}

          {/* Reactions */}
          {message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {message.reactions.map((reaction) => {
                const hasReacted = currentUserId && reaction.userIds.includes(currentUserId);
                return (
                  <button
                    key={reaction.emoji}
                    onClick={() => toggleReaction(reaction.emoji)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
                      hasReacted
                        ? 'bg-blue-500/30 border border-blue-500/50 text-blue-300'
                        : 'bg-zinc-700/50 border border-zinc-600 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    <span>{reaction.emoji}</span>
                    <span>{reaction.userIds.length}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions (shown on hover) */}
        {showActions && !isEditing && (
          <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Add reaction */}
            <div className="relative">
              <button
                onClick={() => setShowReactions(!showReactions)}
                className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
                title="Add reaction"
              >
                😊
              </button>
              {showReactions && (
                <div className="absolute right-0 top-full mt-1 z-10 flex gap-1 p-2 rounded-lg bg-zinc-800 border border-zinc-700 shadow-lg">
                  {reactionEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => toggleReaction(emoji)}
                      className="p-1 rounded hover:bg-zinc-700 transition-colors text-lg"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reply */}
            {onReply && (
              <button
                onClick={() => onReply(message.id)}
                className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
                title="Reply"
              >
                <ReplyIcon size={14} />
              </button>
            )}

            {/* Edit (owner only) */}
            {isOwner && onEdit && !isAIMessage && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
                title="Edit"
              >
                <PencilIcon2 size={14} />
              </button>
            )}

            {/* Delete (owner only) */}
            {isOwner && onDelete && (
              <button
                onClick={() => onDelete(message.id)}
                className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition-colors"
                title="Delete"
              >
                <TrashIcon size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatMessage;
