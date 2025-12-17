/**
 * App Collaborator Detail API Routes
 *
 * PATCH /api/apps/[appId]/collaborators/[collaboratorId] - Update collaborator permission
 * DELETE /api/apps/[appId]/collaborators/[collaboratorId] - Remove collaborator
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { AppAccessService } from '@/services/AppAccessService';
import type { Permission } from '@/types/collaboration';

interface RouteParams {
  params: Promise<{ appId: string; collaboratorId: string }>;
}

/**
 * PATCH /api/apps/[appId]/collaborators/[collaboratorId]
 * Update a collaborator's permission
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { appId, collaboratorId } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const accessService = new AppAccessService(supabase);

    // Check if user has permission to update collaborators
    const permResult = await accessService.getUserPermission(appId, user.id);
    if (!permResult.success || !permResult.data) {
      return NextResponse.json(
        { error: 'App not found or access denied' },
        { status: 404 }
      );
    }

    if (permResult.data !== 'admin' && permResult.data !== 'owner') {
      return NextResponse.json(
        { error: 'Only admins and owners can update collaborators' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { permission } = body as { permission: Permission };

    if (!permission) {
      return NextResponse.json(
        { error: 'Permission is required' },
        { status: 400 }
      );
    }

    // Can't set owner permission
    if (permission === 'owner') {
      return NextResponse.json(
        { error: 'Cannot set owner permission' },
        { status: 400 }
      );
    }

    // Only owner can set admin permission
    if (permission === 'admin' && permResult.data !== 'owner') {
      return NextResponse.json(
        { error: 'Only the owner can grant admin permission' },
        { status: 403 }
      );
    }

    const result = await accessService.updateCollaboratorPermission(collaboratorId, permission);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      collaborator: result.data,
    });
  } catch (error) {
    console.error('Error updating collaborator:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update collaborator' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/apps/[appId]/collaborators/[collaboratorId]
 * Remove a collaborator from the app
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { appId, collaboratorId } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const accessService = new AppAccessService(supabase);

    // Check if user has permission to remove collaborators
    const permResult = await accessService.getUserPermission(appId, user.id);
    if (!permResult.success || !permResult.data) {
      return NextResponse.json(
        { error: 'App not found or access denied' },
        { status: 404 }
      );
    }

    // Get the collaborator to check if it's self-removal
    const collabResult = await accessService.getCollaboratorById(collaboratorId);
    if (!collabResult.success || !collabResult.data) {
      return NextResponse.json(
        { error: 'Collaborator not found' },
        { status: 404 }
      );
    }

    const isSelf = collabResult.data.userId === user.id;
    const isAdminOrOwner = permResult.data === 'owner' || permResult.data === 'admin';

    // Allow self-removal or admin/owner removal
    if (!isSelf && !isAdminOrOwner) {
      return NextResponse.json(
        { error: 'You can only remove yourself or be an admin/owner to remove others' },
        { status: 403 }
      );
    }

    // Admins can't remove other admins (only owner can)
    if (collabResult.data.permission === 'admin' && permResult.data !== 'owner' && !isSelf) {
      return NextResponse.json(
        { error: 'Only the owner can remove admins' },
        { status: 403 }
      );
    }

    const result = await accessService.removeCollaborator(collaboratorId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: isSelf ? 'You have been removed from the app' : 'Collaborator removed successfully',
    });
  } catch (error) {
    console.error('Error removing collaborator:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove collaborator' },
      { status: 500 }
    );
  }
}
