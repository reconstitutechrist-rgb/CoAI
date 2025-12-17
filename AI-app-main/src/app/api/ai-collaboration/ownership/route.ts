/**
 * AI Ownership API Routes
 *
 * GET /api/ai-collaboration/ownership - List feature ownerships
 * POST /api/ai-collaboration/ownership - Assign owner
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { AICollaborationService } from '@/services/AICollaborationService';

/**
 * GET /api/ai-collaboration/ownership
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const appId = searchParams.get('appId');
    const userId = searchParams.get('userId');

    const service = new AICollaborationService(supabase);
    let result;

    if (userId) {
      result = await service.getOwnedFeatures(userId);
    } else if (appId) {
      result = await service.getFeatureOwnerships(appId);
    } else {
      return NextResponse.json(
        { error: 'Either appId or userId is required' },
        { status: 400 }
      );
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, ownerships: result.data });
  } catch (error) {
    console.error('Error fetching ownerships:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch ownerships' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai-collaboration/ownership
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.appId || !body.featureName || !body.ownerId) {
      return NextResponse.json(
        { error: 'appId, featureName, and ownerId are required' },
        { status: 400 }
      );
    }

    const service = new AICollaborationService(supabase);
    const result = await service.assignFeatureOwner(user.id, {
      appId: body.appId,
      teamId: body.teamId,
      featureName: body.featureName,
      featureDescription: body.featureDescription,
      phaseNumber: body.phaseNumber,
      ownerId: body.ownerId,
      responsibilities: body.responsibilities,
      requiresOwnerApproval: body.requiresOwnerApproval,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, ownership: result.data });
  } catch (error) {
    console.error('Error assigning ownership:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to assign ownership' },
      { status: 500 }
    );
  }
}
