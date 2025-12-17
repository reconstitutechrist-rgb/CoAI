/**
 * Team Members API Routes
 *
 * GET /api/teams/[teamId]/members - List team members
 * POST /api/teams/[teamId]/members - Add a member to the team
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { TeamService } from '@/services/TeamService';
import type { TeamRole } from '@/types/collaboration';

interface RouteParams {
  params: Promise<{ teamId: string }>;
}

/**
 * GET /api/teams/[teamId]/members
 * List all members of a team
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

    const result = await teamService.getMembers(teamId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      members: result.data,
    });
  } catch (error) {
    console.error('Error listing team members:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list team members' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/teams/[teamId]/members
 * Add a member to the team (requires admin or owner)
 */
export async function POST(request: Request, { params }: RouteParams) {
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

    // Check if user has permission to add members
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
        { error: 'Only owners and admins can add members' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId: targetUserId, role = 'viewer' } = body as { userId: string; role?: TeamRole };

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Can't assign owner role unless current user is owner
    if (role === 'owner' && userRole !== 'owner') {
      return NextResponse.json(
        { error: 'Only the owner can assign owner role' },
        { status: 403 }
      );
    }

    const result = await teamService.addMember(teamId, targetUserId, role, user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      member: result.data,
    });
  } catch (error) {
    console.error('Error adding team member:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add team member' },
      { status: 500 }
    );
  }
}
