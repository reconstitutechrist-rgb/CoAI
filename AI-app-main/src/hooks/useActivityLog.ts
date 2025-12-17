/**
 * useActivityLog Hook - Activity feed management
 *
 * Provides functionality for viewing and filtering activity logs.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ActivityLogService } from '@/services/ActivityLogService';
import type {
  ActivityLog,
  ActivityCategory,
  ActivityFilters,
} from '@/types/collaboration';

/**
 * Options for useActivityLog hook
 */
export interface UseActivityLogOptions {
  /** Team ID for team activity */
  teamId?: string | null;
  /** App ID for app activity */
  appId?: string | null;
  /** User ID for user activity */
  userId?: string | null;
  /** Initial category filter */
  category?: ActivityCategory | ActivityCategory[];
  /** Whether to auto-load on mount */
  autoLoad?: boolean;
  /** Page size */
  pageSize?: number;
}

/**
 * Return type for useActivityLog hook
 */
export interface UseActivityLogReturn {
  // State
  /** Activity entries */
  activities: ActivityLog[];
  /** Whether loading */
  isLoading: boolean;
  /** Whether loading more */
  isLoadingMore: boolean;
  /** Error message */
  error: string | null;
  /** Total count */
  total: number;
  /** Whether there are more entries */
  hasMore: boolean;
  /** Current filters */
  filters: ActivityFilters;

  // Actions
  /** Load activities */
  loadActivities: () => Promise<void>;
  /** Load more activities */
  loadMoreActivities: () => Promise<void>;
  /** Refresh activities */
  refresh: () => Promise<void>;
  /** Get a specific activity with diff */
  getActivity: (activityId: string) => Promise<ActivityLog | null>;

  // Filter actions
  /** Set filters */
  setFilters: (filters: Partial<ActivityFilters>) => void;
  /** Clear filters */
  clearFilters: () => void;
  /** Filter by category */
  filterByCategory: (category: ActivityCategory | ActivityCategory[] | undefined) => void;
  /** Filter by date range */
  filterByDateRange: (start?: string, end?: string) => void;
}

/**
 * Hook for viewing activity logs
 *
 * @param options - Configuration options
 * @returns Activity log methods and state
 *
 * @example
 * ```tsx
 * const { activities, isLoading, filterByCategory } = useActivityLog({
 *   appId: 'app-123',
 *   autoLoad: true,
 * });
 *
 * // Filter by code changes
 * filterByCategory('code');
 * ```
 */
export function useActivityLog(options: UseActivityLogOptions): UseActivityLogReturn {
  const {
    teamId,
    appId,
    userId,
    category: initialCategory,
    autoLoad = true,
    pageSize = 50,
  } = options;

  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [filters, setFiltersState] = useState<ActivityFilters>({
    teamId: teamId || undefined,
    appId: appId || undefined,
    userId: userId || undefined,
    category: initialCategory,
  });

  const serviceRef = useRef<ActivityLogService | null>(null);

  // Initialize service
  useEffect(() => {
    const supabase = createClient();
    serviceRef.current = new ActivityLogService(supabase);
  }, []);

  // Update filters when IDs change
  useEffect(() => {
    setFiltersState((prev) => ({
      ...prev,
      teamId: teamId || undefined,
      appId: appId || undefined,
      userId: userId || undefined,
    }));
  }, [teamId, appId, userId]);

  /**
   * Load activities
   */
  const loadActivities = useCallback(async () => {
    if (!serviceRef.current || (!filters.teamId && !filters.appId && !filters.userId)) return;

    setIsLoading(true);
    setError(null);
    setCursor(undefined);

    try {
      const result = await serviceRef.current.getActivityFeed({
        ...filters,
        limit: pageSize,
      });

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to load activities');
      }

      setActivities(result.data.items);
      setTotal(result.data.total);
      setHasMore(result.data.hasMore);
      setCursor(result.data.nextCursor);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load activities';
      setError(message);
      console.error('Error loading activities:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters, pageSize]);

  /**
   * Load more activities
   */
  const loadMoreActivities = useCallback(async () => {
    if (!serviceRef.current || !hasMore || isLoadingMore || !cursor) return;

    setIsLoadingMore(true);

    try {
      const result = await serviceRef.current.getActivityFeed({
        ...filters,
        limit: pageSize,
        cursor,
      });

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to load more activities');
      }

      setActivities((prev) => [...prev, ...result.data.items]);
      setHasMore(result.data.hasMore);
      setCursor(result.data.nextCursor);
    } catch (err) {
      console.error('Error loading more activities:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [filters, hasMore, isLoadingMore, cursor, pageSize]);

  /**
   * Refresh activities
   */
  const refresh = useCallback(async () => {
    await loadActivities();
  }, [loadActivities]);

  /**
   * Get a specific activity with diff
   */
  const getActivity = useCallback(async (activityId: string): Promise<ActivityLog | null> => {
    if (!serviceRef.current) return null;

    try {
      const result = await serviceRef.current.getActivity(activityId);

      if (!result.success) {
        return null;
      }

      return result.data;
    } catch (err) {
      console.error('Error getting activity:', err);
      return null;
    }
  }, []);

  /**
   * Set filters
   */
  const setFilters = useCallback((newFilters: Partial<ActivityFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
    setCursor(undefined);
  }, []);

  /**
   * Clear filters
   */
  const clearFilters = useCallback(() => {
    setFiltersState({
      teamId: teamId || undefined,
      appId: appId || undefined,
      userId: userId || undefined,
    });
    setCursor(undefined);
  }, [teamId, appId, userId]);

  /**
   * Filter by category
   */
  const filterByCategory = useCallback(
    (category: ActivityCategory | ActivityCategory[] | undefined) => {
      setFilters({ category });
    },
    [setFilters]
  );

  /**
   * Filter by date range
   */
  const filterByDateRange = useCallback(
    (start?: string, end?: string) => {
      setFilters({
        after: start,
        before: end,
      });
    },
    [setFilters]
  );

  // Auto-load on mount and when filters change
  useEffect(() => {
    if (autoLoad && (teamId || appId || userId)) {
      loadActivities();
    }
  }, [autoLoad, teamId, appId, userId, filters, loadActivities]);

  // Clear state when IDs change to null
  useEffect(() => {
    if (!teamId && !appId && !userId) {
      setActivities([]);
      setTotal(0);
      setHasMore(false);
      setCursor(undefined);
    }
  }, [teamId, appId, userId]);

  return {
    activities,
    isLoading,
    isLoadingMore,
    error,
    total,
    hasMore,
    filters,
    loadActivities,
    loadMoreActivities,
    refresh,
    getActivity,
    setFilters,
    clearFilters,
    filterByCategory,
    filterByDateRange,
  };
}

export default useActivityLog;
