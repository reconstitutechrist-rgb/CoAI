/**
 * Project Brief API Routes
 *
 * GET /api/project-brief - Get the project brief for a team
 * POST /api/project-brief - Create a new project brief (owner/admin only)
 * PUT /api/project-brief - Update the project brief (owner/admin only)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import type {
  ProjectBrief,
  ProjectBriefRow,
  CreateProjectBriefInput,
  UpdateProjectBriefInput,
  DesiredFeature,
} from '@/types/projectIntegration';

/**
 * Check if user has required role for team
 */
async function checkTeamRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  teamId: string,
  requiredRoles: string[]
): Promise<boolean> {
  const { data } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  return data ? requiredRoles.includes(data.role) : false;
}

/**
 * Map database row to ProjectBrief
 */
function mapToProjectBrief(row: ProjectBriefRow): ProjectBrief {
  return {
    id: row.id,
    teamId: row.team_id,
    createdBy: row.created_by,
    appName: row.app_name,
    appDescription: row.app_description,
    problemStatement: row.problem_statement,
    targetUsers: row.target_users,
    successCriteria: row.success_criteria,
    desiredFeatures: row.desired_features as DesiredFeature[],
    technicalConstraints: row.technical_constraints || undefined,
    designConstraints: row.design_constraints || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * GET /api/project-brief?teamId=xxx
 * Get the project brief for a team
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    if (!teamId) {
      return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
    }

    // Check if user is a team member
    const isMember = await checkTeamRole(supabase, user.id, teamId, ['owner', 'admin', 'editor', 'viewer']);
    if (!isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get the project brief
    const { data, error } = await supabase
      .from('project_briefs')
      .select('*')
      .eq('team_id', teamId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No brief exists yet
        return NextResponse.json({ success: true, projectBrief: null });
      }
      throw error;
    }

    // Get creator info
    const { data: creatorData } = await supabase
      .from('user_profiles')
      .select('user_id, email, full_name, avatar_url')
      .eq('user_id', data.created_by)
      .single();

    const projectBrief = mapToProjectBrief(data as ProjectBriefRow);
    if (creatorData) {
      projectBrief.creator = {
        id: creatorData.user_id,
        email: creatorData.email,
        fullName: creatorData.full_name || undefined,
        avatarUrl: creatorData.avatar_url || undefined,
      };
    }

    return NextResponse.json({ success: true, projectBrief });
  } catch (error) {
    console.error('Error fetching project brief:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch project brief' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/project-brief
 * Create a new project brief (owner/admin only)
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateProjectBriefInput = await request.json();

    // Validate required fields
    if (!body.teamId || !body.appName || !body.appDescription || !body.problemStatement || !body.targetUsers) {
      return NextResponse.json(
        { error: 'teamId, appName, appDescription, problemStatement, and targetUsers are required' },
        { status: 400 }
      );
    }

    // Check if user is owner or admin
    const canCreate = await checkTeamRole(supabase, user.id, body.teamId, ['owner', 'admin']);
    if (!canCreate) {
      return NextResponse.json(
        { error: 'Only team owners and admins can create a project brief' },
        { status: 403 }
      );
    }

    // Check if brief already exists
    const { data: existing } = await supabase
      .from('project_briefs')
      .select('id')
      .eq('team_id', body.teamId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'A project brief already exists for this team. Use PUT to update it.' },
        { status: 409 }
      );
    }

    // Generate IDs for desired features
    const desiredFeatures: DesiredFeature[] = (body.desiredFeatures || []).map((f, index) => ({
      id: `feature-${Date.now()}-${index}`,
      name: f.name,
      description: f.description,
      priority: f.priority,
      notes: f.notes,
    }));

    // Create the project brief
    const { data, error } = await supabase
      .from('project_briefs')
      .insert({
        team_id: body.teamId,
        created_by: user.id,
        app_name: body.appName,
        app_description: body.appDescription,
        problem_statement: body.problemStatement,
        target_users: body.targetUsers,
        success_criteria: body.successCriteria || [],
        desired_features: desiredFeatures,
        technical_constraints: body.technicalConstraints || null,
        design_constraints: body.designConstraints || null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    const projectBrief = mapToProjectBrief(data as ProjectBriefRow);

    return NextResponse.json({ success: true, projectBrief });
  } catch (error) {
    console.error('Error creating project brief:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create project brief' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/project-brief
 * Update the project brief (owner/admin only)
 */
export async function PUT(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: UpdateProjectBriefInput & { teamId: string; briefId: string } = await request.json();

    if (!body.teamId || !body.briefId) {
      return NextResponse.json({ error: 'teamId and briefId are required' }, { status: 400 });
    }

    // Check if user is owner or admin
    const canUpdate = await checkTeamRole(supabase, user.id, body.teamId, ['owner', 'admin']);
    if (!canUpdate) {
      return NextResponse.json(
        { error: 'Only team owners and admins can update the project brief' },
        { status: 403 }
      );
    }

    // Build update object
    const updates: Record<string, unknown> = {};

    if (body.appName !== undefined) updates.app_name = body.appName;
    if (body.appDescription !== undefined) updates.app_description = body.appDescription;
    if (body.problemStatement !== undefined) updates.problem_statement = body.problemStatement;
    if (body.targetUsers !== undefined) updates.target_users = body.targetUsers;
    if (body.successCriteria !== undefined) updates.success_criteria = body.successCriteria;
    if (body.technicalConstraints !== undefined) updates.technical_constraints = body.technicalConstraints;
    if (body.designConstraints !== undefined) updates.design_constraints = body.designConstraints;

    // Handle desired features (generate IDs for new ones)
    if (body.desiredFeatures !== undefined) {
      updates.desired_features = body.desiredFeatures.map((f, index) => ({
        id: (f as DesiredFeature).id || `feature-${Date.now()}-${index}`,
        name: f.name,
        description: f.description,
        priority: f.priority,
        notes: f.notes,
      }));
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    // Update the project brief
    const { data, error } = await supabase
      .from('project_briefs')
      .update(updates)
      .eq('id', body.briefId)
      .eq('team_id', body.teamId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Project brief not found' }, { status: 404 });
      }
      throw error;
    }

    const projectBrief = mapToProjectBrief(data as ProjectBriefRow);

    return NextResponse.json({ success: true, projectBrief });
  } catch (error) {
    console.error('Error updating project brief:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update project brief' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/project-brief
 * Delete the project brief (owner only)
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const briefId = searchParams.get('briefId');

    if (!teamId || !briefId) {
      return NextResponse.json({ error: 'teamId and briefId are required' }, { status: 400 });
    }

    // Check if user is owner
    const canDelete = await checkTeamRole(supabase, user.id, teamId, ['owner']);
    if (!canDelete) {
      return NextResponse.json(
        { error: 'Only team owners can delete the project brief' },
        { status: 403 }
      );
    }

    // Delete the project brief
    const { error } = await supabase
      .from('project_briefs')
      .delete()
      .eq('id', briefId)
      .eq('team_id', teamId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project brief:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete project brief' },
      { status: 500 }
    );
  }
}
