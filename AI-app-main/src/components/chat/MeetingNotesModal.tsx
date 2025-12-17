'use client';

import React, { useState, useCallback } from 'react';
import {
  XIcon,
  LoaderIcon,
  CalendarIcon,
  UsersIcon,
  CheckCircleIcon,
  ClipboardIcon,
  DownloadIcon,
} from '../ui/Icons';
import { useTeamChat } from '@/hooks/useTeamChat';
import type { MeetingNotes, UserInfo } from '@/types/collaboration';

// Simple clipboard icon
const ClipboardCheckIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
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
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <path d="m9 14 2 2 4-4" />
  </svg>
);

export interface MeetingNotesModalProps {
  /** Team ID for meeting notes */
  teamId: string;
  /** Team members for participant info */
  members?: UserInfo[];
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback when notes are generated */
  onNotesGenerated?: (notes: MeetingNotes) => void;
}

/**
 * MeetingNotesModal - Generate AI-powered meeting notes from chat
 */
export function MeetingNotesModal({
  teamId,
  members = [],
  isOpen,
  onClose,
  onNotesGenerated,
}: MeetingNotesModalProps) {
  const { generateMeetingNotes } = useTeamChat({ teamId, autoLoad: false });

  const [isGenerating, setIsGenerating] = useState(false);
  const [notes, setNotes] = useState<MeetingNotes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Time range state
  const [timeRange, setTimeRange] = useState<'1h' | '4h' | '24h' | 'custom'>('1h');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const getTimeRange = useCallback(() => {
    const now = new Date();
    let start: Date;
    let end = now;

    switch (timeRange) {
      case '1h':
        start = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '4h':
        start = new Date(now.getTime() - 4 * 60 * 60 * 1000);
        break;
      case '24h':
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        start = customStart ? new Date(customStart) : new Date(now.getTime() - 60 * 60 * 1000);
        end = customEnd ? new Date(customEnd) : now;
        break;
      default:
        start = new Date(now.getTime() - 60 * 60 * 1000);
    }

    return { start: start.toISOString(), end: end.toISOString() };
  }, [timeRange, customStart, customEnd]);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    setNotes(null);

    try {
      const range = getTimeRange();
      const result = await generateMeetingNotes(range);

      if (result) {
        setNotes(result);
        onNotesGenerated?.(result);
      } else {
        setError('No messages found in the selected time range.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate meeting notes');
    } finally {
      setIsGenerating(false);
    }
  }, [getTimeRange, generateMeetingNotes, onNotesGenerated]);

  const handleCopy = useCallback(() => {
    if (!notes) return;

    const text = formatNotesAsText(notes);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [notes]);

  const handleDownload = useCallback(() => {
    if (!notes) return;

    const markdown = formatNotesAsMarkdown(notes);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-notes-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [notes]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700">
          <div className="flex items-center gap-3">
            <ClipboardCheckIcon size={20} className="text-blue-400" />
            <h2 className="text-lg font-semibold text-zinc-100">Generate Meeting Notes</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!notes ? (
            <>
              {/* Time range selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-zinc-400 mb-3">
                  Select time range to analyze
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: '1h', label: 'Last hour' },
                    { value: '4h', label: 'Last 4 hours' },
                    { value: '24h', label: 'Last 24 hours' },
                    { value: 'custom', label: 'Custom' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setTimeRange(option.value as typeof timeRange)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        timeRange === option.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {/* Custom date inputs */}
                {timeRange === 'custom' && (
                  <div className="mt-4 flex gap-4">
                    <div className="flex-1">
                      <label className="block text-xs text-zinc-500 mb-1">Start</label>
                      <input
                        type="datetime-local"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-zinc-500 mb-1">End</label>
                      <input
                        type="datetime-local"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="mb-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-sm text-blue-400">
                  AI will analyze the chat messages in the selected time range and generate:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-blue-300">
                  <li className="flex items-center gap-2">
                    <CheckCircleIcon size={14} />
                    Summary of key discussion points
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircleIcon size={14} />
                    Decisions made during the discussion
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircleIcon size={14} />
                    Action items with assignees
                  </li>
                </ul>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || (timeRange === 'custom' && (!customStart || !customEnd))}
                className="w-full py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <LoaderIcon size={18} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Meeting Notes'
                )}
              </button>
            </>
          ) : (
            <>
              {/* Generated notes */}
              <div className="space-y-6">
                {/* Title and date */}
                <div>
                  <h3 className="text-xl font-semibold text-zinc-100">{notes.title}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <CalendarIcon size={14} />
                      {new Date(notes.date).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <UsersIcon size={14} />
                      {notes.participants.length} participants
                    </span>
                  </div>
                </div>

                {/* Participants */}
                <div>
                  <h4 className="text-sm font-medium text-zinc-400 mb-2">Participants</h4>
                  <div className="flex flex-wrap gap-2">
                    {notes.participants.map((p) => (
                      <span
                        key={p.id}
                        className="px-2 py-1 rounded-full bg-zinc-800 text-xs text-zinc-300"
                      >
                        {p.fullName || p.email}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div>
                  <h4 className="text-sm font-medium text-zinc-400 mb-2">Summary</h4>
                  <ul className="space-y-2">
                    {notes.summary.map((point, i) => (
                      <li key={i} className="text-zinc-300 text-sm flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5">•</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Decisions */}
                {notes.decisions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-zinc-400 mb-2">Decisions</h4>
                    <ul className="space-y-2">
                      {notes.decisions.map((decision, i) => (
                        <li key={i} className="text-zinc-300 text-sm flex items-start gap-2">
                          <CheckCircleIcon size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
                          {decision}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Items */}
                {notes.actionItems.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-zinc-400 mb-2">Action Items</h4>
                    <div className="space-y-2">
                      {notes.actionItems.map((item, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-lg bg-zinc-800 border border-zinc-700"
                        >
                          <p className="text-sm text-zinc-200">{item.description}</p>
                          {(item.assignee || item.dueDate) && (
                            <div className="flex gap-4 mt-2 text-xs text-zinc-400">
                              {item.assignee && (
                                <span className="flex items-center gap-1">
                                  <UsersIcon size={12} />
                                  {members.find((m) => m.id === item.assignee)?.fullName ||
                                    item.assignee}
                                </span>
                              )}
                              {item.dueDate && (
                                <span className="flex items-center gap-1">
                                  <CalendarIcon size={12} />
                                  {item.dueDate}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-6 pt-4 border-t border-zinc-800 flex gap-3">
                <button
                  onClick={handleCopy}
                  className="flex-1 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
                >
                  {copied ? (
                    <>
                      <CheckCircleIcon size={16} className="text-green-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <ClipboardIcon size={16} />
                      Copy to Clipboard
                    </>
                  )}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
                >
                  <DownloadIcon size={16} />
                  Download Markdown
                </button>
              </div>

              {/* Generate new */}
              <button
                onClick={() => setNotes(null)}
                className="w-full mt-3 py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Generate new notes
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Format meeting notes as plain text
 */
function formatNotesAsText(notes: MeetingNotes): string {
  let text = `${notes.title}\n`;
  text += `Date: ${new Date(notes.date).toLocaleDateString()}\n`;
  text += `Participants: ${notes.participants.map((p) => p.fullName || p.email).join(', ')}\n\n`;

  text += 'SUMMARY\n';
  notes.summary.forEach((point) => {
    text += `• ${point}\n`;
  });

  if (notes.decisions.length > 0) {
    text += '\nDECISIONS\n';
    notes.decisions.forEach((decision) => {
      text += `✓ ${decision}\n`;
    });
  }

  if (notes.actionItems.length > 0) {
    text += '\nACTION ITEMS\n';
    notes.actionItems.forEach((item) => {
      text += `□ ${item.description}`;
      if (item.assignee) text += ` (${item.assignee})`;
      if (item.dueDate) text += ` - Due: ${item.dueDate}`;
      text += '\n';
    });
  }

  return text;
}

/**
 * Format meeting notes as markdown
 */
function formatNotesAsMarkdown(notes: MeetingNotes): string {
  let md = `# ${notes.title}\n\n`;
  md += `**Date:** ${new Date(notes.date).toLocaleDateString()}\n\n`;
  md += `**Participants:** ${notes.participants.map((p) => p.fullName || p.email).join(', ')}\n\n`;

  md += '## Summary\n\n';
  notes.summary.forEach((point) => {
    md += `- ${point}\n`;
  });

  if (notes.decisions.length > 0) {
    md += '\n## Decisions\n\n';
    notes.decisions.forEach((decision) => {
      md += `- [x] ${decision}\n`;
    });
  }

  if (notes.actionItems.length > 0) {
    md += '\n## Action Items\n\n';
    notes.actionItems.forEach((item) => {
      md += `- [ ] ${item.description}`;
      if (item.assignee) md += ` (@${item.assignee})`;
      if (item.dueDate) md += ` - Due: ${item.dueDate}`;
      md += '\n';
    });
  }

  md += '\n---\n*Generated with AI*\n';

  return md;
}

export default MeetingNotesModal;
