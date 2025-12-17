'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  XIcon,
  CheckCircleIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon,
  TagIcon,
  FileIcon,
  MessageSquareIcon,
  EditIcon,
  TrashIcon,
  LoaderIcon,
} from '../ui/Icons';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import type {
  Task,
  TaskComment,
  TaskStatus,
  TaskPriority,
  TaskType,
  UserInfo,
  UpdateTaskInput,
} from '@/types/collaboration';

export interface TaskDetailModalProps {
  /** Task to display */
  task: Task;
  /** Team ID for context */
  teamId?: string | null;
  /** App ID for context */
  appId?: string | null;
  /** Team members for assignment */
  members?: UserInfo[];
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback when task is updated */
  onTaskUpdated?: (task: Task) => void;
  /** Callback when task is deleted */
  onTaskDeleted?: (taskId: string) => void;
}

// Status options with colors
const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'todo', label: 'To Do', color: 'bg-zinc-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
  { value: 'review', label: 'Review', color: 'bg-purple-500' },
  { value: 'done', label: 'Done', color: 'bg-green-500' },
  { value: 'blocked', label: 'Blocked', color: 'bg-red-500' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-zinc-400' },
];

// Priority options with colors
const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'text-zinc-400' },
  { value: 'medium', label: 'Medium', color: 'text-blue-400' },
  { value: 'high', label: 'High', color: 'text-amber-400' },
  { value: 'urgent', label: 'Urgent', color: 'text-red-400' },
];

// Task type options
const TYPE_OPTIONS: { value: TaskType; label: string }[] = [
  { value: 'feature', label: 'Feature' },
  { value: 'bug', label: 'Bug' },
  { value: 'research', label: 'Research' },
  { value: 'documentation', label: 'Documentation' },
  { value: 'review', label: 'Review' },
  { value: 'other', label: 'Other' },
];

/**
 * TaskDetailModal - Full task view with editing capabilities
 */
export function TaskDetailModal({
  task,
  teamId,
  appId,
  members = [],
  isOpen,
  onClose,
  onTaskUpdated,
  onTaskDeleted,
}: TaskDetailModalProps) {
  const { user: currentUser } = useAuth();
  const {
    comments,
    isLoadingComments,
    updateTask,
    deleteTask,
    addComment,
    deleteComment,
    selectTask,
  } = useTasks({ teamId, appId, autoLoad: false });

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState<UpdateTaskInput>({
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    taskType: task.taskType,
    assignedTo: task.assignedTo,
    dueDate: task.dueDate,
    labels: task.labels,
    estimatedHours: task.estimatedHours,
  });

  // Load comments when modal opens
  useEffect(() => {
    if (isOpen && task.id) {
      selectTask(task.id);
    }
  }, [isOpen, task.id, selectTask]);

  // Reset edit form when task changes
  useEffect(() => {
    setEditForm({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      taskType: task.taskType,
      assignedTo: task.assignedTo,
      dueDate: task.dueDate,
      labels: task.labels,
      estimatedHours: task.estimatedHours,
    });
  }, [task]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const success = await updateTask(task.id, editForm);
      if (success) {
        setIsEditing(false);
        onTaskUpdated?.({ ...task, ...editForm } as Task);
      }
    } finally {
      setIsSaving(false);
    }
  }, [task, editForm, updateTask, onTaskUpdated]);

  const handleDelete = useCallback(async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    setIsDeleting(true);
    try {
      const success = await deleteTask(task.id);
      if (success) {
        onTaskDeleted?.(task.id);
        onClose();
      }
    } finally {
      setIsDeleting(false);
    }
  }, [task.id, deleteTask, onTaskDeleted, onClose]);

  const handleAddComment = useCallback(async () => {
    if (!newComment.trim()) return;

    setIsAddingComment(true);
    try {
      await addComment({ content: newComment });
      setNewComment('');
    } finally {
      setIsAddingComment(false);
    }
  }, [newComment, addComment]);

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      if (!confirm('Delete this comment?')) return;
      await deleteComment(commentId);
    },
    [deleteComment]
  );

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  const statusOption = STATUS_OPTIONS.find((s) => s.value === task.status);
  const priorityOption = PRIORITY_OPTIONS.find((p) => p.value === task.priority);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${statusOption?.color || 'bg-zinc-500'}`} />
            <span className="text-sm text-zinc-400 capitalize">{task.taskType}</span>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                title="Edit task"
              >
                <EditIcon size={18} />
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-2 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition-colors disabled:opacity-50"
              title="Delete task"
            >
              {isDeleting ? <LoaderIcon size={18} className="animate-spin" /> : <TrashIcon size={18} />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <XIcon size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Title */}
            {isEditing ? (
              <input
                type="text"
                value={editForm.title || ''}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="w-full text-xl font-semibold bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <h2 className="text-xl font-semibold text-zinc-100">{task.title}</h2>
            )}

            {/* Meta info row */}
            <div className="flex flex-wrap items-center gap-4 mt-4">
              {/* Status */}
              {isEditing ? (
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as TaskStatus })}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-200"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span className={`px-2 py-1 rounded text-xs font-medium ${statusOption?.color} text-white`}>
                  {statusOption?.label}
                </span>
              )}

              {/* Priority */}
              {isEditing ? (
                <select
                  value={editForm.priority}
                  onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as TaskPriority })}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-200"
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span className={`text-sm font-medium ${priorityOption?.color}`}>
                  {priorityOption?.label} priority
                </span>
              )}

              {/* Due date */}
              <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                <CalendarIcon size={14} />
                {isEditing ? (
                  <input
                    type="date"
                    value={editForm.dueDate?.split('T')[0] || ''}
                    onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value || null })}
                    className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-200"
                  />
                ) : (
                  <span>{formatDate(task.dueDate)}</span>
                )}
              </div>
            </div>

            {/* Assignee */}
            <div className="flex items-center gap-3 mt-4 py-3 border-t border-zinc-800">
              <UserIcon size={16} className="text-zinc-500" />
              <span className="text-sm text-zinc-400">Assignee:</span>
              {isEditing ? (
                <select
                  value={editForm.assignedTo || ''}
                  onChange={(e) => setEditForm({ ...editForm, assignedTo: e.target.value || null })}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-200"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName || m.email}
                    </option>
                  ))}
                </select>
              ) : task.assignee ? (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden">
                    {task.assignee.avatarUrl ? (
                      <img src={task.assignee.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon size={12} className="text-zinc-400" />
                    )}
                  </div>
                  <span className="text-sm text-zinc-200">
                    {task.assignee.fullName || task.assignee.email}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-zinc-500">Unassigned</span>
              )}
            </div>

            {/* Description */}
            <div className="mt-4">
              <h3 className="text-sm font-medium text-zinc-400 mb-2">Description</h3>
              {isEditing ? (
                <textarea
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={4}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add a description..."
                />
              ) : (
                <p className="text-zinc-300 whitespace-pre-wrap">
                  {task.description || 'No description provided.'}
                </p>
              )}
            </div>

            {/* Labels */}
            {task.labels.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-zinc-400 mb-2 flex items-center gap-1.5">
                  <TagIcon size={14} />
                  Labels
                </h3>
                <div className="flex flex-wrap gap-2">
                  {task.labels.map((label) => (
                    <span
                      key={label}
                      className="px-2 py-0.5 rounded-full bg-zinc-800 text-xs text-zinc-300"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Linked files */}
            {task.linkedFilePaths.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-zinc-400 mb-2 flex items-center gap-1.5">
                  <FileIcon size={14} />
                  Linked Files
                </h3>
                <div className="space-y-1">
                  {task.linkedFilePaths.map((path) => (
                    <div key={path} className="text-sm text-blue-400 font-mono">
                      {path}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Time tracking */}
            {(task.estimatedHours || task.actualHours) && (
              <div className="mt-4 flex items-center gap-4">
                <ClockIcon size={14} className="text-zinc-500" />
                {task.estimatedHours && (
                  <span className="text-sm text-zinc-400">
                    Estimated: {task.estimatedHours}h
                  </span>
                )}
                {task.actualHours && (
                  <span className="text-sm text-zinc-400">
                    Actual: {task.actualHours}h
                  </span>
                )}
              </div>
            )}

            {/* Edit actions */}
            {isEditing && (
              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-zinc-800">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditForm({
                      title: task.title,
                      description: task.description,
                      status: task.status,
                      priority: task.priority,
                      taskType: task.taskType,
                      assignedTo: task.assignedTo,
                      dueDate: task.dueDate,
                      labels: task.labels,
                      estimatedHours: task.estimatedHours,
                    });
                  }}
                  className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Comments section */}
            <div className="mt-6 pt-4 border-t border-zinc-800">
              <h3 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-1.5">
                <MessageSquareIcon size={14} />
                Comments ({comments.length})
              </h3>

              {/* Comment list */}
              {isLoadingComments ? (
                <div className="flex items-center justify-center py-8">
                  <LoaderIcon size={20} className="animate-spin text-zinc-500" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-sm text-zinc-500 py-4">No comments yet.</p>
              ) : (
                <div className="space-y-4 mb-4">
                  {comments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      currentUserId={currentUser?.id}
                      onDelete={handleDeleteComment}
                      formatDateTime={formatDateTime}
                    />
                  ))}
                </div>
              )}

              {/* Add comment */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                  <UserIcon size={14} className="text-zinc-400" />
                </div>
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    rows={2}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || isAddingComment}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isAddingComment ? 'Adding...' : 'Add Comment'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-900/50 text-xs text-zinc-500">
          Created {formatDateTime(task.createdAt)}
          {task.creator && ` by ${task.creator.fullName || task.creator.email}`}
          {task.updatedAt !== task.createdAt && ` • Updated ${formatDateTime(task.updatedAt)}`}
        </div>
      </div>
    </div>
  );
}

/**
 * Comment item component
 */
function CommentItem({
  comment,
  currentUserId,
  onDelete,
  formatDateTime,
}: {
  comment: TaskComment;
  currentUserId?: string;
  onDelete: (id: string) => void;
  formatDateTime: (date: string) => string;
}) {
  const isOwner = currentUserId === comment.userId;

  return (
    <div className="flex gap-3 group">
      <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {comment.user?.avatarUrl ? (
          <img src={comment.user.avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <UserIcon size={14} className="text-zinc-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-200">
            {comment.user?.fullName || comment.user?.email || 'Unknown'}
          </span>
          <span className="text-xs text-zinc-500">{formatDateTime(comment.createdAt)}</span>
          {comment.editedAt && <span className="text-xs text-zinc-600">(edited)</span>}
          {isOwner && (
            <button
              onClick={() => onDelete(comment.id)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-all"
            >
              <TrashIcon size={12} />
            </button>
          )}
        </div>
        <p className="text-sm text-zinc-300 mt-1 whitespace-pre-wrap">{comment.content}</p>
      </div>
    </div>
  );
}

export default TaskDetailModal;
