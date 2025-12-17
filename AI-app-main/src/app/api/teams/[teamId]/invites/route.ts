/**
 * Team Invites API Routes
 *
 * POST /api/teams/[teamId]/invites - Create an invite link
 * GET /api/teams/[teamId]/invites - List pending invites
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { TeamService } from '@/services/TeamService';
import type { CreateInviteServiceInput } from '@/types/collaboration';

interface RouteParams {
  params: Promise<{ teamId: string }>;
}

/**
 * POST /api/teams/[teamId]/invites
 * Create a new invite link
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

    // Check if user has permission to create invites
    // getUserRole returns TeamRole | null directly, not a ServiceResult
    const userRole = await teamService.getUserRole(teamId, user.id);
    if (!userRole) {
      return NextResponse.json(
        { error: 'Team not found or access denied' },
        { status: 404 }
      );
    }

    // Check if user can invite (owner, admin, or if member invites are allowed)
    const teamResult = await teamService.getTeam(teamId);
    if (!teamResult.success || !teamResult.data) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    const canInvite =
      userRole === 'owner' ||
      userRole === 'admin' ||
      teamResult.data.settings.allowMemberInvites;

    if (!canInvite) {
      return NextResponse.json(
        { error: 'You do not have permission to create invites' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Convert expiresInDays to expiresInHours for the service
    const expiresInHours = body.expiresInDays ? body.expiresInDays * 24 : undefined;

    // Determine role, with default from team settings
    let role = body.role || teamResult.data.settings.defaultMemberRole;

    // Non-admins can only invite with viewer role
    if (userRole !== 'owner' && userRole !== 'admin') {
      role = 'viewer';
    }

    // Can't invite with owner role
    if (role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot invite with owner role' },
        { status: 400 }
      );
    }

    const serviceInput: CreateInviteServiceInput = {
      email: body.email,
      role,
      expiresInHours,
      maxUses: body.maxUses,
    };

    const result = await teamService.createInvite(teamId, serviceInput, user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // InviteLink has 'code' not 'inviteCode'
    const inviteUrl = result.data.url;

    return NextResponse.json({
      success: true,
      invite: result.data,
      inviteUrl,
    });
  } catch (error) {
    console.error('Error creating invite:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create invite' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/teams/[teamId]/invites
 * List all pending invites for a team (admin/owner only)
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

    // Check if user has permission
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
        { error: 'Only owners and admins can view invites' },
        { status: 403 }
      );
    }

    const result = await teamService.getPendingInvites(teamId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      invites: result.data,
    });
  } catch (error) {
    console.error('Error listing invites:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list invites' },
      { status: 500 }
    );
  }
}
