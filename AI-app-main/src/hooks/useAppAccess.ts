/**
 * useAppAccess Hook - Manages app access settings and collaborators
 *
 * Provides functionality for visibility settings, share links, and collaborator management.
 */

import { useState, useCallback, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type {
  AppAccess,
  AppCollaborator,
  Visibility,
  Permission,
  UpdateAccessInput,
} from '@/types/collaboration';

/**
 * Options for useAppAccess hook
 */
export interface UseAppAccessOptions {
  /** App ID to manage */
  appId: string | null;
  /** Whether to auto-load on mount */
  autoLoad?: boolean;
}

/**
 * Return type for useAppAccess hook
 */
export interface UseAppAccessReturn {
  // State
  /** Access settings for the app */
  access: AppAccess | null;
  /** List of collaborators */
  collaborators: AppCollaborator[];
  /** Current user's permission on the app */
  userPermission: Permission | null;
  /** Whether data is being loaded */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;

  // Access settings actions
  /** Load/refresh access settings */
  loadAccess: () => Promise<void>;
  /** Update access settings */
  updateAccess: (input: UpdateAccessInput) => Promise<boolean>;

  // Share link actions
  /** Create a new share link */
  createShareLink: (permission?: Permission, expiresInDays?: number) => Promise<string | null>;
  /** Revoke the current share link */
  revokeShareLink: () => Promise<boolean>;

  // Collaborator actions
  /** Load collaborators */
  loadCollaborators: () => Promise<void>;
  /** Add a collaborator by user ID */
  addCollaborator: (userId: string, permission: Permission) => Promise<boolean>;
  /** Add a collaborator by email */
  addCollaboratorByEmail: (email: string, permission: Permission) => Promise<boolean>;
  /** Update a collaborator's permission */
  updateCollaboratorPermission: (collaboratorId: string, permission: Permission) => Promise<boolean>;
  /** Remove a collaborator */
  removeCollaborator: (collaboratorId: string) => Promise<boolean>;

  // Permissions
  /** Check if current user can manage access */
  canManageAccess: boolean;
  /** Check if current user is owner */
  isOwner: boolean;
}

/**
 * Hook for managing app access settings and collaborators
 *
 * @param options - Configuration options
 * @returns App access management methods and state
 *
 * @example
 * ```tsx
 * const { access, updateAccess, createShareLink } = useAppAccess({ appId: 'abc123' });
 *
 * const handleMakePublic = async () => {
 *   await updateAccess({ visibility: 'public' });
 * };
 *
 * const handleShare = async () => {
 *   const url = await createShareLink('view', 7); // 7 day expiry
 *   if (url) navigator.clipboard.writeText(url);
 * };
 * ```
 */
export function useAppAccess(options: UseAppAccessOptions): UseAppAccessReturn {
  const { appId, autoLoad = true } = options;

  const [access, setAccess] = useState<AppAccess | null>(null);
  const [collaborators, setCollaborators] = useState<AppCollaborator[]>([]);
  const [userPermission, setUserPermission] = useState<Permission | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Store actions
  const setCurrentAppAccess = useAppStore((state) => state.setCurrentAppAccess);
  const setCurrentAppCollaborators = useAppStore((state) => state.setCurrentAppCollaborators);

  /**
   * Load access settings
   */
  const loadAccess = useCallback(async () => {
    if (!appId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/apps/${appId}/access`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load access settings');
      }

      setAccess(data.access);
      setUserPermission(data.userPermission);
      setCurrentAppAccess(data.access);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load access settings';
      setError(message);
      console.error('Error loading access:', err);
    } finally {
      setIsLoading(false);
    }
  }, [appId, setCurrentAppAccess]);

  /**
   * Update access settings
   */
  const updateAccess = useCallback(
    async (input: UpdateAccessInput): Promise<boolean> => {
      if (!appId) return false;

      setError(null);

      try {
        const response = await fetch(`/api/apps/${appId}/access`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to update access settings');
        }

        setAccess(data.access);
        setCurrentAppAccess(data.access);

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update access settings';
        setError(message);
        console.error('Error updating access:', err);
        return false;
      }
    },
    [appId, setCurrentAppAccess]
  );

  /**
   * Create a share link
   */
  const createShareLink = useCallback(
    async (permission: Permission = 'view', expiresInDays?: number): Promise<string | null> => {
      if (!appId) return null;

      setError(null);

      try {
        const response = await fetch(`/api/apps/${appId}/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ permission, expiresInDays }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create share link');
        }

        // Update access with new share token
        if (access) {
          const updated = {
            ...access,
            shareToken: data.shareToken,
            sharePermission: data.permission,
            shareExpiresAt: data.expiresAt,
          };
          setAccess(updated);
          setCurrentAppAccess(updated);
        }

        return data.shareUrl;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create share link';
        setError(message);
        console.error('Error creating share link:', err);
        return null;
      }
    },
    [appId, access, setCurrentAppAccess]
  );

  /**
   * Revoke the current share link
   */
  const revokeShareLink = useCallback(async (): Promise<boolean> => {
    if (!appId) return false;

    setError(null);

    try {
      const response = await fetch(`/api/apps/${appId}/share`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to revoke share link');
      }

      // Update access to remove share token
      if (access) {
        const updated = {
          ...access,
          shareToken: undefined,
          sharePermission: undefined,
          shareExpiresAt: undefined,
        };
        setAccess(updated);
        setCurrentAppAccess(updated);
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to revoke share link';
      setError(message);
      console.error('Error revoking share link:', err);
      return false;
    }
  }, [appId, access, setCurrentAppAccess]);

  /**
   * Load collaborators
   */
  const loadCollaborators = useCallback(async () => {
    if (!appId) return;

    try {
      const response = await fetch(`/api/apps/${appId}/collaborators`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load collaborators');
      }

      setCollaborators(data.collaborators || []);
      setCurrentAppCollaborators(data.collaborators || []);
    } catch (err) {
      console.error('Error loading collaborators:', err);
    }
  }, [appId, setCurrentAppCollaborators]);

  /**
   * Add a collaborator by user ID
   */
  const addCollaborator = useCallback(
    async (userId: string, permission: Permission): Promise<boolean> => {
      if (!appId) return false;

      setError(null);

      try {
        const response = await fetch(`/api/apps/${appId}/collaborators`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, permission }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to add collaborator');
        }

        // Add to local state
        if (data.collaborator) {
          setCollaborators((prev) => [...prev, data.collaborator]);
          setCurrentAppCollaborators([...collaborators, data.collaborator]);
        }

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add collaborator';
        setError(message);
        console.error('Error adding collaborator:', err);
        return false;
      }
    },
    [appId, collaborators, setCurrentAppCollaborators]
  );

  /**
   * Add a collaborator by email
   */
  const addCollaboratorByEmail = useCallback(
    async (email: string, permission: Permission): Promise<boolean> => {
      if (!appId) return false;

      setError(null);

      try {
        const response = await fetch(`/api/apps/${appId}/collaborators`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, permission }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to add collaborator');
        }

        // Add to local state
        if (data.collaborator) {
          setCollaborators((prev) => [...prev, data.collaborator]);
          setCurrentAppCollaborators([...collaborators, data.collaborator]);
        }

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add collaborator';
        setError(message);
        console.error('Error adding collaborator:', err);
        return false;
      }
    },
    [appId, collaborators, setCurrentAppCollaborators]
  );

  /**
   * Update a collaborator's permission
   */
  const updateCollaboratorPermission = useCallback(
    async (collaboratorId: string, permission: Permission): Promise<boolean> => {
      if (!appId) return false;

      setError(null);

      try {
        const response = await fetch(`/api/apps/${appId}/collaborators/${collaboratorId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ permission }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to update collaborator');
        }

        // Update local state
        setCollaborators((prev) =>
          prev.map((c) => (c.id === collaboratorId ? { ...c, permission } : c))
        );

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update collaborator';
        setError(message);
        console.error('Error updating collaborator:', err);
        return false;
      }
    },
    [appId]
  );

  /**
   * Remove a collaborator
   */
  const removeCollaborator = useCallback(
    async (collaboratorId: string): Promise<boolean> => {
      if (!appId) return false;

      setError(null);

      try {
        const response = await fetch(`/api/apps/${appId}/collaborators/${collaboratorId}`, {
          method: 'DELETE',
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to remove collaborator');
        }

        // Update local state
        const updated = collaborators.filter((c) => c.id !== collaboratorId);
        setCollaborators(updated);
        setCurrentAppCollaborators(updated);

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove collaborator';
        setError(message);
        console.error('Error removing collaborator:', err);
        return false;
      }
    },
    [appId, collaborators, setCurrentAppCollaborators]
  );

  // Computed permissions
  const isOwner = userPermission === 'owner';
  const canManageAccess = userPermission === 'owner' || userPermission === 'admin';

  // Auto-load on mount and when appId changes
  useEffect(() => {
    if (autoLoad && appId) {
      loadAccess();
      loadCollaborators();
    }
  }, [autoLoad, appId, loadAccess, loadCollaborators]);

  // Clear state when appId changes
  useEffect(() => {
    if (!appId) {
      setAccess(null);
      setCollaborators([]);
      setUserPermission(null);
      setError(null);
    }
  }, [appId]);

  return {
    access,
    collaborators,
    userPermission,
    isLoading,
    error,
    loadAccess,
    updateAccess,
    createShareLink,
    revokeShareLink,
    loadCollaborators,
    addCollaborator,
    addCollaboratorByEmail,
    updateCollaboratorPermission,
    removeCollaborator,
    canManageAccess,
    isOwner,
  };
}

export default useAppAccess;
