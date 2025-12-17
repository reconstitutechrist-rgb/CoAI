/**
 * CollaborationNotifications - AI Collaboration Notifications Panel
 *
 * Displays real-time notifications for collaboration events.
 */

'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

export type NotificationType =
  | 'decision_created'
  | 'decision_vote'
  | 'decision_approved'
  | 'decision_rejected'
  | 'handoff_received'
  | 'handoff_accepted'
  | 'handoff_declined'
  | 'review_requested'
  | 'review_response'
  | 'review_approved'
  | 'planning_suggestion'
  | 'planning_vote'
  | 'ownership_assigned'
  | 'context_updated'
  | 'mention';

export interface CollaborationNotification {
  id: string;
  userId: string;
  teamId?: string;
  appId?: string;
  type: NotificationType;
  title: string;
  message: string;
  targetType?: string;
  targetId?: string;
  actorId?: string;
  actorName?: string;
  isRead: boolean;
  createdAt: string;
}

interface CollaborationNotificationsProps {
  userId: string;
  teamId?: string;
  appId?: string;
  onNotificationClick?: (notification: CollaborationNotification) => void;
  maxNotifications?: number;
}

export default function CollaborationNotifications({
  userId,
  teamId,
  appId,
  onNotificationClick,
  maxNotifications = 50,
}: CollaborationNotificationsProps) {
  const [notifications, setNotifications] = useState<CollaborationNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const supabase = useMemo(() => createClient(), []);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('ai_collaboration_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(maxNotifications);

      if (teamId) {
        query = query.eq('team_id', teamId);
      }
      if (appId) {
        query = query.eq('app_id', appId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setNotifications(
        (data || []).map((row) => ({
          id: row.id,
          userId: row.user_id,
          teamId: row.team_id,
          appId: row.app_id,
          type: row.type as NotificationType,
          title: row.title,
          message: row.message,
          targetType: row.target_type,
          targetId: row.target_id,
          actorId: row.actor_id,
          actorName: row.actor_name,
          isRead: row.is_read,
          createdAt: row.created_at,
        }))
      );
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, userId, teamId, appId, maxNotifications]);

  // Subscribe to real-time notifications
  useEffect(() => {
    loadNotifications();

    const channel = supabase
      .channel('ai_collaboration_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_collaboration_notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const newNotification: CollaborationNotification = {
            id: row.id as string,
            userId: row.user_id as string,
            teamId: row.team_id as string | undefined,
            appId: row.app_id as string | undefined,
            type: row.type as NotificationType,
            title: row.title as string,
            message: row.message as string,
            targetType: row.target_type as string | undefined,
            targetId: row.target_id as string | undefined,
            actorId: row.actor_id as string | undefined,
            actorName: row.actor_name as string | undefined,
            isRead: row.is_read as boolean,
            createdAt: row.created_at as string,
          };
          setNotifications((prev) => [newNotification, ...prev].slice(0, maxNotifications));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, loadNotifications, maxNotifications]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('ai_collaboration_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      let query = supabase
        .from('ai_collaboration_notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (teamId) query = query.eq('team_id', teamId);
      if (appId) query = query.eq('app_id', appId);

      await query;

      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleNotificationClick = (notification: CollaborationNotification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    onNotificationClick?.(notification);
  };

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((n) => !n.isRead);
    }
    return notifications;
  }, [notifications, filter]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-500/20 rounded-lg relative">
            <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Notifications</h3>
            <p className="text-sm text-gray-400">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-sm text-rose-400 hover:text-rose-300"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-1 p-2 border-b border-gray-700 bg-gray-800/50">
        {(['all', 'unread'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filter === f
                ? 'bg-rose-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {f === 'all' ? 'All' : 'Unread'}
            {f === 'unread' && unreadCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-rose-500 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="p-4 bg-gray-800 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <p className="text-gray-400">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={() => handleNotificationClick(notification)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface NotificationItemProps {
  notification: CollaborationNotification;
  onClick: () => void;
}

function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const config = getNotificationConfig(notification.type);
  const timeAgo = getTimeAgo(notification.createdAt);

  return (
    <button
      onClick={onClick}
      className={`w-full p-4 text-left hover:bg-gray-800/50 transition-colors ${
        !notification.isRead ? 'bg-gray-800/30' : ''
      }`}
    >
      <div className="flex gap-3">
        <div className={`p-2 rounded-lg ${config.bgColor}`}>
          <span className="text-lg">{config.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`font-medium ${notification.isRead ? 'text-gray-400' : 'text-white'}`}>
              {notification.title}
            </p>
            {!notification.isRead && (
              <span className="w-2 h-2 bg-rose-500 rounded-full flex-shrink-0 mt-2" />
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{notification.message}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
            {notification.actorName && (
              <>
                <span>{notification.actorName}</span>
                <span>•</span>
              </>
            )}
            <span>{timeAgo}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function getNotificationConfig(type: NotificationType): { icon: string; bgColor: string } {
  const configs: Record<NotificationType, { icon: string; bgColor: string }> = {
    decision_created: { icon: '🗳️', bgColor: 'bg-purple-500/20' },
    decision_vote: { icon: '✓', bgColor: 'bg-purple-500/20' },
    decision_approved: { icon: '✅', bgColor: 'bg-green-500/20' },
    decision_rejected: { icon: '❌', bgColor: 'bg-red-500/20' },
    handoff_received: { icon: '↔', bgColor: 'bg-cyan-500/20' },
    handoff_accepted: { icon: '✓', bgColor: 'bg-green-500/20' },
    handoff_declined: { icon: '✗', bgColor: 'bg-red-500/20' },
    review_requested: { icon: '📝', bgColor: 'bg-emerald-500/20' },
    review_response: { icon: '💬', bgColor: 'bg-emerald-500/20' },
    review_approved: { icon: '✅', bgColor: 'bg-green-500/20' },
    planning_suggestion: { icon: '📋', bgColor: 'bg-indigo-500/20' },
    planning_vote: { icon: '👍', bgColor: 'bg-indigo-500/20' },
    ownership_assigned: { icon: '👤', bgColor: 'bg-amber-500/20' },
    context_updated: { icon: '💡', bgColor: 'bg-blue-500/20' },
    mention: { icon: '@', bgColor: 'bg-pink-500/20' },
  };
  return configs[type] || { icon: '📢', bgColor: 'bg-gray-500/20' };
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

/**
 * Notification Bell Button Component
 * Can be used in headers/toolbars
 */
export function NotificationBell({
  unreadCount,
  onClick,
}: {
  unreadCount: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
