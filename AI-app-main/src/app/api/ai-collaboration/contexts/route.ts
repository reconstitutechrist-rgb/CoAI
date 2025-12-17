/**
 * AI Context API Routes
 *
 * GET /api/ai-collaboration/contexts - List contexts
 * POST /api/ai-collaboration/contexts - Create context
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { AICollaborationService } from '@/services/AICollaborationService';

/**
 * GET /api/ai-collaboration/contexts
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
    const appId = searchParams.get('appId') || undefined;

    if (!teamId) {
      return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
    }

    const service = new AICollaborationService(supabase);
    const result = await service.getContexts(teamId, { appId });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, contexts: result.data });
  } catch (error) {
    console.error('Error fetching contexts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch contexts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai-collaboration/contexts
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.teamId || !body.name || !body.contextText) {
      return NextResponse.json(
        { error: 'teamId, name, and contextText are required' },
        { status: 400 }
      );
    }

    const service = new AICollaborationService(supabase);
    const result = await service.createContext(body.teamId, user.id, {
      name: body.name,
      contextText: body.contextText,
      contextType: body.contextType || 'custom',
      appId: body.appId,
      phaseId: body.phaseId,
      priority: body.priority || 50,
      isActive: body.isActive !== false,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, context: result.data });
  } catch (error) {
    console.error('Error creating context:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create context' },
      { status: 500 }
    );
  }
}
