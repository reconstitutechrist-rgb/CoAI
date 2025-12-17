/**
 * useCollaborationPresence Hook - Real-time presence tracking
 *
 * Provides functionality for tracking online team members and their activities.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { PresenceUser, PresenceStatus } from '@/types/collaboration';

/**
 * Options for useCollaborationPresence hook
 */
export interface UseCollaborationPresenceOptions {
  /** Team ID for team presence */
  teamId?: string | null;
  /** App ID for app presence */
  appId?: string | null;
  /** How often to update presence (ms) */
  heartbeatInterval?: number;
  /** Time before marking user as away (ms) */
  awayTimeout?: number;
}

/**
 * Return type for useCollaborationPresence hook
 */
export interface UseCollaborationPresenceReturn {
  /** List of online users */
  onlineUsers: PresenceUser[];
  /** Current user's presence status */
  myStatus: PresenceStatus;
  /** Whether connected to presence channel */
  isConnected: boolean;
  /** Set current user's status */
  setStatus: (status: PresenceStatus) => void;
  /** Set current user's activity description */
  setActivity: (activity: string) => void;
  /** Force sync presence state */
  sync: () => Promise<void>;
}

const DEFAULT_HEARTBEAT_INTERVAL = 30000; // 30 seconds
const DEFAULT_AWAY_TIMEOUT = 300000; // 5 minutes

/**
 * Hook for tracking online presence in teams and apps
 *
 * @param options - Configuration options
 * @returns Presence tracking methods and state
 *
 * @example
 * ```tsx
 * const { onlineUsers, myStatus, setStatus } = useCollaborationPresence({
 *   teamId: 'team-123',
 * });
 *
 * // Show online users
 * onlineUsers.map(user => <Avatar key={user.id} user={user} status={user.status} />)
 * ```
 */
export function useCollaborationPresence(
  options: UseCollaborationPresenceOptions
): UseCollaborationPresenceReturn {
  const {
    teamId,
    appId,
    heartbeatInterval = DEFAULT_HEARTBEAT_INTERVAL,
    awayTimeout = DEFAULT_AWAY_TIMEOUT,
  } = options;

  const { user: currentUser } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [myStatus, setMyStatus] = useState<PresenceStatus>('online');
  const [myActivity, setMyActivity] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const awayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Track user activity to detect "away" status
  useEffect(() => {
    const handleActivity = () => {
      lastActivityRef.current = Date.now();

      // If was away, come back online
      if (myStatus === 'away') {
        setMyStatus('online');
      }

      // Reset away timeout
      if (awayTimeoutRef.current) {
        clearTimeout(awayTimeoutRef.current);
      }

      awayTimeoutRef.current = setTimeout(() => {
        setMyStatus('away');
      }, awayTimeout);
    };

    // Listen for user activity
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((event) => window.addEventListener(event, handleActivity, { passive: true }));

    // Initial away timeout
    awayTimeoutRef.current = setTimeout(() => {
      setMyStatus('away');
    }, awayTimeout);

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleActivity));
      if (awayTimeoutRef.current) {
        clearTimeout(awayTimeoutRef.current);
      }
    };
  }, [awayTimeout, myStatus]);

  // Subscribe to presence channel
  useEffect(() => {
    if (!currentUser?.id || (!teamId && !appId)) {
      setOnlineUsers([]);
      setIsConnected(false);
      return;
    }

    const supabase = createClient();
    const channelName = teamId ? `presence:team:${teamId}` : `presence:app:${appId}`;

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: currentUser.id,
        },
      },
    });

    // Handle presence sync
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: PresenceUser[] = [];

        Object.entries(state).forEach(([userId, presences]) => {
          const presence = (presences as Array<Record<string, unknown>>)[0];
          if (presence) {
            users.push({
              id: userId,
              email: presence.email as string,
              fullName: presence.fullName as string | undefined,
              avatarUrl: presence.avatarUrl as string | undefined,
              status: presence.status as PresenceStatus,
              activity: presence.activity as string | undefined,
              lastSeen: presence.lastSeen as string,
              location: presence.location as PresenceUser['location'] | undefined,
            });
          }
        });

        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // User joined
        const presence = (newPresences as Array<Record<string, unknown>>)[0];
        if (presence) {
          setOnlineUsers((prev) => {
            const filtered = prev.filter((u) => u.id !== key);
            return [
              ...filtered,
              {
                id: key,
                email: presence.email as string,
                fullName: presence.fullName as string | undefined,
                avatarUrl: presence.avatarUrl as string | undefined,
                status: presence.status as PresenceStatus,
                activity: presence.activity as string | undefined,
                lastSeen: presence.lastSeen as string,
                location: presence.location as PresenceUser['location'] | undefined,
              },
            ];
          });
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        // User left
        setOnlineUsers((prev) => prev.filter((u) => u.id !== key));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);

          // Track presence
          await channel.track({
            email: currentUser.email,
            fullName: currentUser.user_metadata?.full_name,
            avatarUrl: currentUser.user_metadata?.avatar_url,
            status: myStatus,
            activity: myActivity,
            lastSeen: new Date().toISOString(),
            location: teamId
              ? { type: 'team', id: teamId, name: '' }
              : appId
              ? { type: 'app', id: appId, name: '' }
              : undefined,
          });
        } else {
          setIsConnected(false);
        }
      });

    channelRef.current = channel;

    // Heartbeat to update presence
    heartbeatRef.current = setInterval(async () => {
      if (channelRef.current && isConnected) {
        await channelRef.current.track({
          email: currentUser.email,
          fullName: currentUser.user_metadata?.full_name,
          avatarUrl: currentUser.user_metadata?.avatar_url,
          status: myStatus,
          activity: myActivity,
          lastSeen: new Date().toISOString(),
          location: teamId
            ? { type: 'team', id: teamId, name: '' }
            : appId
            ? { type: 'app', id: appId, name: '' }
            : undefined,
        });
      }
    }, heartbeatInterval);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [currentUser, teamId, appId, heartbeatInterval, myStatus, myActivity, isConnected]);

  // Update presence when status or activity changes
  useEffect(() => {
    const updatePresence = async () => {
      if (channelRef.current && currentUser && isConnected) {
        await channelRef.current.track({
          email: currentUser.email,
          fullName: currentUser.user_metadata?.full_name,
          avatarUrl: currentUser.user_metadata?.avatar_url,
          status: myStatus,
          activity: myActivity,
          lastSeen: new Date().toISOString(),
          location: teamId
            ? { type: 'team', id: teamId, name: '' }
            : appId
            ? { type: 'app', id: appId, name: '' }
            : undefined,
        });
      }
    };

    updatePresence();
  }, [myStatus, myActivity, currentUser, teamId, appId, isConnected]);

  /**
   * Set current user's status
   */
  const setStatus = useCallback((status: PresenceStatus) => {
    setMyStatus(status);
  }, []);

  /**
   * Set current user's activity description
   */
  const setActivity = useCallback((activity: string) => {
    setMyActivity(activity);
  }, []);

  /**
   * Force sync presence state
   */
  const sync = useCallback(async () => {
    if (channelRef.current && currentUser && isConnected) {
      await channelRef.current.track({
        email: currentUser.email,
        fullName: currentUser.user_metadata?.full_name,
        avatarUrl: currentUser.user_metadata?.avatar_url,
        status: myStatus,
        activity: myActivity,
        lastSeen: new Date().toISOString(),
        location: teamId
          ? { type: 'team', id: teamId, name: '' }
          : appId
          ? { type: 'app', id: appId, name: '' }
          : undefined,
      });
    }
  }, [currentUser, myStatus, myActivity, teamId, appId, isConnected]);

  return {
    onlineUsers,
    myStatus,
    isConnected,
    setStatus,
    setActivity,
    sync,
  };
}

export default useCollaborationPresence;
