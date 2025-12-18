/**
 * Plan Synthesis API Routes
 *
 * POST /api/plan-synthesis - Trigger a new plan synthesis
 * GET /api/plan-synthesis - Get the latest synthesis result
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { PlanSynthesisService } from '@/services/PlanSynthesisService';
import type { TriggerSynthesisInput } from '@/types/projectIntegration';

// Vercel serverless function config
export const maxDuration = 120; // 2 minutes for AI synthesis
export const dynamic = 'force-dynamic';

/**
 * Check if user is a team member
 */
async function isTeamMember(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  teamId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  return !!data;
}

/**
 * GET /api/plan-synthesis?teamId=xxx
 * Get the latest synthesis result for a team
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
    const isMember = await isTeamMember(supabase, user.id, teamId);
    if (!isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const service = new PlanSynthesisService(supabase);
    const result = await service.getLatestSynthesis(teamId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      synthesis: result.data,
    });
  } catch (error) {
    console.error('Error fetching synthesis:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch synthesis' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/plan-synthesis
 * Trigger a new plan synthesis
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

    const body: TriggerSynthesisInput = await request.json();

    if (!body.teamId) {
      return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
    }

    // Check if user is a team member
    const isMember = await isTeamMember(supabase, user.id, body.teamId);
    if (!isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const service = new PlanSynthesisService(supabase);

    // Check if we should use cached result
    if (!body.forceRefresh) {
      const cachedResult = await service.getLatestSynthesis(body.teamId);
      if (cachedResult.success && cachedResult.data) {
        // Check if cached result is less than 5 minutes old
        const cachedTime = new Date(cachedResult.data.synthesizedAt).getTime();
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

        if (cachedTime > fiveMinutesAgo) {
          return NextResponse.json({
            success: true,
            synthesis: cachedResult.data,
            cached: true,
          });
        }
      }
    }

    // Perform new synthesis
    const result = await service.synthesizePlan(user.id, body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      synthesis: result.data,
      cached: false,
    });
  } catch (error) {
    console.error('Error performing synthesis:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to perform synthesis' },
      { status: 500 }
    );
  }
}
