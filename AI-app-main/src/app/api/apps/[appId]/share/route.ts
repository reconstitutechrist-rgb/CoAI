/**
 * App Share Link API Routes
 *
 * POST /api/apps/[appId]/share - Generate a share link
 * DELETE /api/apps/[appId]/share - Revoke existing share link
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { AppAccessService } from '@/services/AppAccessService';
import type { Permission } from '@/types/collaboration';

interface RouteParams {
  params: Promise<{ appId: string }>;
}

/**
 * POST /api/apps/[appId]/share
 * Generate a new share link
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

    // Check if user has permission to create share links
    const permResult = await accessService.getUserPermission(appId, user.id);
    if (!permResult.success || !permResult.data) {
      return NextResponse.json(
        { error: 'App not found or access denied' },
        { status: 404 }
      );
    }

    if (permResult.data !== 'admin' && permResult.data !== 'owner') {
      return NextResponse.json(
        { error: 'Only admins and owners can create share links' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const permission: 'view' | 'edit' = body.permission || 'view';
    const expiresInDays: number | undefined = body.expiresInDays;

    // Convert days to hours for the service
    const expiresInHours = expiresInDays ? expiresInDays * 24 : undefined;

    const result = await accessService.createShareLink(appId, {
      permission,
      expiresInHours,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      shareToken: result.data.token,
      shareUrl: result.data.url,
      permission: result.data.permission,
      expiresAt: result.data.expiresAt,
    });
  } catch (error) {
    console.error('Error creating share link:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create share link' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/apps/[appId]/share
 * Revoke the current share link
 */
export async function DELETE(request: Request, { params }: RouteParams) {
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

    // Check if user has permission to revoke share links
    const permResult = await accessService.getUserPermission(appId, user.id);
    if (!permResult.success || !permResult.data) {
      return NextResponse.json(
        { error: 'App not found or access denied' },
        { status: 404 }
      );
    }

    if (permResult.data !== 'admin' && permResult.data !== 'owner') {
      return NextResponse.json(
        { error: 'Only admins and owners can revoke share links' },
        { status: 403 }
      );
    }

    const result = await accessService.revokeShareLink(appId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Share link has been revoked',
    });
  } catch (error) {
    console.error('Error revoking share link:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to revoke share link' },
      { status: 500 }
    );
  }
}
