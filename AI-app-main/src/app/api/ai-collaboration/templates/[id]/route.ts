/**
 * AI Template Single Item API Route
 *
 * PATCH /api/ai-collaboration/templates/[id] - Update template
 * DELETE /api/ai-collaboration/templates/[id] - Delete template
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { AICollaborationService } from '@/services/AICollaborationService';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/ai-collaboration/templates/[id]
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id: templateId } = await params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const service = new AICollaborationService(supabase);
    const result = await service.updatePromptTemplate(templateId, {
      name: body.name,
      description: body.description,
      templateText: body.templateText,
      category: body.category,
      variables: body.variables,
      isPublic: body.isPublic,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, template: result.data });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update template' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ai-collaboration/templates/[id]
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id: templateId } = await params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = new AICollaborationService(supabase);
    const result = await service.deletePromptTemplate(templateId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete template' },
      { status: 500 }
    );
  }
}
