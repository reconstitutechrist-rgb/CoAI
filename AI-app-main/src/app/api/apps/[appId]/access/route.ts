/**
 * App Access API Routes
 *
 * GET /api/apps/[appId]/access - Get access settings
 * PATCH /api/apps/[appId]/access - Update access settings
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { AppAccessService } from '@/services/AppAccessService';
import type { UpdateAccessInput } from '@/types/collaboration';

interface RouteParams {
  params: Promise<{ appId: string }>;
}

/**
 * GET /api/apps/[appId]/access
 * Get access settings for an app
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

    // Check if user has permission to view access settings
    const permResult = await accessService.getUserPermission(appId, user.id);
    if (!permResult.success || !permResult.data) {
      return NextResponse.json(
        { error: 'App not found or access denied' },
        { status: 404 }
      );
    }

    // Only admin/owner can view full access settings
    if (permResult.data !== 'admin' && permResult.data !== 'owner') {
      return NextResponse.json({
        success: true,
        access: {
          visibility: 'private',
          userPermission: permResult.data,
        },
      });
    }

    const result = await accessService.getAccessSettings(appId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      access: result.data,
      userPermission: permResult.data,
    });
  } catch (error) {
    console.error('Error getting access settings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get access settings' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/apps/[appId]/access
 * Update access settings (requires admin/owner)
 */
export async function PATCH(request: Request, { params }: RouteParams) {
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

    // Check if user has permission to update access settings
    const permResult = await accessService.getUserPermission(appId, user.id);
    if (!permResult.success || !permResult.data) {
      return NextResponse.json(
        { error: 'App not found or access denied' },
        { status: 404 }
      );
    }

    if (permResult.data !== 'admin' && permResult.data !== 'owner') {
      return NextResponse.json(
        { error: 'Only admins and owners can update access settings' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const input: UpdateAccessInput = {
      visibility: body.visibility,
      teamId: body.teamId,
      sharePermission: body.sharePermission,
    };

    const result = await accessService.updateAccessSettings(appId, input);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      access: result.data,
    });
  } catch (error) {
    console.error('Error updating access settings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update access settings' },
      { status: 500 }
    );
  }
}
