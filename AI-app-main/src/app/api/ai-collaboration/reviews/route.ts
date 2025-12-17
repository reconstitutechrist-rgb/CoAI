/**
 * AI Reviews API Routes
 *
 * GET /api/ai-collaboration/reviews - List reviews
 * POST /api/ai-collaboration/reviews - Create review
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { AICollaborationService } from '@/services/AICollaborationService';

/**
 * GET /api/ai-collaboration/reviews
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const appId = searchParams.get('appId') || undefined;
    const reviewerId = searchParams.get('reviewerId') || undefined;
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const service = new AICollaborationService(supabase);
    const result = await service.getReviews({ appId, reviewerId, status, limit });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, reviews: result.data });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai-collaboration/reviews
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.appId || !body.title || !body.reviewType) {
      return NextResponse.json(
        { error: 'appId, title, and reviewType are required' },
        { status: 400 }
      );
    }

    const service = new AICollaborationService(supabase);
    const result = await service.createReviewRequest(user.id, {
      appId: body.appId,
      teamId: body.teamId,
      title: body.title,
      description: body.description,
      reviewType: body.reviewType,
      aiOutput: body.aiOutput,
      aiPrompt: body.aiPrompt,
      aiReasoning: body.aiReasoning,
      mode: body.mode || 'plan',
      phaseNumber: body.phaseNumber,
      relatedFeatures: body.relatedFeatures,
      filesToAdd: body.filesToAdd,
      filesToModify: body.filesToModify,
      filesToDelete: body.filesToDelete,
      assignedReviewers: body.assignedReviewers,
      requiredApprovals: body.requiredApprovals || 1,
      autoAssignFeatureOwners: body.autoAssignFeatureOwners,
      expiresInHours: body.expiresInHours,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, review: result.data });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create review' },
      { status: 500 }
    );
  }
}
