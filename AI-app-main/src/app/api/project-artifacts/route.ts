/**
 * Project Artifacts API Routes
 *
 * GET /api/project-artifacts - List artifacts for a team
 * POST /api/project-artifacts - Create a new artifact
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ProjectArtifactService } from '@/services/ProjectArtifactService';
import type { ArtifactType, ArtifactStatus } from '@/types/projectArtifacts';

/**
 * GET /api/project-artifacts
 * List artifacts for a team with optional filters
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    if (!teamId) {
      return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
    }

    const service = new ProjectArtifactService(supabase);

    // Check permission
    const hasAccess = await service.checkPermission(user.id, teamId, 'view');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const result = await service.list({
      teamId,
      artifactType: (searchParams.get('type') as ArtifactType) || undefined,
      status: (searchParams.get('status') as ArtifactStatus) || undefined,
      createdBy: searchParams.get('createdBy') || undefined,
      search: searchParams.get('search') || undefined,
      limit: parseInt(searchParams.get('limit') || '20', 10),
      offset: parseInt(searchParams.get('offset') || '0', 10),
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      artifacts: result.data.artifacts,
      total: result.data.total,
      hasMore: result.data.hasMore,
    });
  } catch (error) {
    console.error('Error fetching artifacts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch artifacts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/project-artifacts
 * Create a new artifact
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.teamId || !body.name || !body.artifactType || !body.content) {
      return NextResponse.json(
        { error: 'teamId, name, artifactType, and content are required' },
        { status: 400 }
      );
    }

    const service = new ProjectArtifactService(supabase);

    // Check permission
    const hasAccess = await service.checkPermission(user.id, body.teamId, 'create');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const result = await service.create(user.id, {
      teamId: body.teamId,
      name: body.name,
      description: body.description,
      artifactType: body.artifactType,
      status: body.status,
      debateSessionId: body.debateSessionId,
      appId: body.appId,
      content: body.content,
      previewUrl: body.previewUrl,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, artifact: result.data });
  } catch (error) {
    console.error('Error creating artifact:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create artifact' },
      { status: 500 }
    );
  }
}
