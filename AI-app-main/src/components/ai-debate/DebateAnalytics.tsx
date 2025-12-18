/**
 * DebateAnalytics Component
 *
 * Dashboard showing debate statistics and trends.
 * Displays metrics like average rounds to consensus, costs, model usage, etc.
 */

"use client";

import React, { useState, useEffect, useMemo } from "react";
import type {
  DebateSession,
  DebateStyle,
  DebateModelId,
} from "@/types/aiCollaboration";

interface DebateAnalyticsProps {
  debates: DebateSession[];
  className?: string;
}

interface AnalyticsMetrics {
  totalDebates: number;
  completedDebates: number;
  averageRounds: number;
  totalCost: number;
  averageCost: number;
  agreementRate: number;
  averageMessagesPerDebate: number;
  modelUsage: Record<string, number>;
  styleDistribution: Record<string, number>;
  debatesOverTime: { date: string; count: number }[];
  costOverTime: { date: string; cost: number }[];
}

function calculateMetrics(debates: DebateSession[]): AnalyticsMetrics {
  if (debates.length === 0) {
    return {
      totalDebates: 0,
      completedDebates: 0,
      averageRounds: 0,
      totalCost: 0,
      averageCost: 0,
      agreementRate: 0,
      averageMessagesPerDebate: 0,
      modelUsage: {},
      styleDistribution: {},
      debatesOverTime: [],
      costOverTime: [],
    };
  }

  const completedDebates = debates.filter(
    (d) => d.status === "agreed" || d.status === "user-ended"
  );
  const agreedDebates = debates.filter((d) => d.status === "agreed");

  // Calculate totals
  const totalCost = debates.reduce((sum, d) => sum + (d.cost?.totalCost || 0), 0);
  const totalRounds = debates.reduce((sum, d) => sum + d.roundCount, 0);
  const totalMessages = debates.reduce((sum, d) => sum + d.messages.length, 0);

  // Model usage
  const modelUsage: Record<string, number> = {};
  for (const debate of debates) {
    for (const msg of debate.messages) {
      modelUsage[msg.modelId] = (modelUsage[msg.modelId] || 0) + 1;
    }
  }

  // Style distribution
  const styleDistribution: Record<string, number> = {};
  for (const debate of debates) {
    const style = debate.style || "cooperative";
    styleDistribution[style] = (styleDistribution[style] || 0) + 1;
  }

  // Group by date for time series
  const dateGroups = new Map<string, { count: number; cost: number }>();
  for (const debate of debates) {
    const date = new Date(debate.createdAt).toISOString().split("T")[0];
    const existing = dateGroups.get(date) || { count: 0, cost: 0 };
    existing.count++;
    existing.cost += debate.cost?.totalCost || 0;
    dateGroups.set(date, existing);
  }

  const sortedDates = Array.from(dateGroups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30); // Last 30 days

  return {
    totalDebates: debates.length,
    completedDebates: completedDebates.length,
    averageRounds: totalRounds / debates.length,
    totalCost,
    averageCost: totalCost / debates.length,
    agreementRate: agreedDebates.length / debates.length,
    averageMessagesPerDebate: totalMessages / debates.length,
    modelUsage,
    styleDistribution,
    debatesOverTime: sortedDates.map(([date, data]) => ({
      date,
      count: data.count,
    })),
    costOverTime: sortedDates.map(([date, data]) => ({
      date,
      cost: data.cost,
    })),
  };
}

export function DebateAnalytics({
  debates,
  className = "",
}: DebateAnalyticsProps) {
  const metrics = useMemo(() => calculateMetrics(debates), [debates]);

  if (debates.length === 0) {
    return (
      <div className={`bg-zinc-800/50 border border-zinc-700 rounded-lg p-8 text-center ${className}`}>
        <ChartIcon className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-zinc-300 mb-2">No Analytics Yet</h3>
        <p className="text-sm text-zinc-500">
          Start some debates to see analytics and trends
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total Debates"
          value={metrics.totalDebates}
          icon={<DebateIcon />}
          color="purple"
        />
        <MetricCard
          label="Agreement Rate"
          value={`${(metrics.agreementRate * 100).toFixed(0)}%`}
          icon={<CheckIcon />}
          color="emerald"
        />
        <MetricCard
          label="Avg Rounds"
          value={metrics.averageRounds.toFixed(1)}
          icon={<RoundIcon />}
          color="blue"
        />
        <MetricCard
          label="Total Cost"
          value={`$${metrics.totalCost.toFixed(2)}`}
          icon={<CostIcon />}
          color="amber"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Model usage */}
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-zinc-300 mb-4">Model Usage</h4>
          <div className="space-y-3">
            {Object.entries(metrics.modelUsage)
              .sort(([, a], [, b]) => b - a)
              .map(([modelId, count]) => {
                const total = Object.values(metrics.modelUsage).reduce((a, b) => a + b, 0);
                const percentage = (count / total) * 100;
                const color = getModelColor(modelId as DebateModelId);

                return (
                  <div key={modelId}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-400">{formatModelName(modelId)}</span>
                      <span className="text-zinc-500">{count} messages</span>
                    </div>
                    <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Style distribution */}
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-zinc-300 mb-4">Debate Styles</h4>
          <div className="space-y-3">
            {Object.entries(metrics.styleDistribution)
              .sort(([, a], [, b]) => b - a)
              .map(([style, count]) => {
                const percentage = (count / metrics.totalDebates) * 100;
                const color = getStyleColor(style as DebateStyle);

                return (
                  <div key={style}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-400 capitalize">
                        {style.replace("_", " ")}
                      </span>
                      <span className="text-zinc-500">{count} debates</span>
                    </div>
                    <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Activity chart */}
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
        <h4 className="text-sm font-medium text-zinc-300 mb-4">Debate Activity</h4>
        <div className="h-32">
          <ActivityChart data={metrics.debatesOverTime} />
        </div>
      </div>

      {/* Additional stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatItem
          label="Completed"
          value={metrics.completedDebates}
          subtext={`of ${metrics.totalDebates}`}
        />
        <StatItem
          label="Avg Messages"
          value={metrics.averageMessagesPerDebate.toFixed(1)}
          subtext="per debate"
        />
        <StatItem
          label="Avg Cost"
          value={`$${metrics.averageCost.toFixed(3)}`}
          subtext="per debate"
        />
        <StatItem
          label="Models Used"
          value={Object.keys(metrics.modelUsage).length}
          subtext="different"
        />
      </div>
    </div>
  );
}

/**
 * Metric card component
 */
interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: "purple" | "emerald" | "blue" | "amber";
}

function MetricCard({ label, value, icon, color }: MetricCardProps) {
  const colorClasses = {
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="opacity-70">{icon}</span>
        <span className="text-xs text-zinc-500">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

/**
 * Simple stat item
 */
function StatItem({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string | number;
  subtext: string;
}) {
  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3">
      <div className="text-xs text-zinc-500 mb-1">{label}</div>
      <div className="text-lg font-semibold text-zinc-200">{value}</div>
      <div className="text-xs text-zinc-600">{subtext}</div>
    </div>
  );
}

/**
 * Simple activity chart using divs
 */
function ActivityChart({
  data,
}: {
  data: { date: string; count: number }[];
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
        No activity data
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end justify-between h-full gap-1">
      {data.map((item, idx) => (
        <div key={idx} className="flex-1 flex flex-col items-center">
          <div
            className="w-full bg-purple-500/50 rounded-t transition-all duration-300 hover:bg-purple-400/50"
            style={{
              height: `${(item.count / maxCount) * 100}%`,
              minHeight: item.count > 0 ? "4px" : "0",
            }}
            title={`${item.date}: ${item.count} debates`}
          />
          {idx % 5 === 0 && (
            <span className="text-[9px] text-zinc-600 mt-1">
              {new Date(item.date).getDate()}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// Helper functions
function getModelColor(modelId: DebateModelId): string {
  if (modelId.includes("claude")) return "bg-purple-500";
  if (modelId.includes("gpt")) return "bg-emerald-500";
  if (modelId.includes("gemini")) return "bg-blue-500";
  return "bg-zinc-500";
}

function getStyleColor(style: DebateStyle): string {
  switch (style) {
    case "cooperative":
      return "bg-emerald-500";
    case "adversarial":
      return "bg-red-500";
    case "red_team":
      return "bg-orange-500";
    case "panel":
      return "bg-blue-500";
    default:
      return "bg-zinc-500";
  }
}

function formatModelName(modelId: string): string {
  const names: Record<string, string> = {
    "claude-opus-4": "Claude Opus 4",
    "claude-sonnet-4": "Claude Sonnet 4",
    "gpt-5": "GPT-5",
    "gpt-4o": "GPT-4o",
    "gemini-pro": "Gemini Pro",
    "gemini-ultra": "Gemini Ultra",
  };
  return names[modelId] || modelId;
}

// Icons
function ChartIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  );
}

function DebateIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function RoundIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function CostIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

export default DebateAnalytics;
