/**
 * Single Project Artifact API Routes
 *
 * GET /api/project-artifacts/[artifactId] - Get a single artifact
 * PATCH /api/project-artifacts/[artifactId] - Update an artifact
 * DELETE /api/project-artifacts/[artifactId] - Delete an artifact
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ProjectArtifactService } from '@/services/ProjectArtifactService';

interface RouteParams {
  params: Promise<{ artifactId: string }>;
}

/**
 * GET /api/project-artifacts/[artifactId]
 * Get a single artifact by ID
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { artifactId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = new ProjectArtifactService(supabase);
    const result = await service.getById(artifactId);

    if (!result.success) {
      const status = result.error?.code === 'NOT_FOUND' ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    // Check permission
    const hasAccess = await service.checkPermission(user.id, result.data.teamId, 'view');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Add canEdit flag for the UI
    const canEdit = await service.canEditArtifact(user.id, result.data);

    return NextResponse.json({
      success: true,
      artifact: result.data,
      canEdit,
    });
  } catch (error) {
    console.error('Error fetching artifact:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch artifact' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/project-artifacts/[artifactId]
 * Update an artifact
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { artifactId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const service = new ProjectArtifactService(supabase);

    // Get the artifact first to check permissions
    const existing = await service.getById(artifactId);
    if (!existing.success) {
      const status = existing.error?.code === 'NOT_FOUND' ? 404 : 400;
      return NextResponse.json({ error: existing.error }, { status });
    }

    // Check if user can edit this artifact
    const canEdit = await service.canEditArtifact(user.id, existing.data);
    if (!canEdit) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const result = await service.update(artifactId, user.id, {
      name: body.name,
      description: body.description,
      status: body.status,
      content: body.content,
      previewUrl: body.previewUrl,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, artifact: result.data });
  } catch (error) {
    console.error('Error updating artifact:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update artifact' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/project-artifacts/[artifactId]
 * Delete an artifact
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { artifactId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = new ProjectArtifactService(supabase);

    // Get the artifact first to check permissions
    const existing = await service.getById(artifactId);
    if (!existing.success) {
      const status = existing.error?.code === 'NOT_FOUND' ? 404 : 400;
      return NextResponse.json({ error: existing.error }, { status });
    }

    // Check if user can edit (and therefore delete) this artifact
    const canEdit = await service.canEditArtifact(user.id, existing.data);
    if (!canEdit) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const result = await service.delete(artifactId, user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting artifact:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete artifact' },
      { status: 500 }
    );
  }
}
