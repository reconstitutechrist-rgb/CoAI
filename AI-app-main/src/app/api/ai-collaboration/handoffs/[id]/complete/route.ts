/**
 * AI Handoff Complete API Route
 *
 * POST /api/ai-collaboration/handoffs/[id]/complete - Mark handoff as completed
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { AICollaborationService } from '@/services/AICollaborationService';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/ai-collaboration/handoffs/[id]/complete
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id: handoffId } = await params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = new AICollaborationService(supabase);
    const result = await service.completeHandoff(handoffId, user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, handoff: result.data });
  } catch (error) {
    console.error('Error completing handoff:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to complete handoff' },
      { status: 500 }
    );
  }
}
