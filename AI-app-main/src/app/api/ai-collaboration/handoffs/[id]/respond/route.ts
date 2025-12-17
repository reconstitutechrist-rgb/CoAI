/**
 * AI Handoff Respond API Route
 *
 * POST /api/ai-collaboration/handoffs/[id]/respond - Accept or decline handoff
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { AICollaborationService } from '@/services/AICollaborationService';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/ai-collaboration/handoffs/[id]/respond
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id: handoffId } = await params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (body.accept === undefined) {
      return NextResponse.json(
        { error: 'accept (boolean) is required' },
        { status: 400 }
      );
    }

    const service = new AICollaborationService(supabase);
    const result = await service.respondToHandoff(handoffId, user.id, {
      accept: body.accept,
      declinedReason: body.declinedReason,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, handoff: result.data });
  } catch (error) {
    console.error('Error responding to handoff:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to respond to handoff' },
      { status: 500 }
    );
  }
}
