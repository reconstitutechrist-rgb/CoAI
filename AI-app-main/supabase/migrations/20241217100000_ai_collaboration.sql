-- ============================================================================
-- AI COLLABORATION SYSTEM
-- Migration: 20241217100000_ai_collaboration.sql
--
-- Features:
-- 1. Collaborative AI Prompting - Prompt attribution, shared templates
-- 2. AI Decision Voting - Team votes on AI suggestions
-- 3. Shared AI Context - Team-wide persistent context
-- 4. AI Handoffs - Transfer conversations between team members
-- 5. Collaborative Phase Planning - Team designs phases together
-- 6. Feature Ownership - Assign team members to features
-- 7. AI Review Workflow - Review gates before applying changes
-- ============================================================================

-- ============================================================================
-- 1. AI PROMPT ATTRIBUTION
-- Track who contributed which prompts to the AI conversation
-- ============================================================================

CREATE TABLE ai_prompt_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES generated_apps(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Prompt content
  prompt_text TEXT NOT NULL,
  prompt_type TEXT NOT NULL DEFAULT 'message' CHECK (prompt_type IN ('message', 'instruction', 'correction', 'clarification', 'template')),

  -- Context
  mode TEXT NOT NULL CHECK (mode IN ('plan', 'act', 'layout')),
  phase_number INTEGER,

  -- AI Response tracking
  ai_response_id UUID, -- Links to the AI response this triggered
  ai_response_summary TEXT,
  tokens_used INTEGER,

  -- Impact tracking
  resulted_in_code_change BOOLEAN DEFAULT FALSE,
  files_affected TEXT[],
  features_affected TEXT[],

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes for querying
  CONSTRAINT valid_prompt_text CHECK (char_length(prompt_text) > 0)
);

CREATE INDEX idx_prompt_contributions_app ON ai_prompt_contributions(app_id);
CREATE INDEX idx_prompt_contributions_user ON ai_prompt_contributions(user_id);
CREATE INDEX idx_prompt_contributions_team ON ai_prompt_contributions(team_id);
CREATE INDEX idx_prompt_contributions_created ON ai_prompt_contributions(created_at DESC);

-- ============================================================================
-- 2. SHARED PROMPT TEMPLATES
-- Reusable prompt templates shared across the team
-- ============================================================================

CREATE TABLE shared_prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Template content
  name TEXT NOT NULL,
  description TEXT,
  template_text TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'feature', 'bugfix', 'design', 'refactor', 'documentation')),

  -- Variables (placeholders in template)
  variables JSONB DEFAULT '[]'::JSONB, -- [{name: "featureName", description: "...", required: true}]

  -- Usage tracking
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  last_used_by UUID REFERENCES auth.users(id),

  -- Visibility
  is_public BOOLEAN DEFAULT FALSE, -- Public templates visible to all teams

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prompt_templates_team ON shared_prompt_templates(team_id);
CREATE INDEX idx_prompt_templates_category ON shared_prompt_templates(category);

-- ============================================================================
-- 3. AI DECISION VOTING
-- Team votes on AI suggestions before applying
-- ============================================================================

CREATE TABLE ai_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES generated_apps(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Decision content
  title TEXT NOT NULL,
  description TEXT,
  decision_type TEXT NOT NULL CHECK (decision_type IN ('feature', 'design', 'architecture', 'code_change', 'phase_plan', 'other')),

  -- AI suggestion details
  ai_suggestion TEXT NOT NULL,
  ai_reasoning TEXT,
  ai_alternatives JSONB DEFAULT '[]'::JSONB, -- Alternative suggestions from AI

  -- Context
  mode TEXT NOT NULL CHECK (mode IN ('plan', 'act', 'layout')),
  phase_number INTEGER,
  related_features TEXT[],

  -- Code preview (if applicable)
  code_preview TEXT,
  files_affected TEXT[],

  -- Voting configuration
  voting_type TEXT DEFAULT 'majority' CHECK (voting_type IN ('majority', 'unanimous', 'threshold')),
  voting_threshold INTEGER DEFAULT 50, -- Percentage needed for threshold voting
  required_voters UUID[], -- Specific users who must vote
  voting_deadline TIMESTAMPTZ,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'withdrawn')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),

  -- Result
  final_decision TEXT, -- 'original', 'alternative_1', 'alternative_2', 'rejected'
  applied_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_decisions_app ON ai_decisions(app_id);
CREATE INDEX idx_ai_decisions_team ON ai_decisions(team_id);
CREATE INDEX idx_ai_decisions_status ON ai_decisions(status);
CREATE INDEX idx_ai_decisions_deadline ON ai_decisions(voting_deadline) WHERE status = 'pending';

-- Votes on AI decisions
CREATE TABLE ai_decision_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES ai_decisions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Vote
  vote TEXT NOT NULL CHECK (vote IN ('approve', 'reject', 'abstain', 'request_changes')),
  selected_alternative INTEGER, -- If voting for an alternative (0 = original, 1+ = alternative index)

  -- Feedback
  comment TEXT,
  requested_changes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(decision_id, user_id)
);

CREATE INDEX idx_decision_votes_decision ON ai_decision_votes(decision_id);
CREATE INDEX idx_decision_votes_user ON ai_decision_votes(user_id);

-- ============================================================================
-- 4. SHARED AI CONTEXT
-- Team-wide persistent context that AI remembers
-- ============================================================================

CREATE TABLE shared_ai_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  app_id UUID REFERENCES generated_apps(id) ON DELETE CASCADE, -- NULL = team-wide

  -- Context type
  context_type TEXT NOT NULL CHECK (context_type IN (
    'coding_standards',      -- Team coding conventions
    'design_guidelines',     -- UI/UX standards
    'business_rules',        -- Domain-specific rules
    'terminology',           -- Project-specific terms
    'constraints',           -- Technical constraints
    'preferences',           -- AI behavior preferences
    'learned_patterns',      -- Patterns AI has learned from corrections
    'custom'
  )),

  -- Content
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority INTEGER DEFAULT 0, -- Higher = more important, included first

  -- Auto-learned context (from corrections)
  is_auto_learned BOOLEAN DEFAULT FALSE,
  learned_from_contribution_id UUID REFERENCES ai_prompt_contributions(id),

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shared_context_team ON shared_ai_context(team_id);
CREATE INDEX idx_shared_context_app ON shared_ai_context(app_id);
CREATE INDEX idx_shared_context_type ON shared_ai_context(context_type);
CREATE INDEX idx_shared_context_active ON shared_ai_context(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- 5. AI CONVERSATION HANDOFFS
-- Transfer active AI conversations between team members
-- ============================================================================

CREATE TABLE ai_conversation_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES generated_apps(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,

  -- Handoff participants
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Conversation state at handoff
  conversation_snapshot JSONB NOT NULL, -- Full conversation history
  mode TEXT NOT NULL CHECK (mode IN ('plan', 'act', 'layout')),
  wizard_state JSONB, -- Wizard state if in PLAN mode
  current_phase INTEGER,

  -- Handoff context
  handoff_reason TEXT,
  handoff_notes TEXT, -- Notes from sender to receiver
  focus_areas TEXT[], -- What the receiver should focus on

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  accepted_at TIMESTAMPTZ,
  declined_reason TEXT,

  -- Expiry
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_handoffs_app ON ai_conversation_handoffs(app_id);
CREATE INDEX idx_handoffs_from ON ai_conversation_handoffs(from_user_id);
CREATE INDEX idx_handoffs_to ON ai_conversation_handoffs(to_user_id);
CREATE INDEX idx_handoffs_status ON ai_conversation_handoffs(status) WHERE status = 'pending';

-- ============================================================================
-- 6. COLLABORATIVE PHASE PLANNING
-- Team designs phases together before AI builds
-- ============================================================================

CREATE TABLE phase_planning_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES generated_apps(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Session info
  name TEXT NOT NULL DEFAULT 'Phase Planning Session',
  description TEXT,

  -- Planning state
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'voting', 'approved', 'building')),

  -- Phase plan (editable until approved)
  proposed_phases JSONB NOT NULL DEFAULT '[]'::JSONB, -- Array of phase objects
  ai_generated_plan JSONB, -- Original AI suggestion for comparison

  -- Voting
  requires_approval BOOLEAN DEFAULT TRUE,
  approval_type TEXT DEFAULT 'majority' CHECK (approval_type IN ('majority', 'unanimous', 'owner_only')),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),

  -- Execution
  execution_started_at TIMESTAMPTZ,
  current_phase INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_phase_sessions_app ON phase_planning_sessions(app_id);
CREATE INDEX idx_phase_sessions_team ON phase_planning_sessions(team_id);
CREATE INDEX idx_phase_sessions_status ON phase_planning_sessions(status);

-- Phase suggestions/edits from team members
CREATE TABLE phase_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES phase_planning_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Suggestion type
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN (
    'add_phase',
    'remove_phase',
    'reorder_phases',
    'edit_phase',
    'merge_phases',
    'split_phase',
    'add_feature',
    'remove_feature',
    'move_feature',
    'comment'
  )),

  -- Target
  target_phase_number INTEGER,
  target_feature TEXT,

  -- Suggested change
  suggestion_data JSONB NOT NULL, -- Change details
  reason TEXT,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'superseded')),
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_phase_suggestions_session ON phase_suggestions(session_id);
CREATE INDEX idx_phase_suggestions_user ON phase_suggestions(user_id);
CREATE INDEX idx_phase_suggestions_status ON phase_suggestions(status);

-- Votes on phase planning sessions
CREATE TABLE phase_planning_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES phase_planning_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  vote TEXT NOT NULL CHECK (vote IN ('approve', 'reject', 'request_changes')),
  feedback TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(session_id, user_id)
);

CREATE INDEX idx_phase_votes_session ON phase_planning_votes(session_id);

-- ============================================================================
-- 7. FEATURE OWNERSHIP
-- Assign team members to specific features during build
-- ============================================================================

CREATE TABLE feature_ownership (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES generated_apps(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,

  -- Feature identification
  feature_name TEXT NOT NULL,
  feature_description TEXT,
  phase_number INTEGER,

  -- Ownership
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Responsibilities
  responsibilities TEXT[] DEFAULT ARRAY['review', 'approve'], -- 'review', 'approve', 'test', 'document'

  -- Status tracking
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'review', 'approved', 'completed')),

  -- Review requirements
  requires_owner_approval BOOLEAN DEFAULT TRUE,
  owner_approved_at TIMESTAMPTZ,
  owner_feedback TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(app_id, feature_name)
);

CREATE INDEX idx_feature_ownership_app ON feature_ownership(app_id);
CREATE INDEX idx_feature_ownership_owner ON feature_ownership(owner_id);
CREATE INDEX idx_feature_ownership_status ON feature_ownership(status);

-- ============================================================================
-- 8. AI REVIEW WORKFLOW
-- Review gates before AI changes are applied
-- ============================================================================

CREATE TABLE ai_review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES generated_apps(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Review content
  title TEXT NOT NULL,
  description TEXT,
  review_type TEXT NOT NULL CHECK (review_type IN ('code', 'design', 'feature', 'phase', 'full_build')),

  -- AI output to review
  ai_output JSONB NOT NULL, -- The generated code/design/etc
  ai_prompt TEXT, -- What was asked
  ai_reasoning TEXT, -- AI's explanation

  -- Context
  mode TEXT NOT NULL CHECK (mode IN ('plan', 'act', 'layout')),
  phase_number INTEGER,
  related_features TEXT[],

  -- Code details
  files_to_add JSONB DEFAULT '[]'::JSONB,
  files_to_modify JSONB DEFAULT '[]'::JSONB,
  files_to_delete TEXT[],

  -- Preview
  preview_url TEXT,
  sandbox_id TEXT,

  -- Review assignment
  assigned_reviewers UUID[], -- Specific reviewers
  required_approvals INTEGER DEFAULT 1,

  -- Feature ownership auto-assignment
  auto_assign_feature_owners BOOLEAN DEFAULT TRUE,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'changes_requested', 'approved', 'rejected', 'applied', 'expired')),

  -- Resolution
  resolved_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  applied_by UUID REFERENCES auth.users(id),

  -- Expiry
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_reviews_app ON ai_review_requests(app_id);
CREATE INDEX idx_ai_reviews_team ON ai_review_requests(team_id);
CREATE INDEX idx_ai_reviews_status ON ai_review_requests(status);
CREATE INDEX idx_ai_reviews_created ON ai_review_requests(created_by);

-- Individual reviews/approvals
CREATE TABLE ai_review_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_request_id UUID NOT NULL REFERENCES ai_review_requests(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Review response
  decision TEXT NOT NULL CHECK (decision IN ('approve', 'request_changes', 'reject', 'comment_only')),

  -- Feedback
  overall_feedback TEXT,

  -- Inline comments (for code reviews)
  inline_comments JSONB DEFAULT '[]'::JSONB, -- [{file, line, comment, severity}]

  -- Requested changes
  requested_changes JSONB DEFAULT '[]'::JSONB, -- [{description, priority, resolved}]

  -- AI revision request
  request_ai_revision BOOLEAN DEFAULT FALSE,
  ai_revision_prompt TEXT, -- What to tell AI to fix

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(review_request_id, reviewer_id)
);

CREATE INDEX idx_review_responses_request ON ai_review_responses(review_request_id);
CREATE INDEX idx_review_responses_reviewer ON ai_review_responses(reviewer_id);

-- ============================================================================
-- 9. NOTIFICATION PREFERENCES FOR AI COLLABORATION
-- ============================================================================

CREATE TABLE ai_collaboration_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,

  -- Notification types
  notify_on_decision_created BOOLEAN DEFAULT TRUE,
  notify_on_vote_requested BOOLEAN DEFAULT TRUE,
  notify_on_review_assigned BOOLEAN DEFAULT TRUE,
  notify_on_handoff_received BOOLEAN DEFAULT TRUE,
  notify_on_feature_assigned BOOLEAN DEFAULT TRUE,
  notify_on_phase_suggestion BOOLEAN DEFAULT TRUE,
  notify_on_context_updated BOOLEAN DEFAULT TRUE,

  -- Delivery preferences
  in_app_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT FALSE,
  email_digest_frequency TEXT DEFAULT 'instant' CHECK (email_digest_frequency IN ('instant', 'hourly', 'daily', 'weekly')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, team_id)
);

CREATE INDEX idx_ai_notifications_user ON ai_collaboration_notifications(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE ai_prompt_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_ai_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversation_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_planning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_planning_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_review_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_collaboration_notifications ENABLE ROW LEVEL SECURITY;

-- Prompt Contributions: Team members and app collaborators can view
CREATE POLICY "prompt_contributions_view" ON ai_prompt_contributions
  FOR SELECT USING (
    user_id = auth.uid()
    OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
    OR app_id IN (SELECT app_id FROM app_collaborators WHERE user_id = auth.uid())
    OR app_id IN (SELECT id FROM generated_apps WHERE user_id = auth.uid())
  );

CREATE POLICY "prompt_contributions_insert" ON ai_prompt_contributions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Prompt Templates: Team members can CRUD their team's templates
CREATE POLICY "prompt_templates_view" ON shared_prompt_templates
  FOR SELECT USING (
    is_public = TRUE
    OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "prompt_templates_manage" ON shared_prompt_templates
  FOR ALL USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin', 'editor')
    )
  );

-- AI Decisions: Team members can view, create, and vote
CREATE POLICY "ai_decisions_view" ON ai_decisions
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
    OR app_id IN (SELECT app_id FROM app_collaborators WHERE user_id = auth.uid())
    OR app_id IN (SELECT id FROM generated_apps WHERE user_id = auth.uid())
  );

CREATE POLICY "ai_decisions_create" ON ai_decisions
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND (
      team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
      OR app_id IN (SELECT id FROM generated_apps WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "ai_decisions_update" ON ai_decisions
  FOR UPDATE USING (
    created_by = auth.uid()
    OR team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
    )
  );

-- Decision Votes: Authenticated team members can vote
CREATE POLICY "decision_votes_view" ON ai_decision_votes
  FOR SELECT USING (
    decision_id IN (
      SELECT id FROM ai_decisions WHERE
        team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
        OR app_id IN (SELECT app_id FROM app_collaborators WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "decision_votes_manage" ON ai_decision_votes
  FOR ALL USING (user_id = auth.uid());

-- Shared AI Context: Team members can manage
CREATE POLICY "shared_context_view" ON shared_ai_context
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "shared_context_manage" ON shared_ai_context
  FOR ALL USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin', 'editor')
    )
  );

-- Handoffs: Participants can view and manage
CREATE POLICY "handoffs_view" ON ai_conversation_handoffs
  FOR SELECT USING (
    from_user_id = auth.uid() OR to_user_id = auth.uid()
  );

CREATE POLICY "handoffs_create" ON ai_conversation_handoffs
  FOR INSERT WITH CHECK (from_user_id = auth.uid());

CREATE POLICY "handoffs_update" ON ai_conversation_handoffs
  FOR UPDATE USING (to_user_id = auth.uid() OR from_user_id = auth.uid());

-- Phase Planning Sessions: Team members can participate
CREATE POLICY "phase_sessions_view" ON phase_planning_sessions
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
    OR app_id IN (SELECT id FROM generated_apps WHERE user_id = auth.uid())
  );

CREATE POLICY "phase_sessions_create" ON phase_planning_sessions
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND (
      team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
      OR app_id IN (SELECT id FROM generated_apps WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "phase_sessions_update" ON phase_planning_sessions
  FOR UPDATE USING (
    created_by = auth.uid()
    OR team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
    )
  );

-- Phase Suggestions: Team members can suggest
CREATE POLICY "phase_suggestions_view" ON phase_suggestions
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM phase_planning_sessions WHERE
        team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
        OR app_id IN (SELECT id FROM generated_apps WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "phase_suggestions_manage" ON phase_suggestions
  FOR ALL USING (user_id = auth.uid());

-- Phase Planning Votes
CREATE POLICY "phase_votes_view" ON phase_planning_votes
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM phase_planning_sessions WHERE
        team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
    )
  );

CREATE POLICY "phase_votes_manage" ON phase_planning_votes
  FOR ALL USING (user_id = auth.uid());

-- Feature Ownership: Team members can view, owners/admins can assign
CREATE POLICY "feature_ownership_view" ON feature_ownership
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
    OR app_id IN (SELECT id FROM generated_apps WHERE user_id = auth.uid())
    OR owner_id = auth.uid()
  );

CREATE POLICY "feature_ownership_manage" ON feature_ownership
  FOR ALL USING (
    owner_id = auth.uid()
    OR assigned_by = auth.uid()
    OR team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
    )
  );

-- AI Review Requests: Team members and assigned reviewers
CREATE POLICY "ai_reviews_view" ON ai_review_requests
  FOR SELECT USING (
    created_by = auth.uid()
    OR auth.uid() = ANY(assigned_reviewers)
    OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
    OR app_id IN (SELECT id FROM generated_apps WHERE user_id = auth.uid())
  );

CREATE POLICY "ai_reviews_create" ON ai_review_requests
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "ai_reviews_update" ON ai_review_requests
  FOR UPDATE USING (
    created_by = auth.uid()
    OR auth.uid() = ANY(assigned_reviewers)
    OR team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
    )
  );

-- Review Responses: Reviewers can respond
CREATE POLICY "review_responses_view" ON ai_review_responses
  FOR SELECT USING (
    review_request_id IN (
      SELECT id FROM ai_review_requests WHERE
        created_by = auth.uid()
        OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
    )
  );

CREATE POLICY "review_responses_manage" ON ai_review_responses
  FOR ALL USING (reviewer_id = auth.uid());

-- Notification Preferences: Users manage their own
CREATE POLICY "notifications_manage" ON ai_collaboration_notifications
  FOR ALL USING (user_id = auth.uid());

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if a decision has enough votes to be resolved
CREATE OR REPLACE FUNCTION check_decision_resolution()
RETURNS TRIGGER AS $$
DECLARE
  decision_record ai_decisions%ROWTYPE;
  total_team_members INTEGER;
  approve_count INTEGER;
  reject_count INTEGER;
  threshold_met BOOLEAN;
BEGIN
  SELECT * INTO decision_record FROM ai_decisions WHERE id = NEW.decision_id;

  -- Count team members
  SELECT COUNT(*) INTO total_team_members
  FROM team_members
  WHERE team_id = decision_record.team_id AND status = 'active';

  -- Count votes
  SELECT
    COUNT(*) FILTER (WHERE vote = 'approve'),
    COUNT(*) FILTER (WHERE vote = 'reject')
  INTO approve_count, reject_count
  FROM ai_decision_votes
  WHERE decision_id = NEW.decision_id;

  -- Check if threshold met based on voting type
  CASE decision_record.voting_type
    WHEN 'unanimous' THEN
      IF approve_count = total_team_members THEN
        UPDATE ai_decisions SET status = 'approved', resolved_at = NOW() WHERE id = NEW.decision_id;
      ELSIF reject_count > 0 THEN
        UPDATE ai_decisions SET status = 'rejected', resolved_at = NOW() WHERE id = NEW.decision_id;
      END IF;
    WHEN 'majority' THEN
      IF approve_count > total_team_members / 2 THEN
        UPDATE ai_decisions SET status = 'approved', resolved_at = NOW() WHERE id = NEW.decision_id;
      ELSIF reject_count > total_team_members / 2 THEN
        UPDATE ai_decisions SET status = 'rejected', resolved_at = NOW() WHERE id = NEW.decision_id;
      END IF;
    WHEN 'threshold' THEN
      IF (approve_count::FLOAT / GREATEST(total_team_members, 1)) * 100 >= decision_record.voting_threshold THEN
        UPDATE ai_decisions SET status = 'approved', resolved_at = NOW() WHERE id = NEW.decision_id;
      END IF;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_check_decision_resolution
  AFTER INSERT OR UPDATE ON ai_decision_votes
  FOR EACH ROW
  EXECUTE FUNCTION check_decision_resolution();

-- Function to auto-assign feature owners as reviewers
CREATE OR REPLACE FUNCTION auto_assign_feature_reviewers()
RETURNS TRIGGER AS $$
DECLARE
  feature TEXT;
  owner_ids UUID[];
BEGIN
  IF NEW.auto_assign_feature_owners AND NEW.related_features IS NOT NULL THEN
    SELECT ARRAY_AGG(DISTINCT owner_id) INTO owner_ids
    FROM feature_ownership
    WHERE app_id = NEW.app_id
      AND feature_name = ANY(NEW.related_features)
      AND requires_owner_approval = TRUE;

    IF owner_ids IS NOT NULL THEN
      NEW.assigned_reviewers := COALESCE(NEW.assigned_reviewers, ARRAY[]::UUID[]) || owner_ids;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_assign_reviewers
  BEFORE INSERT ON ai_review_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_feature_reviewers();

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Composite indexes for common queries
CREATE INDEX idx_contributions_app_user ON ai_prompt_contributions(app_id, user_id);
CREATE INDEX idx_decisions_app_status ON ai_decisions(app_id, status);
CREATE INDEX idx_reviews_app_status ON ai_review_requests(app_id, status);
CREATE INDEX idx_ownership_app_owner ON feature_ownership(app_id, owner_id);
