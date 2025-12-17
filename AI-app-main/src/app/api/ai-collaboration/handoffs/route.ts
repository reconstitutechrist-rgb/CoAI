/**
 * AI Handoffs API Routes
 *
 * GET /api/ai-collaboration/handoffs - List pending handoffs
 * POST /api/ai-collaboration/handoffs - Create handoff
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { AICollaborationService } from '@/services/AICollaborationService';

/**
 * GET /api/ai-collaboration/handoffs
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = new AICollaborationService(supabase);
    const result = await service.getPendingHandoffs(user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, handoffs: result.data });
  } catch (error) {
    console.error('Error fetching handoffs:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch handoffs' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai-collaboration/handoffs
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.appId || !body.toUserId) {
      return NextResponse.json(
        { error: 'appId and toUserId are required' },
        { status: 400 }
      );
    }

    const service = new AICollaborationService(supabase);
    const result = await service.createHandoff(user.id, {
      appId: body.appId,
      teamId: body.teamId,
      toUserId: body.toUserId,
      conversationSnapshot: body.conversationSnapshot || {},
      currentMode: body.currentMode || 'plan',
      currentPhase: body.currentPhase,
      handoffNotes: body.handoffNotes,
      urgency: body.urgency || 'normal',
      suggestedActions: body.suggestedActions,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, handoff: result.data });
  } catch (error) {
    console.error('Error creating handoff:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create handoff' },
      { status: 500 }
    );
  }
}
