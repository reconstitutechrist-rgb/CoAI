-- ============================================================================
-- AI DEBATE PERSISTENCE & ENHANCEMENTS
-- Migration: 20241218000000_debate_persistence.sql
--
-- Features:
-- 1. Debate Sessions - Persistent storage for debate conversations
-- 2. Debate Messages - Individual messages with voting support
-- 3. User Interjections - User input during debates
-- 4. Debate Templates - Reusable debate configurations
-- ============================================================================

-- ============================================================================
-- 1. DEBATE SESSIONS
-- Main table for storing debate conversations
-- ============================================================================

CREATE TABLE debate_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES generated_apps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,

  -- Core debate data
  user_question TEXT NOT NULL,
  status TEXT DEFAULT 'starting' CHECK (status IN ('starting', 'debating', 'agreed', 'user-ended', 'error')),

  -- Configuration
  debate_style TEXT DEFAULT 'cooperative' CHECK (debate_style IN ('cooperative', 'adversarial', 'red_team', 'panel')),
  max_rounds INTEGER DEFAULT 3,
  participants JSONB NOT NULL DEFAULT '[]'::JSONB, -- [{modelId, displayName, role, color}]

  -- Results
  consensus JSONB, -- DebateConsensus object
  cost JSONB NOT NULL DEFAULT '{}'::JSONB, -- DebateCost object
  round_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,

  CONSTRAINT valid_user_question CHECK (char_length(user_question) > 0)
);

CREATE INDEX idx_debate_sessions_app ON debate_sessions(app_id);
CREATE INDEX idx_debate_sessions_user ON debate_sessions(user_id);
CREATE INDEX idx_debate_sessions_team ON debate_sessions(team_id);
CREATE INDEX idx_debate_sessions_status ON debate_sessions(status);
CREATE INDEX idx_debate_sessions_created ON debate_sessions(created_at DESC);

-- ============================================================================
-- 2. DEBATE MESSAGES
-- Individual messages within a debate session
-- ============================================================================

CREATE TABLE debate_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES debate_sessions(id) ON DELETE CASCADE,

  -- Model info
  model_id TEXT NOT NULL,
  model_display_name TEXT NOT NULL,
  role TEXT NOT NULL,

  -- Content
  content TEXT NOT NULL,
  turn_number INTEGER NOT NULL,
  is_agreement BOOLEAN DEFAULT FALSE,

  -- Token usage
  tokens_used JSONB DEFAULT '{"input": 0, "output": 0}'::JSONB,

  -- User voting on messages
  votes JSONB DEFAULT '{"upvotes": 0, "downvotes": 0, "voters": []}'::JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_debate_messages_session ON debate_messages(session_id);
CREATE INDEX idx_debate_messages_turn ON debate_messages(session_id, turn_number);
CREATE INDEX idx_debate_messages_model ON debate_messages(model_id);

-- ============================================================================
-- 3. DEBATE INTERJECTIONS
-- User comments and steering during active debates
-- ============================================================================

CREATE TABLE debate_interjections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES debate_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Interjection content
  content TEXT NOT NULL,
  interjection_type TEXT DEFAULT 'comment' CHECK (interjection_type IN ('comment', 'steer', 'challenge', 'clarify')),

  -- Target message (if challenging a specific point)
  target_message_id UUID REFERENCES debate_messages(id) ON DELETE SET NULL,

  -- Tracking which models acknowledged this
  acknowledged_by JSONB DEFAULT '[]'::JSONB, -- Array of model IDs

  -- After which turn this was injected
  after_turn INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_debate_interjections_session ON debate_interjections(session_id);
CREATE INDEX idx_debate_interjections_user ON debate_interjections(user_id);
CREATE INDEX idx_debate_interjections_target ON debate_interjections(target_message_id);

-- ============================================================================
-- 4. DEBATE TEMPLATES
-- Reusable debate configurations
-- ============================================================================

CREATE TABLE debate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Template info
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL CHECK (template_type IN ('code_review', 'architecture', 'brainstorming', 'devils_advocate', 'custom')),

  -- Default configuration
  default_style TEXT DEFAULT 'cooperative' CHECK (default_style IN ('cooperative', 'adversarial', 'red_team', 'panel')),
  default_max_rounds INTEGER DEFAULT 3,
  default_participants JSONB NOT NULL DEFAULT '[]'::JSONB, -- Default model configuration

  -- System prompt customizations
  system_prompt_overrides JSONB DEFAULT '{}'::JSONB, -- {modelId: customPrompt}

  -- Usage tracking
  use_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_debate_templates_team ON debate_templates(team_id);
CREATE INDEX idx_debate_templates_type ON debate_templates(template_type);
CREATE INDEX idx_debate_templates_public ON debate_templates(is_public) WHERE is_public = TRUE;

-- ============================================================================
-- 5. DEBATE MESSAGE VOTES
-- Separate table for tracking user votes on debate messages
-- ============================================================================

CREATE TABLE debate_message_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES debate_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  vote TEXT NOT NULL CHECK (vote IN ('up', 'down')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(message_id, user_id)
);

CREATE INDEX idx_debate_votes_message ON debate_message_votes(message_id);
CREATE INDEX idx_debate_votes_user ON debate_message_votes(user_id);

-- ============================================================================
-- 6. DEBATE ANALYTICS
-- Aggregated statistics for analytics dashboard
-- ============================================================================

CREATE TABLE debate_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES generated_apps(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,

  -- Time period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('day', 'week', 'month')),

  -- Aggregated stats
  total_debates INTEGER DEFAULT 0,
  debates_reached_consensus INTEGER DEFAULT 0,
  debates_user_ended INTEGER DEFAULT 0,
  debates_errored INTEGER DEFAULT 0,

  -- Round statistics
  avg_rounds_to_consensus NUMERIC(4, 2),
  max_rounds_used INTEGER DEFAULT 0,
  min_rounds_used INTEGER DEFAULT 0,

  -- Cost statistics
  total_cost NUMERIC(10, 4) DEFAULT 0,
  avg_cost_per_debate NUMERIC(10, 4) DEFAULT 0,

  -- Model statistics
  model_usage JSONB DEFAULT '{}'::JSONB, -- {modelId: {debates: N, tokens: N, cost: N}}

  -- Style statistics
  style_usage JSONB DEFAULT '{}'::JSONB, -- {style: count}

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(app_id, period_start, period_type)
);

CREATE INDEX idx_debate_analytics_app ON debate_analytics(app_id);
CREATE INDEX idx_debate_analytics_period ON debate_analytics(period_start, period_type);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE debate_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE debate_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE debate_interjections ENABLE ROW LEVEL SECURITY;
ALTER TABLE debate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE debate_message_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE debate_analytics ENABLE ROW LEVEL SECURITY;

-- Debate Sessions: Owner, team members, and app collaborators can view
CREATE POLICY "debate_sessions_view" ON debate_sessions
  FOR SELECT USING (
    user_id = auth.uid()
    OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
    OR app_id IN (SELECT app_id FROM app_collaborators WHERE user_id = auth.uid())
    OR app_id IN (SELECT id FROM generated_apps WHERE user_id = auth.uid())
  );

CREATE POLICY "debate_sessions_create" ON debate_sessions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "debate_sessions_update" ON debate_sessions
  FOR UPDATE USING (
    user_id = auth.uid()
    OR team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "debate_sessions_delete" ON debate_sessions
  FOR DELETE USING (user_id = auth.uid());

-- Debate Messages: Same as sessions (through session ownership)
CREATE POLICY "debate_messages_view" ON debate_messages
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM debate_sessions WHERE
        user_id = auth.uid()
        OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
        OR app_id IN (SELECT app_id FROM app_collaborators WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "debate_messages_create" ON debate_messages
  FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM debate_sessions WHERE user_id = auth.uid())
  );

-- Debate Interjections: Users can manage their own
CREATE POLICY "debate_interjections_view" ON debate_interjections
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM debate_sessions WHERE
        user_id = auth.uid()
        OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
    )
  );

CREATE POLICY "debate_interjections_create" ON debate_interjections
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "debate_interjections_update" ON debate_interjections
  FOR UPDATE USING (user_id = auth.uid());

-- Debate Templates: Team members can view, creators can manage
CREATE POLICY "debate_templates_view" ON debate_templates
  FOR SELECT USING (
    is_public = TRUE
    OR created_by = auth.uid()
    OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "debate_templates_create" ON debate_templates
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "debate_templates_manage" ON debate_templates
  FOR ALL USING (
    created_by = auth.uid()
    OR team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
    )
  );

-- Debate Message Votes: Users manage their own votes
CREATE POLICY "debate_votes_view" ON debate_message_votes
  FOR SELECT USING (
    message_id IN (
      SELECT dm.id FROM debate_messages dm
      JOIN debate_sessions ds ON dm.session_id = ds.id
      WHERE ds.user_id = auth.uid()
        OR ds.team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
    )
  );

CREATE POLICY "debate_votes_manage" ON debate_message_votes
  FOR ALL USING (user_id = auth.uid());

-- Debate Analytics: Team members can view
CREATE POLICY "debate_analytics_view" ON debate_analytics
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
    OR app_id IN (SELECT id FROM generated_apps WHERE user_id = auth.uid())
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update vote counts on debate_messages when votes change
CREATE OR REPLACE FUNCTION update_debate_message_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE debate_messages
    SET votes = jsonb_build_object(
      'upvotes', (SELECT COUNT(*) FROM debate_message_votes WHERE message_id = NEW.message_id AND vote = 'up'),
      'downvotes', (SELECT COUNT(*) FROM debate_message_votes WHERE message_id = NEW.message_id AND vote = 'down'),
      'voters', (SELECT jsonb_agg(jsonb_build_object('userId', user_id, 'vote', vote)) FROM debate_message_votes WHERE message_id = NEW.message_id)
    )
    WHERE id = NEW.message_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE debate_messages
    SET votes = jsonb_build_object(
      'upvotes', (SELECT COUNT(*) FROM debate_message_votes WHERE message_id = OLD.message_id AND vote = 'up'),
      'downvotes', (SELECT COUNT(*) FROM debate_message_votes WHERE message_id = OLD.message_id AND vote = 'down'),
      'voters', (SELECT COALESCE(jsonb_agg(jsonb_build_object('userId', user_id, 'vote', vote)), '[]'::jsonb) FROM debate_message_votes WHERE message_id = OLD.message_id)
    )
    WHERE id = OLD.message_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_vote_counts
  AFTER INSERT OR UPDATE OR DELETE ON debate_message_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_debate_message_vote_counts();

-- Function to update debate template use count
CREATE OR REPLACE FUNCTION increment_template_use_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if new session references a template (stored in participants metadata)
  -- This is triggered by app logic calling a separate update
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update session timestamp on message insert
CREATE OR REPLACE FUNCTION update_debate_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE debate_sessions
  SET updated_at = NOW(),
      round_count = GREATEST(round_count, NEW.turn_number)
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_session_on_message
  AFTER INSERT ON debate_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_debate_session_timestamp();

-- ============================================================================
-- INSERT DEFAULT TEMPLATES
-- ============================================================================

-- Code Review template
INSERT INTO debate_templates (id, team_id, created_by, name, description, template_type, default_style, default_participants, system_prompt_overrides, is_public)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM auth.users LIMIT 1),
  'Code Review',
  'Two AI models review code for quality, bugs, and best practices',
  'code_review',
  'cooperative',
  '[{"modelId": "claude-opus-4", "displayName": "Claude Opus 4.5", "role": "code-quality-expert"}, {"modelId": "gemini-pro", "displayName": "Gemini Pro", "role": "security-analyst"}]'::jsonb,
  '{}'::jsonb,
  TRUE
WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 1);

-- Architecture Decision template
INSERT INTO debate_templates (id, team_id, created_by, name, description, template_type, default_style, default_participants, system_prompt_overrides, is_public)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM auth.users LIMIT 1),
  'Architecture Decision',
  'Models debate architectural approaches and trade-offs',
  'architecture',
  'adversarial',
  '[{"modelId": "claude-opus-4", "displayName": "Claude Opus 4.5", "role": "strategic-architect"}, {"modelId": "gpt-5", "displayName": "GPT-5", "role": "implementation-specialist"}]'::jsonb,
  '{}'::jsonb,
  TRUE
WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 1);

-- Brainstorming template
INSERT INTO debate_templates (id, team_id, created_by, name, description, template_type, default_style, default_participants, system_prompt_overrides, is_public)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM auth.users LIMIT 1),
  'Brainstorming',
  'Creative ideation with multiple AI perspectives',
  'brainstorming',
  'panel',
  '[{"modelId": "claude-opus-4", "displayName": "Claude Opus 4.5", "role": "creative-thinker"}, {"modelId": "gpt-5", "displayName": "GPT-5", "role": "practical-evaluator"}, {"modelId": "gemini-pro", "displayName": "Gemini Pro", "role": "innovation-catalyst"}]'::jsonb,
  '{}'::jsonb,
  TRUE
WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 1);

-- Devil's Advocate template
INSERT INTO debate_templates (id, team_id, created_by, name, description, template_type, default_style, default_participants, system_prompt_overrides, is_public)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM auth.users LIMIT 1),
  'Devil''s Advocate',
  'One model proposes, another challenges and finds flaws',
  'devils_advocate',
  'red_team',
  '[{"modelId": "claude-opus-4", "displayName": "Claude Opus 4.5", "role": "proposer"}, {"modelId": "gpt-5", "displayName": "GPT-5", "role": "devils-advocate"}]'::jsonb,
  '{}'::jsonb,
  TRUE
WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 1);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Full-text search on debate questions
CREATE INDEX idx_debate_sessions_question_search ON debate_sessions USING gin(to_tsvector('english', user_question));

-- Composite indexes for common queries
CREATE INDEX idx_debate_sessions_app_status ON debate_sessions(app_id, status);
CREATE INDEX idx_debate_sessions_user_created ON debate_sessions(user_id, created_at DESC);
CREATE INDEX idx_debate_messages_session_created ON debate_messages(session_id, created_at);
