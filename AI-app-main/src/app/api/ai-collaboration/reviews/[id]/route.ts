/**
 * AI Review Single Item API Route
 *
 * POST /api/ai-collaboration/reviews/[id] - Submit response, apply, or withdraw
 * DELETE /api/ai-collaboration/reviews/[id] - Withdraw review
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { AICollaborationService } from '@/services/AICollaborationService';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/ai-collaboration/reviews/[id]
 * Handles respond and apply actions
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id: reviewId } = await params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const action = body.action;

    if (!action) {
      return NextResponse.json(
        { error: 'action is required (respond or apply)' },
        { status: 400 }
      );
    }

    const service = new AICollaborationService(supabase);
    let result;

    switch (action) {
      case 'respond':
        if (!body.decision) {
          return NextResponse.json(
            { error: 'decision is required (approve, reject, or request_changes)' },
            { status: 400 }
          );
        }
        result = await service.submitReviewResponse(reviewId, user.id, {
          decision: body.decision,
          comments: body.comments,
          suggestedChanges: body.suggestedChanges,
        });
        break;

      case 'apply':
        result = await service.applyReviewChanges(reviewId, user.id);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be respond or apply' },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, review: result.data });
  } catch (error) {
    console.error('Error processing review action:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process review action' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ai-collaboration/reviews/[id]
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id: reviewId } = await params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = new AICollaborationService(supabase);
    const result = await service.withdrawReviewRequest(reviewId, user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error withdrawing review:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to withdraw review' },
      { status: 500 }
    );
  }
}
