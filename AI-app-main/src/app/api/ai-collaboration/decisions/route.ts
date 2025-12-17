/**
 * AI Decisions API Routes
 *
 * GET /api/ai-collaboration/decisions - List decisions
 * POST /api/ai-collaboration/decisions - Create decision
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { AICollaborationService } from '@/services/AICollaborationService';

/**
 * GET /api/ai-collaboration/decisions
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId') || undefined;
    const appId = searchParams.get('appId') || undefined;
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const service = new AICollaborationService(supabase);
    const result = await service.getDecisions({ teamId, appId, status, limit });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, decisions: result.data });
  } catch (error) {
    console.error('Error fetching decisions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch decisions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai-collaboration/decisions
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.title || !body.appId) {
      return NextResponse.json(
        { error: 'title and appId are required' },
        { status: 400 }
      );
    }

    const service = new AICollaborationService(supabase);
    const result = await service.createDecision(user.id, {
      appId: body.appId,
      teamId: body.teamId,
      title: body.title,
      description: body.description,
      aiSuggestion: body.aiSuggestion,
      aiReasoning: body.aiReasoning,
      aiAlternatives: body.aiAlternatives,
      votingType: body.votingType || 'majority',
      requiredVotes: body.requiredVotes || 1,
      expiresAt: body.expiresAt,
      phaseId: body.phaseId,
      featureName: body.featureName,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, decision: result.data });
  } catch (error) {
    console.error('Error creating decision:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create decision' },
      { status: 500 }
    );
  }
}
