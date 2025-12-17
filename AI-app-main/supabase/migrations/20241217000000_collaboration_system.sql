-- Migration: Create collaboration system tables
-- Purpose: Enable team workspaces, real-time chat, task assignment, and activity logging

-- ============================================================================
-- 1. TEAMS TABLE - Team/Workspace Management
-- ============================================================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  avatar_url TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{
    "allowMemberInvites": false,
    "defaultMemberRole": "viewer",
    "requireApprovalForJoin": true
  }'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_teams_slug ON teams(slug);

-- ============================================================================
-- 2. TEAM_MEMBERS TABLE - Team Membership
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'removed')),

  UNIQUE(team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);

-- ============================================================================
-- 3. TEAM_INVITES TABLE - Invitation Links
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE NOT NULL,
  email TEXT, -- NULL for link-based invites
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_invites_code ON team_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_team_invites_email ON team_invites(email);
CREATE INDEX IF NOT EXISTS idx_team_invites_team ON team_invites(team_id);

-- ============================================================================
-- 4. APP_ACCESS TABLE - Per-App Access Control
-- ============================================================================
CREATE TABLE IF NOT EXISTS app_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL,

  -- Visibility settings
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'logged_in', 'team', 'invite_only', 'private')),

  -- Team association (optional)
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,

  -- Share links
  share_token TEXT UNIQUE,
  share_expires_at TIMESTAMPTZ,
  share_permission TEXT DEFAULT 'view' CHECK (share_permission IN ('view', 'edit')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(app_id)
);

CREATE INDEX IF NOT EXISTS idx_app_access_app ON app_access(app_id);
CREATE INDEX IF NOT EXISTS idx_app_access_team ON app_access(team_id);
CREATE INDEX IF NOT EXISTS idx_app_access_share ON app_access(share_token);
CREATE INDEX IF NOT EXISTS idx_app_access_visibility ON app_access(visibility);

-- ============================================================================
-- 5. APP_COLLABORATORS TABLE - Individual App Collaborators
-- ============================================================================
CREATE TABLE IF NOT EXISTS app_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit', 'admin')),
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(app_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_app_collaborators_app ON app_collaborators(app_id);
CREATE INDEX IF NOT EXISTS idx_app_collaborators_user ON app_collaborators(user_id);

-- ============================================================================
-- 6. TEAM_CHAT_MESSAGES TABLE - Real-time Chat
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Can be team-wide or app-specific
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  app_id UUID,

  -- Message details
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'ai_summary', 'meeting_notes', 'ai_response')),

  -- Mentions
  mentions UUID[] DEFAULT '{}', -- Array of mentioned user IDs

  -- Replies
  reply_to UUID REFERENCES team_chat_messages(id) ON DELETE SET NULL,

  -- AI-generated content
  ai_generated BOOLEAN DEFAULT FALSE,
  ai_metadata JSONB,

  -- Reactions (stored as JSONB for flexibility)
  reactions JSONB DEFAULT '[]'::JSONB,

  -- Attachments
  attachments JSONB DEFAULT '[]'::JSONB,

  -- Editing
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- At least one of team_id or app_id must be set
  CHECK (team_id IS NOT NULL OR app_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_chat_team ON team_chat_messages(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_app ON team_chat_messages(app_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_user ON team_chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_mentions ON team_chat_messages USING GIN(mentions);
CREATE INDEX IF NOT EXISTS idx_chat_type ON team_chat_messages(message_type);

-- ============================================================================
-- 7. TASKS TABLE - Task Assignment System
-- ============================================================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Association (team-wide or app-specific)
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  app_id UUID,

  -- Task details
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT DEFAULT 'feature' CHECK (task_type IN ('feature', 'bug', 'research', 'documentation', 'review', 'other')),

  -- Status
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'blocked', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Assignment
  created_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),

  -- Dates
  due_date TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Links to app elements
  linked_phase_id TEXT, -- Links to DynamicPhase.id
  linked_feature_name TEXT,
  linked_file_paths TEXT[] DEFAULT '{}',

  -- Additional metadata
  labels TEXT[] DEFAULT '{}',
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),

  -- Order for Kanban board
  position INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- At least one of team_id or app_id must be set
  CHECK (team_id IS NOT NULL OR app_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_tasks_team ON tasks(team_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_app ON tasks(app_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date) WHERE status NOT IN ('done', 'cancelled');
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

-- ============================================================================
-- 8. TASK_COMMENTS TABLE - Task Discussion
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,

  -- Mentions in comment
  mentions UUID[] DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id, created_at);
CREATE INDEX IF NOT EXISTS idx_task_comments_user ON task_comments(user_id);

-- ============================================================================
-- 9. ACTIVITY_LOG TABLE - Activity Changelog
-- ============================================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Association
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  app_id UUID,

  -- Actor
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Action details
  action_type TEXT NOT NULL,
  action_category TEXT NOT NULL CHECK (action_category IN (
    'app', 'code', 'phase', 'task', 'team', 'access', 'chat', 'documentation'
  )),

  -- Change details
  target_type TEXT, -- 'file', 'phase', 'task', 'member', etc.
  target_id TEXT,
  target_name TEXT,

  -- Change data
  summary TEXT NOT NULL, -- Human-readable summary
  details JSONB DEFAULT '{}', -- Structured change data
  diff_data JSONB, -- For code changes, stores before/after

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_team ON activity_log(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_app ON activity_log(app_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_log(action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_category ON activity_log(action_category, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------------
-- TEAMS RLS
-- --------------------------------------------------------------------------
CREATE POLICY "Team members can view their teams" ON teams
  FOR SELECT USING (
    id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Users can create teams" ON teams
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Team owners can update their teams" ON teams
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Team owners can delete their teams" ON teams
  FOR DELETE USING (owner_id = auth.uid());

-- --------------------------------------------------------------------------
-- TEAM_MEMBERS RLS
-- --------------------------------------------------------------------------
CREATE POLICY "Team members can view membership" ON team_members
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Team admins can add members" ON team_members
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
    )
  );

CREATE POLICY "Team admins can update members" ON team_members
  FOR UPDATE USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
    )
  );

CREATE POLICY "Team admins can remove members" ON team_members
  FOR DELETE USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
    )
    OR user_id = auth.uid() -- Users can leave teams
  );

-- --------------------------------------------------------------------------
-- TEAM_INVITES RLS
-- --------------------------------------------------------------------------
CREATE POLICY "Team members can view invites" ON team_invites
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Team admins can create invites" ON team_invites
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
    )
    OR team_id IN (
      SELECT tm.team_id FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.user_id = auth.uid() AND tm.status = 'active'
      AND (t.settings->>'allowMemberInvites')::boolean = true
    )
  );

CREATE POLICY "Team admins can delete invites" ON team_invites
  FOR DELETE USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
    )
  );

-- Allow anyone to lookup invites by code (for accepting)
CREATE POLICY "Anyone can lookup invite by code" ON team_invites
  FOR SELECT USING (TRUE);

-- --------------------------------------------------------------------------
-- APP_ACCESS RLS
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view app access for apps they own" ON app_access
  FOR SELECT USING (
    app_id IN (SELECT id FROM generated_apps WHERE user_id = auth.uid())
    OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "App owners can manage access" ON app_access
  FOR ALL USING (
    app_id IN (SELECT id FROM generated_apps WHERE user_id = auth.uid())
  );

CREATE POLICY "Team admins can manage team app access" ON app_access
  FOR ALL USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
    )
  );

-- --------------------------------------------------------------------------
-- APP_COLLABORATORS RLS
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view collaborators for apps they have access to" ON app_collaborators
  FOR SELECT USING (
    app_id IN (SELECT id FROM generated_apps WHERE user_id = auth.uid())
    OR user_id = auth.uid()
    OR app_id IN (
      SELECT aa.app_id FROM app_access aa
      JOIN team_members tm ON aa.team_id = tm.team_id
      WHERE tm.user_id = auth.uid() AND tm.status = 'active'
    )
  );

CREATE POLICY "App owners can manage collaborators" ON app_collaborators
  FOR ALL USING (
    app_id IN (SELECT id FROM generated_apps WHERE user_id = auth.uid())
  );

-- --------------------------------------------------------------------------
-- TEAM_CHAT_MESSAGES RLS
-- --------------------------------------------------------------------------
CREATE POLICY "Team members can view chat" ON team_chat_messages
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
    OR app_id IN (
      SELECT app_id FROM app_collaborators WHERE user_id = auth.uid()
      UNION
      SELECT id FROM generated_apps WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can send messages" ON team_chat_messages
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND (
      team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
      OR app_id IN (
        SELECT app_id FROM app_collaborators WHERE user_id = auth.uid() AND permission IN ('edit', 'admin')
        UNION
        SELECT id FROM generated_apps WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update own messages" ON team_chat_messages
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own messages" ON team_chat_messages
  FOR DELETE USING (user_id = auth.uid());

-- --------------------------------------------------------------------------
-- TASKS RLS
-- --------------------------------------------------------------------------
CREATE POLICY "Team members can view tasks" ON tasks
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
    OR app_id IN (
      SELECT app_id FROM app_collaborators WHERE user_id = auth.uid()
      UNION
      SELECT id FROM generated_apps WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can create tasks" ON tasks
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND (
      team_id IN (
        SELECT team_id FROM team_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor') AND status = 'active'
      )
      OR app_id IN (
        SELECT app_id FROM app_collaborators WHERE user_id = auth.uid() AND permission IN ('edit', 'admin')
        UNION
        SELECT id FROM generated_apps WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Editors can update tasks" ON tasks
  FOR UPDATE USING (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor') AND status = 'active'
    )
    OR app_id IN (
      SELECT app_id FROM app_collaborators WHERE user_id = auth.uid() AND permission IN ('edit', 'admin')
      UNION
      SELECT id FROM generated_apps WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Task creators and admins can delete tasks" ON tasks
  FOR DELETE USING (
    created_by = auth.uid()
    OR team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
    )
    OR app_id IN (SELECT id FROM generated_apps WHERE user_id = auth.uid())
  );

-- --------------------------------------------------------------------------
-- TASK_COMMENTS RLS
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view comments on tasks they can see" ON task_comments
  FOR SELECT USING (
    task_id IN (SELECT id FROM tasks) -- Relies on tasks RLS
  );

CREATE POLICY "Users can add comments to accessible tasks" ON task_comments
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND task_id IN (SELECT id FROM tasks)
  );

CREATE POLICY "Users can update own comments" ON task_comments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own comments" ON task_comments
  FOR DELETE USING (user_id = auth.uid());

-- --------------------------------------------------------------------------
-- ACTIVITY_LOG RLS
-- --------------------------------------------------------------------------
CREATE POLICY "Team members can view activity" ON activity_log
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
    OR app_id IN (
      SELECT app_id FROM app_collaborators WHERE user_id = auth.uid()
      UNION
      SELECT id FROM generated_apps WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert activity" ON activity_log
  FOR INSERT WITH CHECK (TRUE); -- Allow all inserts (typically done server-side)

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check user's permission on an app
CREATE OR REPLACE FUNCTION get_app_permission(target_app_id UUID, target_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  app_owner_id UUID;
  collaborator_permission TEXT;
  team_role TEXT;
  app_visibility TEXT;
BEGIN
  -- Get app owner
  SELECT user_id INTO app_owner_id FROM generated_apps WHERE id = target_app_id;

  -- Owner has full access
  IF app_owner_id = target_user_id THEN
    RETURN 'owner';
  END IF;

  -- Check direct collaborator
  SELECT permission INTO collaborator_permission
  FROM app_collaborators
  WHERE app_id = target_app_id AND user_id = target_user_id;

  IF collaborator_permission IS NOT NULL THEN
    RETURN collaborator_permission;
  END IF;

  -- Check team membership
  SELECT tm.role INTO team_role
  FROM app_access aa
  JOIN team_members tm ON aa.team_id = tm.team_id
  WHERE aa.app_id = target_app_id
    AND tm.user_id = target_user_id
    AND tm.status = 'active';

  IF team_role IS NOT NULL THEN
    CASE team_role
      WHEN 'owner' THEN RETURN 'admin';
      WHEN 'admin' THEN RETURN 'admin';
      WHEN 'editor' THEN RETURN 'edit';
      WHEN 'viewer' THEN RETURN 'view';
    END CASE;
  END IF;

  -- Check public access
  SELECT visibility INTO app_visibility FROM app_access WHERE app_id = target_app_id;

  IF app_visibility = 'public' THEN
    RETURN 'view';
  ELSIF app_visibility = 'logged_in' AND target_user_id IS NOT NULL THEN
    RETURN 'view';
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate unique slug for team
CREATE OR REPLACE FUNCTION generate_team_slug(team_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Convert to lowercase and replace spaces/special chars with dashes
  base_slug := lower(regexp_replace(team_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);

  -- Ensure slug is not empty
  IF base_slug = '' THEN
    base_slug := 'team';
  END IF;

  final_slug := base_slug;

  -- Check for uniqueness and append number if needed
  WHILE EXISTS (SELECT 1 FROM teams WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..12 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at for teams
CREATE OR REPLACE FUNCTION update_teams_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS teams_updated ON teams;
CREATE TRIGGER teams_updated
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_teams_timestamp();

-- Auto-update updated_at for app_access
DROP TRIGGER IF EXISTS app_access_updated ON app_access;
CREATE TRIGGER app_access_updated
  BEFORE UPDATE ON app_access
  FOR EACH ROW EXECUTE FUNCTION update_teams_timestamp();

-- Auto-update updated_at for tasks
DROP TRIGGER IF EXISTS tasks_updated ON tasks;
CREATE TRIGGER tasks_updated
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_teams_timestamp();

-- Auto-add owner as team member when team is created
CREATE OR REPLACE FUNCTION add_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO team_members (team_id, user_id, role, status, joined_at)
  VALUES (NEW.id, NEW.owner_id, 'owner', 'active', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS team_owner_membership ON teams;
CREATE TRIGGER team_owner_membership
  AFTER INSERT ON teams
  FOR EACH ROW EXECUTE FUNCTION add_owner_as_member();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE teams IS 'Team/workspace management for collaboration';
COMMENT ON TABLE team_members IS 'Team membership with roles (owner, admin, editor, viewer)';
COMMENT ON TABLE team_invites IS 'Invitation links for joining teams';
COMMENT ON TABLE app_access IS 'Per-app access control and visibility settings';
COMMENT ON TABLE app_collaborators IS 'Individual collaborators invited to specific apps';
COMMENT ON TABLE team_chat_messages IS 'Real-time chat messages for team and app discussions';
COMMENT ON TABLE tasks IS 'Task assignment system linked to teams/apps and features';
COMMENT ON TABLE task_comments IS 'Comments and discussion on tasks';
COMMENT ON TABLE activity_log IS 'Activity changelog tracking all changes';
