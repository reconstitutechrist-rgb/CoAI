/**
 * AI Planning Session Single Item API Route
 *
 * POST /api/ai-collaboration/planning/[id]/suggest - Add suggestion
 * POST /api/ai-collaboration/planning/[id]/vote - Vote on suggestion
 * POST /api/ai-collaboration/planning/[id]/finalize - Finalize session
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { AICollaborationService } from '@/services/AICollaborationService';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/ai-collaboration/planning/[id]
 * Handles suggest, vote, approve, reject, and finalize actions
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id: sessionId } = await params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const action = body.action;

    if (!action) {
      return NextResponse.json(
        { error: 'action is required (suggest, vote, approve, reject, finalize)' },
        { status: 400 }
      );
    }

    const service = new AICollaborationService(supabase);
    let result;

    switch (action) {
      case 'suggest':
        result = await service.addPhaseSuggestion(sessionId, user.id, {
          phaseName: body.phaseName,
          phaseDescription: body.phaseDescription,
          features: body.features,
          dependencies: body.dependencies,
          estimatedComplexity: body.estimatedComplexity,
          insertAtPosition: body.insertAtPosition,
        });
        break;

      case 'vote':
        result = await service.votePlanningSession(sessionId, user.id, {
          suggestionId: body.suggestionId,
          vote: body.vote,
          comment: body.comment,
        });
        break;

      case 'approve':
        result = await service.approvePlanningSession(sessionId, user.id);
        break;

      case 'reject':
        result = await service.rejectPlanningSession(sessionId, user.id);
        break;

      case 'finalize':
        result = await service.finalizePlanningSession(sessionId, user.id);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be suggest, vote, approve, reject, or finalize' },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, session: result.data });
  } catch (error) {
    console.error('Error processing planning action:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process planning action' },
      { status: 500 }
    );
  }
}
