'use client';

import React, { useState, useCallback } from 'react';
import {
  XIcon,
  LoaderIcon,
  DownloadIcon,
  CalendarIcon,
  FilterIcon,
  FileIcon,
  CheckCircleIcon,
} from '../ui/Icons';
import { useActivityLog } from '@/hooks/useActivityLog';
import type { ActivityCategory, ActivityLog } from '@/types/collaboration';

export interface ActivityExportProps {
  /** Team ID for team activity */
  teamId?: string | null;
  /** App ID for app activity */
  appId?: string | null;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
}

// Export format options
type ExportFormat = 'markdown' | 'json' | 'csv';

const CATEGORY_OPTIONS: { value: ActivityCategory | ''; label: string }[] = [
  { value: '', label: 'All Activity' },
  { value: 'code', label: 'Code Changes' },
  { value: 'phase', label: 'Phase Progress' },
  { value: 'task', label: 'Tasks' },
  { value: 'team', label: 'Team' },
  { value: 'access', label: 'Access' },
  { value: 'chat', label: 'Chat' },
  { value: 'app', label: 'App' },
];

/**
 * ActivityExport - Export activity log to various formats
 */
export function ActivityExport({
  teamId,
  appId,
  isOpen,
  onClose,
}: ActivityExportProps) {
  const { activities, isLoading, loadActivities, filterByCategory, filterByDateRange } =
    useActivityLog({
      teamId,
      appId,
      autoLoad: false,
      pageSize: 500, // Load more for export
    });

  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [category, setCategory] = useState<ActivityCategory | ''>('');
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | 'custom'>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [previewData, setPreviewData] = useState<ActivityLog[] | null>(null);

  // Track when we're waiting for activities to load for preview
  const [pendingPreview, setPendingPreview] = useState(false);

  // Calculate date range filters
  const getDateFilters = useCallback(() => {
    const now = new Date();
    let startDate: string | undefined;
    let endDate: string | undefined;

    switch (dateRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'custom':
        startDate = customStart ? new Date(customStart).toISOString() : undefined;
        endDate = customEnd ? new Date(customEnd).toISOString() : undefined;
        break;
    }

    return { startDate, endDate };
  }, [dateRange, customStart, customEnd]);

  const handleLoadPreview = useCallback(() => {
    setIsExporting(true);
    setPreviewData(null);
    setPendingPreview(true);

    // Calculate filters
    const { startDate, endDate } = getDateFilters();

    // Set all filters at once - this will trigger a reload via the hook's useEffect
    // But since autoLoad is false, we need to call loadActivities after state settles
    if (category) {
      filterByCategory(category);
    } else {
      filterByCategory(undefined);
    }

    if (startDate || endDate) {
      filterByDateRange(startDate, endDate);
    } else {
      filterByDateRange(undefined, undefined);
    }

    // Use setTimeout to allow state to settle before loading
    setTimeout(() => {
      loadActivities();
    }, 0);
  }, [category, getDateFilters, filterByCategory, filterByDateRange, loadActivities]);

  // Update preview data when activities load completes
  useEffect(() => {
    if (pendingPreview && !isLoading && activities) {
      setPreviewData(activities);
      setPendingPreview(false);
      setIsExporting(false);
    }
  }, [pendingPreview, isLoading, activities]);

  const handleExport = useCallback(() => {
    if (!previewData || previewData.length === 0) return;

    let content: string;
    let filename: string;
    let mimeType: string;

    const timestamp = new Date().toISOString().split('T')[0];

    switch (format) {
      case 'markdown':
        content = formatAsMarkdown(previewData, { teamId, appId });
        filename = `activity-log-${timestamp}.md`;
        mimeType = 'text/markdown';
        break;
      case 'json':
        content = JSON.stringify(previewData, null, 2);
        filename = `activity-log-${timestamp}.json`;
        mimeType = 'application/json';
        break;
      case 'csv':
        content = formatAsCSV(previewData);
        filename = `activity-log-${timestamp}.csv`;
        mimeType = 'text/csv';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [format, previewData, teamId, appId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700">
          <div className="flex items-center gap-3">
            <DownloadIcon size={20} className="text-blue-400" />
            <h2 className="text-lg font-semibold text-zinc-100">Export Activity Log</h2>
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
          {/* Format selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-400 mb-3">Export Format</label>
            <div className="flex gap-2">
              {[
                { value: 'markdown', label: 'Markdown', icon: FileIcon },
                { value: 'json', label: 'JSON', icon: FileIcon },
                { value: 'csv', label: 'CSV', icon: FileIcon },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFormat(option.value as ExportFormat)}
                  className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    format === option.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <option.icon size={16} />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category filter */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-400 mb-3 flex items-center gap-1.5">
              <FilterIcon size={14} />
              Category Filter
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ActivityCategory | '')}
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-400 mb-3 flex items-center gap-1.5">
              <CalendarIcon size={14} />
              Date Range
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'All Time' },
                { value: '7d', label: 'Last 7 Days' },
                { value: '30d', label: 'Last 30 Days' },
                { value: 'custom', label: 'Custom' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setDateRange(option.value as typeof dateRange)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dateRange === option.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Custom date inputs */}
            {dateRange === 'custom' && (
              <div className="mt-4 flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs text-zinc-500 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-zinc-500 mb-1">End Date</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Load preview button */}
          <button
            onClick={handleLoadPreview}
            disabled={isExporting || isLoading}
            className="w-full py-3 rounded-lg bg-zinc-800 text-zinc-200 font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {isExporting || isLoading ? (
              <>
                <LoaderIcon size={18} className="animate-spin" />
                Loading...
              </>
            ) : (
              'Load Preview'
            )}
          </button>

          {/* Preview */}
          {previewData && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-zinc-400">
                  Preview ({previewData.length} entries)
                </h3>
              </div>

              {previewData.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  No activity found for the selected filters.
                </div>
              ) : (
                <>
                  <div className="max-h-64 overflow-y-auto rounded-lg bg-zinc-800 border border-zinc-700">
                    <div className="p-4 space-y-2">
                      {previewData.slice(0, 10).map((activity) => (
                        <div key={activity.id} className="flex items-start gap-3 text-sm">
                          <span className="text-zinc-500 text-xs font-mono whitespace-nowrap">
                            {new Date(activity.createdAt).toLocaleDateString()}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-zinc-700 text-xs text-zinc-400">
                            {activity.actionCategory}
                          </span>
                          <span className="text-zinc-300 flex-1">{activity.summary}</span>
                        </div>
                      ))}
                      {previewData.length > 10 && (
                        <div className="text-center text-zinc-500 text-xs pt-2">
                          ... and {previewData.length - 10} more entries
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Export button */}
                  <button
                    onClick={handleExport}
                    className="w-full mt-4 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
                  >
                    <DownloadIcon size={18} />
                    Export as {format.toUpperCase()}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Format descriptions */}
          <div className="mt-6 p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
            <h4 className="text-sm font-medium text-zinc-400 mb-2">Format Details</h4>
            {format === 'markdown' && (
              <p className="text-sm text-zinc-500">
                Exports as a formatted Markdown document with headers, bullet points, and code
                blocks for diffs. Great for documentation and READMEs.
              </p>
            )}
            {format === 'json' && (
              <p className="text-sm text-zinc-500">
                Exports as structured JSON data with all activity details including diffs and
                metadata. Ideal for data processing and integrations.
              </p>
            )}
            {format === 'csv' && (
              <p className="text-sm text-zinc-500">
                Exports as a CSV spreadsheet with columns for date, category, action, summary, and
                user. Great for analysis in Excel or Google Sheets.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Format activities as Markdown
 */
function formatAsMarkdown(
  activities: ActivityLog[],
  context: { teamId?: string | null; appId?: string | null }
): string {
  let md = '# Activity Log\n\n';
  md += `**Generated:** ${new Date().toLocaleString()}\n\n`;

  if (context.teamId) {
    md += `**Team ID:** ${context.teamId}\n\n`;
  }
  if (context.appId) {
    md += `**App ID:** ${context.appId}\n\n`;
  }

  md += '---\n\n';

  // Group by date
  const groupedByDate = activities.reduce((acc, activity) => {
    const date = new Date(activity.createdAt).toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(activity);
    return acc;
  }, {} as Record<string, ActivityLog[]>);

  Object.entries(groupedByDate).forEach(([date, items]) => {
    md += `## ${date}\n\n`;

    items.forEach((activity) => {
      const time = new Date(activity.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      const user = activity.user?.fullName || activity.user?.email || 'System';

      md += `### ${time} - ${activity.actionCategory}\n\n`;
      md += `**${user}** ${activity.summary}\n\n`;

      if (activity.diffData) {
        md += `<details>\n<summary>View Diff</summary>\n\n`;
        if (activity.diffData.filePath) {
          md += `**File:** \`${activity.diffData.filePath}\`\n\n`;
        }
        md += '```diff\n';
        md += `- ${activity.diffData.before.split('\n').slice(0, 5).join('\n- ')}\n`;
        md += `+ ${activity.diffData.after.split('\n').slice(0, 5).join('\n+ ')}\n`;
        md += '```\n\n';
        md += '</details>\n\n';
      }

      md += '---\n\n';
    });
  });

  return md;
}

/**
 * Format activities as CSV
 */
function formatAsCSV(activities: ActivityLog[]): string {
  const headers = ['Date', 'Time', 'Category', 'Action', 'Summary', 'User', 'Target'];
  const rows = activities.map((a) => {
    const date = new Date(a.createdAt);
    return [
      date.toLocaleDateString(),
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      a.actionCategory,
      a.actionType,
      `"${a.summary.replace(/"/g, '""')}"`,
      a.user?.fullName || a.user?.email || 'System',
      a.targetName || '',
    ];
  });

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export default ActivityExport;
