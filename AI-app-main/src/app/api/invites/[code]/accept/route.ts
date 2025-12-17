/**
 * Invite Accept API Route
 *
 * POST /api/invites/[code]/accept - Accept an invitation and join a team
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { TeamService } from '@/services/TeamService';

interface RouteParams {
  params: Promise<{ code: string }>;
}

/**
 * POST /api/invites/[code]/accept
 * Accept an invitation and join the team
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { code } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to accept an invitation' },
        { status: 401 }
      );
    }

    const teamService = new TeamService(supabase);

    // Get and validate the invite
    const inviteResult = await teamService.getInviteByCode(code);
    if (!inviteResult.success) {
      return NextResponse.json(
        { error: inviteResult.error?.message || 'Invalid invitation' },
        { status: 400 }
      );
    }

    const invite = inviteResult.data;

    // If invite has an email, check if it matches
    if (invite.email && invite.email.toLowerCase() !== user.email?.toLowerCase()) {
      return NextResponse.json(
        { error: 'This invitation was sent to a different email address' },
        { status: 403 }
      );
    }

    // Accept the invite
    const result = await teamService.acceptInvite(code, user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || 'Failed to accept invitation' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      team: result.data,
      message: 'You have successfully joined the team',
    });
  } catch (error) {
    console.error('Error accepting invite:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/invites/[code]/accept
 * Get invite details without accepting (for preview)
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { code } = await params;
    const supabase = await createClient();

    const teamService = new TeamService(supabase);

    // Get and validate the invite
    const inviteResult = await teamService.getInviteByCode(code);
    if (!inviteResult.success) {
      return NextResponse.json(
        { error: inviteResult.error?.message || 'Invalid invitation' },
        { status: 400 }
      );
    }

    const invite = inviteResult.data;

    // Return invite details (without sensitive info)
    return NextResponse.json({
      success: true,
      invite: {
        teamId: invite.teamId,
        teamName: invite.team?.name,
        teamAvatar: invite.team?.avatarUrl,
        role: invite.role,
        expiresAt: invite.expiresAt,
        hasEmailRestriction: !!invite.email,
      },
    });
  } catch (error) {
    console.error('Error getting invite:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get invitation' },
      { status: 500 }
    );
  }
}
