/**
 * AI Decision Single Item API Route
 *
 * DELETE /api/ai-collaboration/decisions/[id] - Withdraw decision
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { AICollaborationService } from '@/services/AICollaborationService';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/ai-collaboration/decisions/[id]
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id: decisionId } = await params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = new AICollaborationService(supabase);
    const result = await service.withdrawDecision(decisionId, user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error withdrawing decision:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to withdraw decision' },
      { status: 500 }
    );
  }
}
