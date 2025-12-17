/**
 * AI Planning API Routes
 *
 * GET /api/ai-collaboration/planning - Get active planning session
 * POST /api/ai-collaboration/planning - Create planning session
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { AICollaborationService } from '@/services/AICollaborationService';

/**
 * GET /api/ai-collaboration/planning
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const appId = searchParams.get('appId');

    if (!appId) {
      return NextResponse.json({ error: 'appId is required' }, { status: 400 });
    }

    const service = new AICollaborationService(supabase);
    const result = await service.getPlanningSession(appId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, session: result.data });
  } catch (error) {
    console.error('Error fetching planning session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch planning session' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai-collaboration/planning
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.appId || !body.title) {
      return NextResponse.json(
        { error: 'appId and title are required' },
        { status: 400 }
      );
    }

    const service = new AICollaborationService(supabase);
    const result = await service.createPlanningSession(user.id, {
      appId: body.appId,
      teamId: body.teamId,
      title: body.title,
      description: body.description,
      aiGeneratedPhases: body.aiGeneratedPhases,
      maxPhases: body.maxPhases,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, session: result.data });
  } catch (error) {
    console.error('Error creating planning session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create planning session' },
      { status: 500 }
    );
  }
}
