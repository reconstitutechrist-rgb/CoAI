/**
 * AI Ownership Single Item API Route
 *
 * PATCH /api/ai-collaboration/ownership/[id] - Update ownership
 * DELETE /api/ai-collaboration/ownership/[id] - Remove ownership
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { AICollaborationService } from '@/services/AICollaborationService';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/ai-collaboration/ownership/[id]
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id: ownershipId } = await params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const service = new AICollaborationService(supabase);
    const result = await service.updateFeatureOwnership(ownershipId, {
      featureDescription: body.featureDescription,
      responsibilities: body.responsibilities,
      status: body.status,
      requiresOwnerApproval: body.requiresOwnerApproval,
      ownerFeedback: body.ownerFeedback,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, ownership: result.data });
  } catch (error) {
    console.error('Error updating ownership:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update ownership' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ai-collaboration/ownership/[id]
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id: ownershipId } = await params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = new AICollaborationService(supabase);
    const result = await service.removeFeatureOwnership(ownershipId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing ownership:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove ownership' },
      { status: 500 }
    );
  }
}
