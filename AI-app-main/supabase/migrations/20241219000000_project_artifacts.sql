-- ============================================================================
-- PROJECT ARTIFACTS
-- Migration: 20241219000000_project_artifacts.sql
--
-- Features:
-- 1. Project Artifacts - Save AI Builder and AI Debate work to team projects
-- 2. Role-based access control (owner/admin: all, editor: own, viewer: view-only)
-- 3. Activity log integration for tracking artifact changes
-- ============================================================================

-- ============================================================================
-- 1. PROJECT_ARTIFACTS TABLE
-- Main table for storing saved team work
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership and relationships
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Artifact metadata
  name VARCHAR(255) NOT NULL,
  description TEXT,
  artifact_type TEXT NOT NULL CHECK (artifact_type IN (
    'ai_builder_plan',      -- AppConcept + conversation
    'ai_builder_app',       -- Full generated app with code
    'ai_debate_session'     -- Debate session with consensus
  )),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN (
    'draft',      -- Still being worked on
    'published',  -- Complete and shared
    'archived'    -- Hidden from default views
  )),

  -- Reference to source data (optional, based on type)
  debate_session_id UUID REFERENCES debate_sessions(id) ON DELETE SET NULL,
  app_id UUID,

  -- Snapshot content (JSONB for flexibility)
  -- For ai_builder_plan: { appConcept, conversationContext, wizardState }
  -- For ai_builder_app: { appConcept, generatedFiles, version, buildStatus, phaseProgress }
  -- For ai_debate_session: { userQuestion, consensus, messageCount, participants, debateStatus, roundCount, costSummary }
  content JSONB NOT NULL DEFAULT '{}'::JSONB,

  -- Preview/thumbnail
  preview_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_artifact_name CHECK (char_length(name) > 0 AND char_length(name) <= 255)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_project_artifacts_team ON project_artifacts(team_id);
CREATE INDEX IF NOT EXISTS idx_project_artifacts_created_by ON project_artifacts(created_by);
CREATE INDEX IF NOT EXISTS idx_project_artifacts_type ON project_artifacts(artifact_type);
CREATE INDEX IF NOT EXISTS idx_project_artifacts_status ON project_artifacts(status);
CREATE INDEX IF NOT EXISTS idx_project_artifacts_created_at ON project_artifacts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_artifacts_debate ON project_artifacts(debate_session_id);
CREATE INDEX IF NOT EXISTS idx_project_artifacts_app ON project_artifacts(app_id);

-- ============================================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE project_artifacts ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------------
-- SELECT: Team members can view all artifacts in their team
-- --------------------------------------------------------------------------
CREATE POLICY "Team members can view artifacts" ON project_artifacts
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- --------------------------------------------------------------------------
-- INSERT: Owner/admin/editor can create artifacts
-- --------------------------------------------------------------------------
CREATE POLICY "Editors can create artifacts" ON project_artifacts
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role IN ('owner', 'admin', 'editor')
    )
  );

-- --------------------------------------------------------------------------
-- UPDATE: Owner/admin can update any, editor can update their own
-- --------------------------------------------------------------------------
CREATE POLICY "Update artifacts based on role" ON project_artifacts
  FOR UPDATE USING (
    -- Owner/admin can update any artifact in their team
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role IN ('owner', 'admin')
    )
    OR
    -- Editor can only update their own artifacts
    (
      created_by = auth.uid() AND
      team_id IN (
        SELECT team_id FROM team_members
        WHERE user_id = auth.uid()
          AND status = 'active'
          AND role = 'editor'
      )
    )
  );

-- --------------------------------------------------------------------------
-- DELETE: Owner/admin can delete any, editor can delete their own
-- --------------------------------------------------------------------------
CREATE POLICY "Delete artifacts based on role" ON project_artifacts
  FOR DELETE USING (
    -- Owner/admin can delete any artifact in their team
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role IN ('owner', 'admin')
    )
    OR
    -- Editor can only delete their own artifacts
    (
      created_by = auth.uid() AND
      team_id IN (
        SELECT team_id FROM team_members
        WHERE user_id = auth.uid()
          AND status = 'active'
          AND role = 'editor'
      )
    )
  );

-- ============================================================================
-- 3. UPDATED_AT TRIGGER
-- ============================================================================

-- Use existing update_updated_at_column function if it exists,
-- otherwise create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;
END $$;

CREATE TRIGGER update_project_artifacts_updated_at
  BEFORE UPDATE ON project_artifacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. COMMENTS
-- ============================================================================

COMMENT ON TABLE project_artifacts IS 'Stores saved AI Builder and AI Debate work as team project artifacts';
COMMENT ON COLUMN project_artifacts.artifact_type IS 'Type of artifact: ai_builder_plan, ai_builder_app, or ai_debate_session';
COMMENT ON COLUMN project_artifacts.content IS 'JSONB snapshot of the artifact content based on type';
COMMENT ON COLUMN project_artifacts.status IS 'Artifact status: draft (wip), published (shared), archived (hidden)';
