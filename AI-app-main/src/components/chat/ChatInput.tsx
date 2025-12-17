'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SendIcon, XIcon, SparklesIcon, LoaderIcon } from '../ui/Icons';
import type { UserInfo, TeamChatMessage } from '@/types/collaboration';

// Simple attachment icon
const AttachmentIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
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
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

export interface ChatInputProps {
  /** Callback when message is sent */
  onSend: (content: string, mentions?: string[], replyTo?: string) => void;
  /** Whether currently sending */
  isSending?: boolean;
  /** Available team members for mentions */
  members?: UserInfo[];
  /** Message being replied to */
  replyTo?: TeamChatMessage | null;
  /** Callback to clear reply */
  onClearReply?: () => void;
  /** Callback for AI summary */
  onGenerateSummary?: () => void;
  /** Whether AI summary is being generated */
  isGeneratingSummary?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Whether input is disabled */
  disabled?: boolean;
}

/**
 * ChatInput - Rich message input with @mentions support
 */
export function ChatInput({
  onSend,
  isSending = false,
  members = [],
  replyTo,
  onClearReply,
  onGenerateSummary,
  isGeneratingSummary = false,
  placeholder = 'Type a message...',
  disabled = false,
}: ChatInputProps) {
  const [content, setContent] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [selectedMentions, setSelectedMentions] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionStartRef = useRef<number | null>(null);

  // Filter members based on mention query
  const filteredMembers = members.filter((member) => {
    const name = member.fullName || member.email || '';
    return name.toLowerCase().includes(mentionQuery.toLowerCase());
  });

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [content]);

  // Handle content change with mention detection
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setContent(value);

    // Detect @ mention
    const textBeforeCursor = value.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setShowMentions(true);
      setMentionQuery(mentionMatch[1]);
      mentionStartRef.current = cursorPos - mentionMatch[0].length;
      setMentionIndex(0);
    } else {
      setShowMentions(false);
      mentionStartRef.current = null;
    }
  }, []);

  // Insert mention into content
  const insertMention = useCallback(
    (member: UserInfo) => {
      if (mentionStartRef.current === null) return;

      const name = member.fullName || member.email || 'Unknown';
      const beforeMention = content.slice(0, mentionStartRef.current);
      const afterMention = content.slice(textareaRef.current?.selectionStart || content.length);
      const newContent = `${beforeMention}@${name} ${afterMention}`;

      setContent(newContent);
      setSelectedMentions((prev) => [...prev, member.id]);
      setShowMentions(false);
      mentionStartRef.current = null;

      // Focus back to textarea
      setTimeout(() => {
        textareaRef.current?.focus();
        const newPos = beforeMention.length + name.length + 2;
        textareaRef.current?.setSelectionRange(newPos, newPos);
      }, 0);
    },
    [content]
  );

  // Handle keyboard navigation in mentions dropdown
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (showMentions && filteredMembers.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setMentionIndex((prev) => Math.min(prev + 1, filteredMembers.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setMentionIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          insertMention(filteredMembers[mentionIndex]);
        } else if (e.key === 'Escape') {
          setShowMentions(false);
        }
        return;
      }

      // Send on Enter (without Shift)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [showMentions, filteredMembers, mentionIndex, insertMention]
  );

  // Send message
  const handleSend = useCallback(() => {
    if (!content.trim() || isSending || disabled) return;

    onSend(content.trim(), selectedMentions, replyTo?.id);
    setContent('');
    setSelectedMentions([]);
    onClearReply?.();

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [content, isSending, disabled, onSend, selectedMentions, replyTo?.id, onClearReply]);

  return (
    <div className="border-t border-zinc-700 bg-zinc-900">
      {/* Reply indicator */}
      {replyTo && (
        <div className="px-4 py-2 flex items-center justify-between bg-zinc-800/50 border-b border-zinc-700">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-500">Replying to</span>
            <span className="text-zinc-300 font-medium">
              {replyTo.user?.fullName || replyTo.user?.email || 'Unknown'}
            </span>
            <span className="text-zinc-500 truncate max-w-[200px]">{replyTo.content}</span>
          </div>
          <button
            onClick={onClearReply}
            className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <XIcon size={14} />
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="relative p-4">
        {/* Mentions dropdown */}
        {showMentions && filteredMembers.length > 0 && (
          <div className="absolute bottom-full left-4 right-4 mb-2 max-h-48 overflow-y-auto rounded-lg bg-zinc-800 border border-zinc-700 shadow-lg z-10">
            {filteredMembers.map((member, index) => (
              <button
                key={member.id}
                onClick={() => insertMention(member)}
                className={`w-full px-3 py-2 flex items-center gap-2 text-left text-sm transition-colors ${
                  index === mentionIndex
                    ? 'bg-blue-600/20 text-blue-300'
                    : 'text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-zinc-600 flex items-center justify-center flex-shrink-0">
                  {member.avatarUrl ? (
                    <img
                      src={member.avatarUrl}
                      alt=""
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-xs">{(member.fullName || member.email || '?')[0].toUpperCase()}</span>
                  )}
                </div>
                <span>{member.fullName || member.email}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Message input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || isSending}
              className="w-full px-4 py-3 pr-12 text-sm rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              rows={1}
              style={{ maxHeight: '150px' }}
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            {/* AI Summary button */}
            {onGenerateSummary && (
              <button
                onClick={onGenerateSummary}
                disabled={isGeneratingSummary || disabled}
                className="p-2.5 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Generate AI summary"
              >
                {isGeneratingSummary ? (
                  <LoaderIcon size={18} className="animate-spin" />
                ) : (
                  <SparklesIcon size={18} />
                )}
              </button>
            )}

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!content.trim() || isSending || disabled}
              className="p-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Send message"
            >
              {isSending ? (
                <LoaderIcon size={18} className="animate-spin" />
              ) : (
                <SendIcon size={18} />
              )}
            </button>
          </div>
        </div>

        {/* Hint text */}
        <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span>Type @ to mention someone</span>
        </div>
      </div>
    </div>
  );
}

export default ChatInput;
