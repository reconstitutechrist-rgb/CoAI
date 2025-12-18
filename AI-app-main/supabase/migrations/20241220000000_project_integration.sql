-- ============================================================================
-- PROJECT INTEGRATION
-- Migration: 20241220000000_project_integration.sql
--
-- Features:
-- 1. Project Briefs - Owner's master vision defining what the app should be
-- 2. Plan Synthesis Results - AI-generated unified plans from team artifacts
-- 3. Role-based access (owner/admin can create briefs, all members can view)
-- ============================================================================

-- ============================================================================
-- 1. PROJECT_BRIEFS TABLE
-- Stores the owner's master vision for the app
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- The Vision
  app_name VARCHAR(255) NOT NULL,
  app_description TEXT NOT NULL,
  problem_statement TEXT NOT NULL,
  target_users TEXT NOT NULL,
  success_criteria TEXT[] NOT NULL DEFAULT '{}',

  -- Features (stored as JSONB for flexibility)
  -- Array of: { id, name, description, priority: 'must-have'|'should-have'|'nice-to-have', notes? }
  desired_features JSONB NOT NULL DEFAULT '[]'::JSONB,

  -- Constraints
  technical_constraints TEXT[],
  design_constraints TEXT[],

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Only one brief per team
  CONSTRAINT unique_team_brief UNIQUE (team_id),
  CONSTRAINT valid_app_name CHECK (char_length(app_name) > 0 AND char_length(app_name) <= 255)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_briefs_team ON project_briefs(team_id);
CREATE INDEX IF NOT EXISTS idx_project_briefs_created_by ON project_briefs(created_by);

-- ============================================================================
-- 2. PLAN_SYNTHESIS_RESULTS TABLE
-- Stores AI-generated synthesis of team artifacts
-- ============================================================================

CREATE TABLE IF NOT EXISTS plan_synthesis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  project_brief_id UUID REFERENCES project_briefs(id) ON DELETE SET NULL,

  -- The Unified Plan (complete AppConcept)
  unified_app_concept JSONB NOT NULL,

  -- Gap Analysis
  -- { missingFeatures, incompleteAreas, conflicts, completionPercentage, readyToBuild, blockers }
  gap_analysis JSONB NOT NULL DEFAULT '{}'::JSONB,

  -- Integration Plan
  -- { featureConnections, sharedElements, suggestedPhases }
  integration_plan JSONB NOT NULL DEFAULT '{}'::JSONB,

  -- Source Tracking
  -- Array of: { artifactId, artifactName, artifactType, contributedBy, contributedFeatures, keyDecisions }
  contributing_artifacts JSONB NOT NULL DEFAULT '[]'::JSONB,

  -- Metadata
  ai_model VARCHAR(100) NOT NULL,
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  confidence_level TEXT NOT NULL CHECK (confidence_level IN ('low', 'medium', 'high')),
  warnings TEXT[] DEFAULT '{}',

  -- Timestamps
  synthesized_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Keep latest synthesis per team (optional: can store history)
  CONSTRAINT valid_confidence CHECK (confidence >= 0 AND confidence <= 100)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_synthesis_team ON plan_synthesis_results(team_id);
CREATE INDEX IF NOT EXISTS idx_synthesis_brief ON plan_synthesis_results(project_brief_id);
CREATE INDEX IF NOT EXISTS idx_synthesis_date ON plan_synthesis_results(synthesized_at DESC);

-- ============================================================================
-- 3. ROW LEVEL SECURITY - PROJECT_BRIEFS
-- ============================================================================

ALTER TABLE project_briefs ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------------
-- SELECT: All team members can view the project brief
-- --------------------------------------------------------------------------
CREATE POLICY "Team members can view project brief" ON project_briefs
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- --------------------------------------------------------------------------
-- INSERT: Only owners and admins can create a project brief
-- --------------------------------------------------------------------------
CREATE POLICY "Owners and admins can create project brief" ON project_briefs
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role IN ('owner', 'admin')
    )
    AND created_by = auth.uid()
  );

-- --------------------------------------------------------------------------
-- UPDATE: Only owners and admins can update the project brief
-- --------------------------------------------------------------------------
CREATE POLICY "Owners and admins can update project brief" ON project_briefs
  FOR UPDATE USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role IN ('owner', 'admin')
    )
  );

-- --------------------------------------------------------------------------
-- DELETE: Only owners can delete the project brief
-- --------------------------------------------------------------------------
CREATE POLICY "Owners can delete project brief" ON project_briefs
  FOR DELETE USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role = 'owner'
    )
  );

-- ============================================================================
-- 4. ROW LEVEL SECURITY - PLAN_SYNTHESIS_RESULTS
-- ============================================================================

ALTER TABLE plan_synthesis_results ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------------
-- SELECT: All team members can view synthesis results
-- --------------------------------------------------------------------------
CREATE POLICY "Team members can view synthesis results" ON plan_synthesis_results
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- --------------------------------------------------------------------------
-- INSERT: Any active team member can create synthesis results
-- (AI synthesis is triggered by any team member)
-- --------------------------------------------------------------------------
CREATE POLICY "Team members can create synthesis results" ON plan_synthesis_results
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- --------------------------------------------------------------------------
-- DELETE: Only owners and admins can delete synthesis results
-- --------------------------------------------------------------------------
CREATE POLICY "Owners and admins can delete synthesis results" ON plan_synthesis_results
  FOR DELETE USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- 5. TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Trigger function (reuse if exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to project_briefs
DROP TRIGGER IF EXISTS update_project_briefs_updated_at ON project_briefs;
CREATE TRIGGER update_project_briefs_updated_at
  BEFORE UPDATE ON project_briefs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. COMMENTS
-- ============================================================================

COMMENT ON TABLE project_briefs IS 'Owner-defined master vision for the app being built by the team';
COMMENT ON COLUMN project_briefs.desired_features IS 'JSONB array of desired features with id, name, description, priority, notes';
COMMENT ON COLUMN project_briefs.success_criteria IS 'Array of criteria that define when the app is complete';

COMMENT ON TABLE plan_synthesis_results IS 'AI-generated unified plans synthesized from team artifacts';
COMMENT ON COLUMN plan_synthesis_results.unified_app_concept IS 'Complete merged AppConcept combining all team contributions';
COMMENT ON COLUMN plan_synthesis_results.gap_analysis IS 'Analysis of missing features, incomplete areas, and conflicts';
COMMENT ON COLUMN plan_synthesis_results.integration_plan IS 'Plan for how features connect and suggested build order';
