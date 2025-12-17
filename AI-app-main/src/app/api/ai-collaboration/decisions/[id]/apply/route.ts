/**
 * AI Decision Apply API Route
 *
 * POST /api/ai-collaboration/decisions/[id]/apply - Apply approved decision
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { AICollaborationService } from '@/services/AICollaborationService';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/ai-collaboration/decisions/[id]/apply
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id: decisionId } = await params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const service = new AICollaborationService(supabase);
    const result = await service.applyDecision(decisionId, user.id, body.selectedOption);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, decision: result.data });
  } catch (error) {
    console.error('Error applying decision:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to apply decision' },
      { status: 500 }
    );
  }
}
