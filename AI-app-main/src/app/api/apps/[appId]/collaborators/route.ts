/**
 * App Collaborators API Routes
 *
 * GET /api/apps/[appId]/collaborators - List collaborators
 * POST /api/apps/[appId]/collaborators - Add a collaborator
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { AppAccessService } from '@/services/AppAccessService';
import type { Permission } from '@/types/collaboration';

interface RouteParams {
  params: Promise<{ appId: string }>;
}

/**
 * GET /api/apps/[appId]/collaborators
 * List all collaborators for an app
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { appId } = await params;
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

    // Check if user has permission to view collaborators
    const permResult = await accessService.getUserPermission(appId, user.id);
    if (!permResult.success || !permResult.data) {
      return NextResponse.json(
        { error: 'App not found or access denied' },
        { status: 404 }
      );
    }

    const result = await accessService.getCollaborators(appId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      collaborators: result.data,
    });
  } catch (error) {
    console.error('Error listing collaborators:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list collaborators' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/apps/[appId]/collaborators
 * Add a collaborator to the app (by user ID or email)
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { appId } = await params;
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

    // Check if user has permission to add collaborators
    const permResult = await accessService.getUserPermission(appId, user.id);
    if (!permResult.success || !permResult.data) {
      return NextResponse.json(
        { error: 'App not found or access denied' },
        { status: 404 }
      );
    }

    if (permResult.data !== 'admin' && permResult.data !== 'owner') {
      return NextResponse.json(
        { error: 'Only admins and owners can add collaborators' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, email, permission = 'view' } = body as {
      userId?: string;
      email?: string;
      permission?: Permission;
    };

    if (!userId && !email) {
      return NextResponse.json(
        { error: 'Either userId or email is required' },
        { status: 400 }
      );
    }

    // Can't add with owner permission
    if (permission === 'owner') {
      return NextResponse.json(
        { error: 'Cannot add collaborator with owner permission' },
        { status: 400 }
      );
    }

    let result;
    if (userId) {
      result = await accessService.addCollaborator(appId, userId, permission, user.id);
    } else if (email) {
      result = await accessService.addCollaboratorByEmail(appId, email, permission, user.id);
    }

    if (!result?.success) {
      return NextResponse.json(
        { error: result?.error || 'Failed to add collaborator' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      collaborator: result.data,
    });
  } catch (error) {
    console.error('Error adding collaborator:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add collaborator' },
      { status: 500 }
    );
  }
}
