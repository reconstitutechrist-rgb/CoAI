/**
 * Comprehensive type definitions for the collaboration system
 *
 * This module provides:
 * - Team and workspace management types
 * - Real-time chat message types
 * - Task assignment and tracking types
 * - Activity logging types
 * - Permission and access control types
 *
 * @module collaboration
 */

// ============================================================================
// ROLE AND PERMISSION TYPES
// ============================================================================

/**
 * Team member roles with hierarchical permissions
 * - owner: Full control, can delete team
 * - admin: Can manage members and settings
 * - editor: Can edit apps and create tasks
 * - viewer: Read-only access
 */
export type TeamRole = 'owner' | 'admin' | 'editor' | 'viewer';

/**
 * App visibility levels
 * - private: Only owner can access (default)
 * - invite_only: Only invited collaborators
 * - team: All team members
 * - logged_in: Any authenticated user
 * - public: Anyone with the link
 */
export type Visibility = 'private' | 'invite_only' | 'team' | 'logged_in' | 'public';

/**
 * App-level permissions for collaborators
 * - view: Read-only access
 * - edit: Can modify the app
 * - admin: Full control (can manage access)
 * - owner: Original creator
 */
export type Permission = 'view' | 'edit' | 'admin' | 'owner';

/**
 * Task status in the workflow
 */
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'blocked' | 'cancelled';

/**
 * Task priority levels
 */
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Task type categories
 */
export type TaskType = 'feature' | 'bug' | 'research' | 'documentation' | 'review' | 'other';

/**
 * Activity log categories for filtering
 */
export type ActivityCategory =
  | 'app'
  | 'code'
  | 'phase'
  | 'task'
  | 'team'
  | 'access'
  | 'chat'
  | 'documentation';

/**
 * Chat message types
 */
export type ChatMessageType = 'text' | 'system' | 'ai_summary' | 'meeting_notes' | 'ai_response';

/**
 * Team member status
 */
export type MemberStatus = 'pending' | 'active' | 'removed';

/**
 * Presence status for online indicators
 */
export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';

// ============================================================================
// TEAM TYPES
// ============================================================================

/**
 * Team settings configuration
 */
export interface TeamSettings {
  /** Whether non-admin members can invite others */
  allowMemberInvites: boolean;
  /** Default role for new members */
  defaultMemberRole: Exclude<TeamRole, 'owner'>;
  /** Whether join requests need approval */
  requireApprovalForJoin: boolean;
}

/**
 * Complete team/workspace data
 */
export interface Team {
  /** Unique identifier */
  id: string;
  /** Team display name */
  name: string;
  /** URL-friendly unique slug */
  slug: string;
  /** Team description */
  description?: string;
  /** Avatar image URL */
  avatarUrl?: string;
  /** Team owner user ID */
  ownerId: string;
  /** Team configuration */
  settings: TeamSettings;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;

  // Joined data (optional, populated on fetch)
  /** Team owner user details */
  owner?: UserInfo;
  /** Count of active members */
  memberCount?: number;
}

/**
 * Team creation input
 */
export interface CreateTeamInput {
  name: string;
  description?: string;
  settings?: Partial<TeamSettings>;
}

/**
 * Team update input
 */
export interface UpdateTeamInput {
  name?: string;
  description?: string;
  avatarUrl?: string;
  settings?: Partial<TeamSettings>;
}

// ============================================================================
// TEAM MEMBER TYPES
// ============================================================================

/**
 * Basic user information for display
 */
export interface UserInfo {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
}

/**
 * Complete team membership data
 */
export interface TeamMember {
  /** Membership record ID */
  id: string;
  /** Team ID */
  teamId: string;
  /** User ID */
  userId: string;
  /** Member's role in the team */
  role: TeamRole;
  /** Who invited this member */
  invitedBy?: string;
  /** When they were invited */
  invitedAt?: string;
  /** When they joined */
  joinedAt: string;
  /** Current membership status */
  status: MemberStatus;

  // Joined data
  /** User details */
  user?: UserInfo;
  /** Inviter details */
  inviter?: UserInfo;
}

/**
 * Input for adding a team member
 */
export interface AddMemberInput {
  /** Email of user to add */
  email: string;
  /** Role to assign */
  role: Exclude<TeamRole, 'owner'>;
}

// ============================================================================
// INVITATION TYPES
// ============================================================================

/**
 * Team invitation data
 */
export interface TeamInvite {
  /** Invitation record ID */
  id: string;
  /** Team being invited to */
  teamId: string;
  /** Unique invitation code */
  inviteCode: string;
  /** Email for email-specific invites */
  email?: string;
  /** Role to assign when accepting */
  role: Exclude<TeamRole, 'owner'>;
  /** User who created the invite */
  createdBy: string;
  /** When the invite expires */
  expiresAt?: string;
  /** Maximum number of uses */
  maxUses?: number;
  /** Current use count */
  useCount: number;
  /** Creation timestamp */
  createdAt: string;

  // Joined data
  /** Team details */
  team?: Pick<Team, 'id' | 'name' | 'slug' | 'avatarUrl'>;
  /** Creator details */
  creator?: UserInfo;
}

/**
 * Input for creating an invitation
 */
export interface CreateInviteInput {
  /** Email for email-specific invite (optional for link invites) */
  email?: string;
  /** Role to assign */
  role: Exclude<TeamRole, 'owner'>;
  /** Expiration in days (null for no expiration). API converts to hours internally. */
  expiresInDays?: number;
  /** Maximum uses (null for unlimited) */
  maxUses?: number;
}

/**
 * Internal input for service layer (uses hours)
 */
export interface CreateInviteServiceInput {
  /** Email for email-specific invite (optional for link invites) */
  email?: string;
  /** Role to assign */
  role: Exclude<TeamRole, 'owner'>;
  /** Expiration in hours (null for no expiration) */
  expiresInHours?: number;
  /** Maximum uses (null for unlimited) */
  maxUses?: number;
}

/**
 * Invitation URL with code
 */
export interface InviteLink {
  /** Full invitation URL */
  url: string;
  /** Invitation code */
  code: string;
  /** Expiration timestamp */
  expiresAt?: string;
}

// ============================================================================
// APP ACCESS TYPES
// ============================================================================

/**
 * App access configuration
 */
export interface AppAccess {
  /** Access record ID */
  id: string;
  /** App ID */
  appId: string;
  /** Visibility level */
  visibility: Visibility;
  /** Associated team ID (if team visibility) */
  teamId?: string;
  /** Share link token */
  shareToken?: string;
  /** Share link expiration */
  shareExpiresAt?: string;
  /** Permission level for share link */
  sharePermission: 'view' | 'edit';
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;

  // Joined data
  /** Team details */
  team?: Pick<Team, 'id' | 'name' | 'slug'>;
}

/**
 * Input for updating app access
 */
export interface UpdateAppAccessInput {
  visibility?: Visibility;
  teamId?: string | null;
}

/**
 * Share link generation options
 */
export interface ShareLinkOptions {
  /** Permission level */
  permission: 'view' | 'edit';
  /** Expiration in hours (null for permanent) */
  expiresInHours?: number;
}

/**
 * Generated share link
 */
export interface ShareLink {
  /** Full share URL */
  url: string;
  /** Share token */
  token: string;
  /** Permission level */
  permission: 'view' | 'edit';
  /** Expiration timestamp */
  expiresAt?: string;
}

// ============================================================================
// APP COLLABORATOR TYPES
// ============================================================================

/**
 * Individual app collaborator
 */
export interface AppCollaborator {
  /** Collaborator record ID */
  id: string;
  /** App ID */
  appId: string;
  /** User ID */
  userId: string;
  /** Permission level */
  permission: Permission;
  /** Who added this collaborator */
  addedBy?: string;
  /** When they were added */
  createdAt: string;

  // Joined data
  /** User details */
  user?: UserInfo;
  /** Adder details */
  addedByUser?: UserInfo;
}

/**
 * Input for adding a collaborator
 */
export interface AddCollaboratorInput {
  /** Email of user to add */
  email: string;
  /** Permission level */
  permission: Exclude<Permission, 'owner'>;
}

// ============================================================================
// CHAT MESSAGE TYPES
// ============================================================================

/**
 * Chat message reaction
 */
export interface ChatReaction {
  /** Emoji used */
  emoji: string;
  /** User IDs who reacted */
  userIds: string[];
}

/**
 * Chat message attachment
 */
export interface ChatAttachment {
  /** Attachment type */
  type: 'image' | 'file' | 'code' | 'link';
  /** Display name */
  name: string;
  /** URL or content */
  url?: string;
  /** Content (for code snippets) */
  content?: string;
  /** MIME type */
  mimeType?: string;
  /** File size in bytes */
  size?: number;
}

/**
 * AI metadata for AI-generated messages
 */
export interface AIMessageMetadata {
  /** AI model used */
  model?: string;
  /** Token count */
  tokens?: number;
  /** Generation prompt or context */
  context?: string;
  /** Summary type for summaries */
  summaryType?: 'brief' | 'detailed' | 'action_items';
  /** Messages summarized (for summaries) */
  messageRange?: {
    start: string;
    end: string;
    count: number;
  };
}

/**
 * Complete chat message data
 */
export interface TeamChatMessage {
  /** Message ID */
  id: string;
  /** Team ID (for team-wide chat) */
  teamId?: string;
  /** App ID (for app-specific chat) */
  appId?: string;
  /** Sender user ID */
  userId: string;
  /** Message content */
  content: string;
  /** Message type */
  messageType: ChatMessageType;
  /** Mentioned user IDs */
  mentions: string[];
  /** Reply to message ID */
  replyTo?: string;
  /** Whether AI generated */
  aiGenerated: boolean;
  /** AI metadata */
  aiMetadata?: AIMessageMetadata;
  /** Reactions */
  reactions: ChatReaction[];
  /** Attachments */
  attachments: ChatAttachment[];
  /** Edit timestamp */
  editedAt?: string;
  /** Soft delete timestamp */
  deletedAt?: string;
  /** Creation timestamp */
  createdAt: string;

  // Joined data
  /** Sender details */
  user?: UserInfo;
  /** Reply-to message (partial) */
  replyToMessage?: Pick<TeamChatMessage, 'id' | 'content' | 'userId' | 'user'>;
}

/**
 * Input for sending a chat message
 */
export interface SendMessageInput {
  /** Message content */
  content: string;
  /** Team ID (if team chat) */
  teamId?: string;
  /** App ID (if app chat) */
  appId?: string;
  /** Message being replied to */
  replyTo?: string;
  /** User IDs being mentioned */
  mentions?: string[];
  /** Attachments */
  attachments?: ChatAttachment[];
}

/**
 * Options for fetching chat messages
 */
export interface GetMessagesOptions {
  /** Team ID (for team chat) */
  teamId?: string;
  /** App ID (for app chat) */
  appId?: string;
  /** Fetch messages before this timestamp */
  before?: string;
  /** Fetch messages after this timestamp */
  after?: string;
  /** Maximum messages to return */
  limit?: number;
  /** Include soft-deleted messages */
  includeDeleted?: boolean;
}

/**
 * AI summary generation options
 */
export interface SummaryOptions {
  /** Specific message IDs to summarize */
  messageIds?: string[];
  /** Time range to summarize */
  timeRange?: {
    start: string;
    end: string;
  };
  /** Summary format */
  format: 'summary' | 'meeting_notes' | 'action_items';
  /** Include AI response in chat */
  postToChat?: boolean;
}

/**
 * Generated meeting notes
 */
export interface MeetingNotes {
  /** Notes title */
  title: string;
  /** Date of discussion */
  date: string;
  /** Participants */
  participants: UserInfo[];
  /** Key discussion points */
  summary: string[];
  /** Decisions made */
  decisions: string[];
  /** Action items */
  actionItems: Array<{
    description: string;
    assignee?: string;
    dueDate?: string;
  }>;
  /** Raw content */
  rawContent: string;
}

// ============================================================================
// TASK TYPES
// ============================================================================

/**
 * Complete task data
 */
export interface Task {
  /** Task ID */
  id: string;
  /** Team ID (if team task) */
  teamId?: string;
  /** App ID (if app task) */
  appId?: string;
  /** Task title */
  title: string;
  /** Task description */
  description?: string;
  /** Task type */
  taskType: TaskType;
  /** Current status */
  status: TaskStatus;
  /** Priority level */
  priority: TaskPriority;
  /** Creator user ID */
  createdBy: string;
  /** Assigned user ID */
  assignedTo?: string;
  /** Due date */
  dueDate?: string;
  /** When work started */
  startedAt?: string;
  /** When completed */
  completedAt?: string;
  /** Linked phase ID */
  linkedPhaseId?: string;
  /** Linked feature name */
  linkedFeatureName?: string;
  /** Linked file paths */
  linkedFilePaths: string[];
  /** Labels/tags */
  labels: string[];
  /** Estimated hours */
  estimatedHours?: number;
  /** Actual hours spent */
  actualHours?: number;
  /** Position for ordering */
  position: number;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;

  // Joined data
  /** Creator details */
  creator?: UserInfo;
  /** Assignee details */
  assignee?: UserInfo;
  /** Comment count */
  commentCount?: number;
}

/**
 * Input for creating a task
 */
export interface CreateTaskInput {
  /** Team ID (if team task) */
  teamId?: string;
  /** App ID (if app task) */
  appId?: string;
  /** Task title */
  title: string;
  /** Task description */
  description?: string;
  /** Task type */
  taskType?: TaskType;
  /** Priority level */
  priority?: TaskPriority;
  /** Assigned user ID */
  assignedTo?: string;
  /** Due date */
  dueDate?: string;
  /** Linked phase ID */
  linkedPhaseId?: string;
  /** Linked feature name */
  linkedFeatureName?: string;
  /** Labels/tags */
  labels?: string[];
  /** Estimated hours */
  estimatedHours?: number;
}

/**
 * Input for updating a task
 */
export interface UpdateTaskInput {
  title?: string;
  description?: string;
  taskType?: TaskType;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: string | null;
  dueDate?: string | null;
  linkedPhaseId?: string | null;
  linkedFeatureName?: string | null;
  linkedFilePaths?: string[];
  labels?: string[];
  estimatedHours?: number | null;
  actualHours?: number | null;
  position?: number;
}

/**
 * Task filter options
 */
export interface TaskFilters {
  /** Filter by team */
  teamId?: string;
  /** Filter by app */
  appId?: string;
  /** Filter by status(es) */
  status?: TaskStatus | TaskStatus[];
  /** Filter by priority */
  priority?: TaskPriority | TaskPriority[];
  /** Filter by assignee */
  assignedTo?: string | null;
  /** Filter by creator */
  createdBy?: string;
  /** Filter by type */
  taskType?: TaskType | TaskType[];
  /** Filter by labels */
  labels?: string[];
  /** Filter by due date range */
  dueBefore?: string;
  dueAfter?: string;
  /** Search in title/description */
  search?: string;
}

// ============================================================================
// TASK COMMENT TYPES
// ============================================================================

/**
 * Task comment data
 */
export interface TaskComment {
  /** Comment ID */
  id: string;
  /** Task ID */
  taskId: string;
  /** Author user ID */
  userId: string;
  /** Comment content */
  content: string;
  /** Mentioned user IDs */
  mentions: string[];
  /** Creation timestamp */
  createdAt: string;
  /** Edit timestamp */
  editedAt?: string;

  // Joined data
  /** Author details */
  user?: UserInfo;
}

/**
 * Input for adding a comment
 */
export interface AddCommentInput {
  content: string;
  mentions?: string[];
}

// ============================================================================
// ACTIVITY LOG TYPES
// ============================================================================

/**
 * Code diff data for code changes
 */
export interface DiffData {
  /** Code before change */
  before: string;
  /** Code after change */
  after: string;
  /** File path */
  filePath?: string;
  /** Language for syntax highlighting */
  language?: string;
}

/**
 * Activity log entry
 */
export interface ActivityLog {
  /** Activity ID */
  id: string;
  /** Team ID */
  teamId?: string;
  /** App ID */
  appId?: string;
  /** Actor user ID */
  userId?: string;
  /** Action type (e.g., 'created', 'updated', 'deleted') */
  actionType: string;
  /** Action category */
  actionCategory: ActivityCategory;
  /** Target type (e.g., 'file', 'task', 'member') */
  targetType?: string;
  /** Target ID */
  targetId?: string;
  /** Target display name */
  targetName?: string;
  /** Human-readable summary */
  summary: string;
  /** Structured change details */
  details: Record<string, unknown>;
  /** Code diff (for code changes) */
  diffData?: DiffData;
  /** Additional metadata */
  metadata: Record<string, unknown>;
  /** Timestamp */
  createdAt: string;

  // Joined data
  /** Actor details */
  user?: UserInfo;
}

/**
 * Input for logging activity
 */
export interface LogActivityInput {
  teamId?: string;
  appId?: string;
  actionType: string;
  actionCategory: ActivityCategory;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  summary: string;
  details?: Record<string, unknown>;
  diffData?: DiffData;
  metadata?: Record<string, unknown>;
}

/**
 * Activity filter options
 */
export interface ActivityFilters {
  /** Filter by team */
  teamId?: string;
  /** Filter by app */
  appId?: string;
  /** Filter by user */
  userId?: string;
  /** Filter by category */
  category?: ActivityCategory | ActivityCategory[];
  /** Filter by action type */
  actionType?: string | string[];
  /** Filter by date range */
  after?: string;
  before?: string;
}

/**
 * Activity feed options
 */
export interface ActivityFeedOptions extends ActivityFilters {
  /** Maximum items to return */
  limit?: number;
  /** Cursor for pagination */
  cursor?: string;
}

// ============================================================================
// PRESENCE TYPES
// ============================================================================

/**
 * User presence information
 */
export interface PresenceUser {
  /** User ID */
  id: string;
  /** User email */
  email: string;
  /** User display name */
  fullName?: string;
  /** User avatar URL */
  avatarUrl?: string;
  /** Current status */
  status: PresenceStatus;
  /** Current activity description */
  activity?: string;
  /** Last seen timestamp */
  lastSeen: string;
  /** Current location (team/app) */
  location?: {
    type: 'team' | 'app';
    id: string;
    name: string;
  };
}

/**
 * Presence state for a channel
 */
export interface PresenceState {
  /** Channel identifier */
  channelId: string;
  /** Online users */
  users: PresenceUser[];
  /** Last sync timestamp */
  syncedAt: string;
}

// ============================================================================
// SERVICE RESULT TYPES
// ============================================================================

/**
 * Standard service result type
 */
export type ServiceResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: ServiceError };

/**
 * Service error structure
 */
export interface ServiceError {
  /** Error code */
  code: string;
  /** Human-readable message */
  message: string;
  /** Additional details */
  details?: Record<string, unknown>;
}

/**
 * Paginated result set
 */
export interface PaginatedResult<T> {
  /** Items in this page */
  items: T[];
  /** Total count */
  total: number;
  /** Whether there are more items */
  hasMore: boolean;
  /** Cursor for next page */
  nextCursor?: string;
}

// ============================================================================
// PERMISSION CHECK TYPES
// ============================================================================

/**
 * Permission check result
 */
export interface PermissionCheck {
  /** Whether user has access */
  hasAccess: boolean;
  /** User's permission level */
  permission: Permission | null;
  /** Reason for denial (if no access) */
  reason?: string;
}

/**
 * Team action types for permission checking
 */
export type TeamAction =
  | 'view'
  | 'edit'
  | 'invite'
  | 'manage_members'
  | 'manage_settings'
  | 'delete';

/**
 * App action types for permission checking
 */
export type AppAction =
  | 'view'
  | 'edit'
  | 'manage_access'
  | 'delete'
  | 'create_task'
  | 'send_chat';

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if a result is successful
 */
export function isSuccess<T>(result: ServiceResult<T>): result is { success: true; data: T } {
  return result.success === true;
}

/**
 * Check if a result is an error
 */
export function isError<T>(
  result: ServiceResult<T>
): result is { success: false; error: ServiceError } {
  return result.success === false;
}

/**
 * Check if a user has at least the specified role
 */
export function hasMinimumRole(userRole: TeamRole, requiredRole: TeamRole): boolean {
  const roleHierarchy: Record<TeamRole, number> = {
    owner: 4,
    admin: 3,
    editor: 2,
    viewer: 1,
  };
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Check if a user has at least the specified permission
 */
export function hasMinimumPermission(
  userPermission: Permission,
  requiredPermission: Permission
): boolean {
  const permissionHierarchy: Record<Permission, number> = {
    owner: 4,
    admin: 3,
    edit: 2,
    view: 1,
  };
  return permissionHierarchy[userPermission] >= permissionHierarchy[requiredPermission];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a service error
 */
export function createServiceError(
  code: string,
  message: string,
  details?: Record<string, unknown>
): ServiceError {
  return { code, message, details };
}

/**
 * Get display name for a user
 */
export function getUserDisplayName(user: UserInfo): string {
  return user.fullName || user.email.split('@')[0];
}

/**
 * Get initials for a user (for avatars)
 */
export function getUserInitials(user: UserInfo): string {
  if (user.fullName) {
    const parts = user.fullName.split(' ');
    return parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : parts[0].substring(0, 2).toUpperCase();
  }
  return user.email.substring(0, 2).toUpperCase();
}

/**
 * Format relative time for activity
 */
export function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Get task status color class
 */
export function getTaskStatusColor(status: TaskStatus): string {
  const colors: Record<TaskStatus, string> = {
    todo: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    review: 'bg-yellow-100 text-yellow-800',
    done: 'bg-green-100 text-green-800',
    blocked: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-500',
  };
  return colors[status];
}

/**
 * Get task priority color class
 */
export function getTaskPriorityColor(priority: TaskPriority): string {
  const colors: Record<TaskPriority, string> = {
    low: 'bg-gray-100 text-gray-600',
    medium: 'bg-blue-100 text-blue-600',
    high: 'bg-orange-100 text-orange-600',
    urgent: 'bg-red-100 text-red-600',
  };
  return colors[priority];
}
