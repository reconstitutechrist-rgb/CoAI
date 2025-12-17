/**
 * Team API Routes
 *
 * POST /api/teams - Create a new team
 * GET /api/teams - List user's teams
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { TeamService } from '@/services/TeamService';
import type { CreateTeamInput } from '@/types/collaboration';

/**
 * POST /api/teams
 * Create a new team
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const input: CreateTeamInput = {
      name: body.name,
      description: body.description,
      settings: body.settings,
    };

    // Validate required fields
    if (!input.name || input.name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Team name is required' },
        { status: 400 }
      );
    }

    const teamService = new TeamService(supabase);
    const result = await teamService.createTeam(input, user.id);

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
    console.error('Error creating team:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create team' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/teams
 * List all teams for the authenticated user
 */
export async function GET() {
  try {
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
    const result = await teamService.getUserTeams(user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      teams: result.data,
    });
  } catch (error) {
    console.error('Error listing teams:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list teams' },
      { status: 500 }
    );
  }
}
