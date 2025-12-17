/**
 * AI Context Single Item API Route
 *
 * PATCH /api/ai-collaboration/contexts/[id] - Update context
 * DELETE /api/ai-collaboration/contexts/[id] - Delete context
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { AICollaborationService } from '@/services/AICollaborationService';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/ai-collaboration/contexts/[id]
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id: contextId } = await params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const service = new AICollaborationService(supabase);
    const result = await service.updateContext(contextId, user.id, {
      name: body.name,
      contextText: body.contextText,
      priority: body.priority,
      isActive: body.isActive,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, context: result.data });
  } catch (error) {
    console.error('Error updating context:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update context' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ai-collaboration/contexts/[id]
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id: contextId } = await params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = new AICollaborationService(supabase);
    const result = await service.deleteContext(contextId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting context:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete context' },
      { status: 500 }
    );
  }
}
