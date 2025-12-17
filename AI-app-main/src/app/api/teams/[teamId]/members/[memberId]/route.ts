/**
 * Team Member Detail API Routes
 *
 * PATCH /api/teams/[teamId]/members/[memberId] - Update member role
 * DELETE /api/teams/[teamId]/members/[memberId] - Remove member from team
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { TeamService } from '@/services/TeamService';
import type { TeamRole } from '@/types/collaboration';

interface RouteParams {
  params: Promise<{ teamId: string; memberId: string }>;
}

/**
 * PATCH /api/teams/[teamId]/members/[memberId]
 * Update member role (requires admin or owner)
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { teamId, memberId } = await params;
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
        { error: 'Only owners and admins can update member roles' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { role } = body as { role: TeamRole };

    if (!role) {
      return NextResponse.json(
        { error: 'Role is required' },
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

    // Get member to check role and get userId
    const memberResult = await teamService.getMemberById(memberId);
    if (!memberResult.success || !memberResult.data) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // Prevent non-owners from modifying owner's role
    if (memberResult.data.role === 'owner' && userRole !== 'owner') {
      return NextResponse.json(
        { error: 'Cannot modify owner role' },
        { status: 403 }
      );
    }

    // updateMemberRole expects (teamId, userId, role), not memberId
    const result = await teamService.updateMemberRole(teamId, memberResult.data.userId, role);

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
    console.error('Error updating member role:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update member role' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/teams/[teamId]/members/[memberId]
 * Remove member from team (requires admin or owner, or self)
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { teamId, memberId } = await params;
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

    // Get the member to check if it's self-removal
    const memberResult = await teamService.getMemberById(memberId);
    if (!memberResult.success || !memberResult.data) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    const isSelf = memberResult.data.userId === user.id;
    const isAdminOrOwner = userRole === 'owner' || userRole === 'admin';

    // Allow self-removal or admin/owner removal
    if (!isSelf && !isAdminOrOwner) {
      return NextResponse.json(
        { error: 'You can only remove yourself or be an admin/owner to remove others' },
        { status: 403 }
      );
    }

    // Can't remove owner unless there's a transfer of ownership
    if (memberResult.data.role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot remove team owner. Transfer ownership first.' },
        { status: 403 }
      );
    }

    // Non-owners can't remove admins
    if (memberResult.data.role === 'admin' && userRole !== 'owner' && !isSelf) {
      return NextResponse.json(
        { error: 'Only the owner can remove admins' },
        { status: 403 }
      );
    }

    // removeMember expects (teamId, userId), not memberId
    const result = await teamService.removeMember(teamId, memberResult.data.userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: isSelf ? 'You have left the team' : 'Member removed successfully',
    });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove member' },
      { status: 500 }
    );
  }
}
