/**
 * useProjectArtifacts Hook - Project artifacts management
 *
 * Provides functionality for creating, viewing, updating, and deleting
 * project artifacts (saved AI Builder and AI Debate work).
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ProjectArtifactService } from '@/services/ProjectArtifactService';
import { useAuth } from '@/contexts/AuthContext';
import type {
  ProjectArtifact,
  CreateArtifactInput,
  UpdateArtifactInput,
  ArtifactFilters,
  ArtifactType,
  ArtifactStatus,
} from '@/types/projectArtifacts';

/**
 * Options for useProjectArtifacts hook
 */
export interface UseProjectArtifactsOptions {
  /** Team ID (required) */
  teamId: string | null;
  /** Initial filters */
  filters?: Omit<ArtifactFilters, 'teamId'>;
  /** Whether to auto-load on mount */
  autoLoad?: boolean;
}

/**
 * Return type for useProjectArtifacts hook
 */
export interface UseProjectArtifactsReturn {
  // State
  /** All artifacts */
  artifacts: ProjectArtifact[];
  /** Selected artifact (for detail view) */
  selectedArtifact: ProjectArtifact | null;
  /** Whether artifacts are loading */
  isLoading: boolean;
  /** Whether creating an artifact */
  isCreating: boolean;
  /** Whether updating an artifact */
  isUpdating: boolean;
  /** Whether deleting an artifact */
  isDeleting: boolean;
  /** Error message */
  error: string | null;
  /** Total count */
  total: number;
  /** Whether there are more artifacts */
  hasMore: boolean;
  /** Current filters */
  filters: ArtifactFilters;
  /** Artifact counts by type */
  counts: Record<ArtifactType, number> | null;
  /** Whether user can edit the selected artifact */
  canEditSelected: boolean;

  // Artifact actions
  /** Load artifacts */
  loadArtifacts: () => Promise<void>;
  /** Load more artifacts */
  loadMoreArtifacts: () => Promise<void>;
  /** Create a new artifact */
  createArtifact: (input: Omit<CreateArtifactInput, 'teamId'>) => Promise<ProjectArtifact | null>;
  /** Update an artifact */
  updateArtifact: (artifactId: string, input: UpdateArtifactInput) => Promise<boolean>;
  /** Delete an artifact */
  deleteArtifact: (artifactId: string) => Promise<boolean>;
  /** Archive an artifact */
  archiveArtifact: (artifactId: string) => Promise<boolean>;
  /** Get a single artifact by ID */
  getArtifact: (artifactId: string) => Promise<ProjectArtifact | null>;

  // Selection
  /** Select an artifact for detail view */
  selectArtifact: (artifactId: string | null) => Promise<void>;
  /** Clear selection */
  clearSelection: () => void;

  // Filter actions
  /** Set filters */
  setFilters: (filters: Partial<ArtifactFilters>) => void;
  /** Clear filters */
  clearFilters: () => void;
  /** Set artifact type filter */
  setTypeFilter: (type: ArtifactType | undefined) => void;
  /** Set status filter */
  setStatusFilter: (status: ArtifactStatus | undefined) => void;
  /** Set search query */
  setSearch: (search: string) => void;

  // Refresh
  /** Refresh artifacts */
  refresh: () => Promise<void>;
}

const DEFAULT_LIMIT = 20;

/**
 * Hook for managing project artifacts
 *
 * @param options - Configuration options
 * @returns Artifact management methods and state
 *
 * @example
 * ```tsx
 * const { artifacts, createArtifact, isLoading } = useProjectArtifacts({
 *   teamId: 'team-123',
 *   filters: { status: 'published' },
 * });
 *
 * const handleSave = async () => {
 *   await createArtifact({
 *     name: 'My App Plan',
 *     artifactType: 'ai_builder_plan',
 *     content: { appConcept, conversationContext },
 *   });
 * };
 * ```
 */
export function useProjectArtifacts(options: UseProjectArtifactsOptions): UseProjectArtifactsReturn {
  const { teamId, filters: initialFilters, autoLoad = true } = options;
  const { user } = useAuth();

  const [artifacts, setArtifacts] = useState<ProjectArtifact[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<ProjectArtifact | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [filters, setFiltersState] = useState<ArtifactFilters>({
    teamId: teamId || '',
    ...initialFilters,
  });
  const [counts, setCounts] = useState<Record<ArtifactType, number> | null>(null);
  const [canEditSelected, setCanEditSelected] = useState(false);

  const serviceRef = useRef<ProjectArtifactService | null>(null);

  // Initialize service
  useEffect(() => {
    const supabase = createClient();
    serviceRef.current = new ProjectArtifactService(supabase);
  }, []);

  // Update teamId in filters when it changes
  useEffect(() => {
    if (teamId) {
      setFiltersState((prev) => ({ ...prev, teamId }));
    }
  }, [teamId]);

  // Load artifacts
  const loadArtifacts = useCallback(async () => {
    if (!teamId || !serviceRef.current) return;

    setIsLoading(true);
    setError(null);
    setOffset(0);

    try {
      const result = await serviceRef.current.list({
        ...filters,
        teamId,
        limit: DEFAULT_LIMIT,
        offset: 0,
      });

      if (result.success) {
        setArtifacts(result.data.artifacts);
        setTotal(result.data.total);
        setHasMore(result.data.hasMore);
      } else {
        setError(result.error?.message || 'Failed to load artifacts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load artifacts');
    } finally {
      setIsLoading(false);
    }
  }, [teamId, filters]);

  // Load more artifacts
  const loadMoreArtifacts = useCallback(async () => {
    if (!teamId || !serviceRef.current || isLoading || !hasMore) return;

    setIsLoading(true);
    const newOffset = offset + DEFAULT_LIMIT;

    try {
      const result = await serviceRef.current.list({
        ...filters,
        teamId,
        limit: DEFAULT_LIMIT,
        offset: newOffset,
      });

      if (result.success) {
        setArtifacts((prev) => [...prev, ...result.data.artifacts]);
        setOffset(newOffset);
        setHasMore(result.data.hasMore);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more artifacts');
    } finally {
      setIsLoading(false);
    }
  }, [teamId, filters, offset, isLoading, hasMore]);

  // Create artifact
  const createArtifact = useCallback(
    async (input: Omit<CreateArtifactInput, 'teamId'>): Promise<ProjectArtifact | null> => {
      if (!teamId || !user || !serviceRef.current) return null;

      setIsCreating(true);
      setError(null);

      try {
        const result = await serviceRef.current.create(user.id, {
          ...input,
          teamId,
        });

        if (result.success) {
          // Add to beginning of list
          setArtifacts((prev) => [result.data, ...prev]);
          setTotal((prev) => prev + 1);
          return result.data;
        } else {
          setError(result.error?.message || 'Failed to create artifact');
          return null;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create artifact');
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [teamId, user]
  );

  // Update artifact
  const updateArtifact = useCallback(
    async (artifactId: string, input: UpdateArtifactInput): Promise<boolean> => {
      if (!user || !serviceRef.current) return false;

      setIsUpdating(true);
      setError(null);

      try {
        const result = await serviceRef.current.update(artifactId, user.id, input);

        if (result.success) {
          // Update in list
          setArtifacts((prev) =>
            prev.map((a) => (a.id === artifactId ? result.data : a))
          );
          // Update selected if it's the same artifact
          if (selectedArtifact?.id === artifactId) {
            setSelectedArtifact(result.data);
          }
          return true;
        } else {
          setError(result.error?.message || 'Failed to update artifact');
          return false;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update artifact');
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [user, selectedArtifact]
  );

  // Delete artifact
  const deleteArtifact = useCallback(
    async (artifactId: string): Promise<boolean> => {
      if (!user || !serviceRef.current) return false;

      setIsDeleting(true);
      setError(null);

      try {
        const result = await serviceRef.current.delete(artifactId, user.id);

        if (result.success) {
          // Remove from list
          setArtifacts((prev) => prev.filter((a) => a.id !== artifactId));
          setTotal((prev) => prev - 1);
          // Clear selection if deleted artifact was selected
          if (selectedArtifact?.id === artifactId) {
            setSelectedArtifact(null);
          }
          return true;
        } else {
          setError(result.error?.message || 'Failed to delete artifact');
          return false;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete artifact');
        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    [user, selectedArtifact]
  );

  // Archive artifact
  const archiveArtifact = useCallback(
    async (artifactId: string): Promise<boolean> => {
      return updateArtifact(artifactId, { status: 'archived' });
    },
    [updateArtifact]
  );

  // Get single artifact
  const getArtifact = useCallback(
    async (artifactId: string): Promise<ProjectArtifact | null> => {
      if (!serviceRef.current) return null;

      try {
        const result = await serviceRef.current.getById(artifactId);
        return result.success ? result.data : null;
      } catch {
        return null;
      }
    },
    []
  );

  // Select artifact
  const selectArtifact = useCallback(
    async (artifactId: string | null) => {
      if (!artifactId) {
        setSelectedArtifact(null);
        setCanEditSelected(false);
        return;
      }

      // Check if already in list
      const existing = artifacts.find((a) => a.id === artifactId);
      if (existing) {
        setSelectedArtifact(existing);
        // Check edit permission
        if (user && serviceRef.current) {
          const canEdit = await serviceRef.current.canEditArtifact(user.id, existing);
          setCanEditSelected(canEdit);
        }
        return;
      }

      // Fetch from API
      const artifact = await getArtifact(artifactId);
      if (artifact) {
        setSelectedArtifact(artifact);
        // Check edit permission
        if (user && serviceRef.current) {
          const canEdit = await serviceRef.current.canEditArtifact(user.id, artifact);
          setCanEditSelected(canEdit);
        }
      }
    },
    [artifacts, user, getArtifact]
  );

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedArtifact(null);
    setCanEditSelected(false);
  }, []);

  // Set filters
  const setFilters = useCallback((newFilters: Partial<ArtifactFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
    setOffset(0);
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFiltersState({ teamId: teamId || '' });
    setOffset(0);
  }, [teamId]);

  // Set type filter
  const setTypeFilter = useCallback((type: ArtifactType | undefined) => {
    setFilters({ artifactType: type });
  }, [setFilters]);

  // Set status filter
  const setStatusFilter = useCallback((status: ArtifactStatus | undefined) => {
    setFilters({ status });
  }, [setFilters]);

  // Set search
  const setSearch = useCallback((search: string) => {
    setFilters({ search: search || undefined });
  }, [setFilters]);

  // Refresh
  const refresh = useCallback(async () => {
    await loadArtifacts();
  }, [loadArtifacts]);

  // Auto-load on mount and filter changes
  useEffect(() => {
    if (autoLoad && teamId) {
      loadArtifacts();
    }
  }, [autoLoad, teamId, filters, loadArtifacts]);

  return {
    // State
    artifacts,
    selectedArtifact,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    error,
    total,
    hasMore,
    filters,
    counts,
    canEditSelected,

    // Artifact actions
    loadArtifacts,
    loadMoreArtifacts,
    createArtifact,
    updateArtifact,
    deleteArtifact,
    archiveArtifact,
    getArtifact,

    // Selection
    selectArtifact,
    clearSelection,

    // Filter actions
    setFilters,
    clearFilters,
    setTypeFilter,
    setStatusFilter,
    setSearch,

    // Refresh
    refresh,
  };
}
