/**
 * AI Decision Vote API Route
 *
 * POST /api/ai-collaboration/decisions/[id]/vote - Cast vote on decision
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { AICollaborationService } from '@/services/AICollaborationService';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/ai-collaboration/decisions/[id]/vote
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

    if (!body.choice) {
      return NextResponse.json(
        { error: 'choice is required (approve, reject, or abstain)' },
        { status: 400 }
      );
    }

    const service = new AICollaborationService(supabase);
    const result = await service.castVote(decisionId, user.id, {
      choice: body.choice,
      comment: body.comment,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, decision: result.data });
  } catch (error) {
    console.error('Error casting vote:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cast vote' },
      { status: 500 }
    );
  }
}
