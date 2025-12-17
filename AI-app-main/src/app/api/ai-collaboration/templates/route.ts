/**
 * AI Templates API Routes
 *
 * GET /api/ai-collaboration/templates - List templates
 * POST /api/ai-collaboration/templates - Create template
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { AICollaborationService } from '@/services/AICollaborationService';

/**
 * GET /api/ai-collaboration/templates
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const category = searchParams.get('category') || undefined;
    const includePublic = searchParams.get('includePublic') === 'true';

    if (!teamId) {
      return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
    }

    const service = new AICollaborationService(supabase);
    const result = await service.getPromptTemplates(teamId, { category, includePublic });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, templates: result.data });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai-collaboration/templates
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.teamId || !body.name || !body.templateText) {
      return NextResponse.json(
        { error: 'teamId, name, and templateText are required' },
        { status: 400 }
      );
    }

    const service = new AICollaborationService(supabase);
    const result = await service.createPromptTemplate(body.teamId, user.id, {
      name: body.name,
      description: body.description,
      templateText: body.templateText,
      category: body.category || 'general',
      variables: body.variables,
      isPublic: body.isPublic || false,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, template: result.data });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create template' },
      { status: 500 }
    );
  }
}
