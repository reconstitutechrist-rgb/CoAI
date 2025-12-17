/**
 * Team Detail API Routes
 *
 * GET /api/teams/[teamId] - Get team details
 * PATCH /api/teams/[teamId] - Update team
 * DELETE /api/teams/[teamId] - Delete team
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { TeamService } from '@/services/TeamService';
import type { UpdateTeamInput } from '@/types/collaboration';

interface RouteParams {
  params: Promise<{ teamId: string }>;
}

/**
 * GET /api/teams/[teamId]
 * Get team details with members
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { teamId } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const teamService = new TeamService(supabase);

    // Check if user is a member of this team
    // getUserRole returns TeamRole | null directly, not a ServiceResult
    const userRole = await teamService.getUserRole(teamId, user.id);
    if (!userRole) {
      return NextResponse.json(
        { error: 'Team not found or access denied' },
        { status: 404 }
      );
    }

    const result = await teamService.getTeam(teamId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      team: result.data,
      userRole,
    });
  } catch (error) {
    console.error('Error getting team:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get team' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/teams/[teamId]
 * Update team (requires admin or owner)
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { teamId } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const teamService = new TeamService(supabase);

    // Check if user has permission to update
    // getUserRole returns TeamRole | null directly, not a ServiceResult
    const userRole = await teamService.getUserRole(teamId, user.id);
    if (!userRole) {
      return NextResponse.json(
        { error: 'Team not found or access denied' },
        { status: 404 }
      );
    }

    if (userRole !== 'owner' && userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Only owners and admins can update team settings' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const input: UpdateTeamInput = {
      name: body.name,
      description: body.description,
      avatarUrl: body.avatarUrl,
      settings: body.settings,
    };

    // updateTeam expects (teamId, input), not user.id
    const result = await teamService.updateTeam(teamId, input);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      team: result.data,
    });
  } catch (error) {
    console.error('Error updating team:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update team' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/teams/[teamId]
 * Delete team (requires owner)
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { teamId } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const teamService = new TeamService(supabase);

    // Check if user is owner
    // getUserRole returns TeamRole | null directly, not a ServiceResult
    const userRole = await teamService.getUserRole(teamId, user.id);
    if (!userRole) {
      return NextResponse.json(
        { error: 'Team not found or access denied' },
        { status: 404 }
      );
    }

    if (userRole !== 'owner') {
      return NextResponse.json(
        { error: 'Only the team owner can delete the team' },
        { status: 403 }
      );
    }

    // deleteTeam expects only (teamId), not user.id
    const result = await teamService.deleteTeam(teamId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Team deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete team' },
      { status: 500 }
    );
  }
}
