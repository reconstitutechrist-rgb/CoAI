/**
 * Plan Synthesis Actions API Routes
 *
 * POST /api/plan-synthesis/actions - Execute gap actions
 *
 * Actions:
 * - create-task: Create a task from a gap
 * - assign-owner: Assign a feature to a team member
 * - get-debate-prompt: Get debate prompt for a conflict
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { PlanSynthesisService } from '@/services/PlanSynthesisService';
import type { PlanConflict, FeaturePriority } from '@/types/projectIntegration';

// Vercel serverless function config
export const dynamic = 'force-dynamic';

/**
 * Check if user is a team member
 */
async function isTeamMember(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  teamId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  return !!data;
}

/**
 * Action request types
 */
interface CreateTaskAction {
  action: 'create-task';
  teamId: string;
  appId?: string;
  gapType: 'missing-feature' | 'incomplete-area';
  featureName: string;
  description: string;
  priority: FeaturePriority;
  assigneeId?: string;
  synthesisId: string;
}

interface AssignOwnerAction {
  action: 'assign-owner';
  teamId: string;
  appId: string;
  featureName: string;
  featureDescription?: string;
  ownerId: string;
  phaseNumber?: number;
}

interface GetDebatePromptAction {
  action: 'get-debate-prompt';
  conflict: PlanConflict;
}

type ActionRequest = CreateTaskAction | AssignOwnerAction | GetDebatePromptAction;

/**
 * POST /api/plan-synthesis/actions
 * Execute gap actions
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

    const body: ActionRequest = await request.json();

    if (!body.action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    const service = new PlanSynthesisService(supabase);

    switch (body.action) {
      case 'create-task': {
        const { teamId, appId, gapType, featureName, description, priority, assigneeId, synthesisId } =
          body as CreateTaskAction;

        if (!teamId || !featureName || !description || !synthesisId) {
          return NextResponse.json(
            { error: 'teamId, featureName, description, and synthesisId are required' },
            { status: 400 }
          );
        }

        // Check team membership
        const isMember = await isTeamMember(supabase, user.id, teamId);
        if (!isMember) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const result = await service.createTaskFromGap(user.id, {
          teamId,
          appId,
          gapType: gapType || 'missing-feature',
          featureName,
          description,
          priority: priority || 'should-have',
          assigneeId,
          synthesisId,
        });

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          taskId: result.data.taskId,
          message: `Task created for "${featureName}"`,
        });
      }

      case 'assign-owner': {
        const { teamId, appId, featureName, featureDescription, ownerId, phaseNumber } =
          body as AssignOwnerAction;

        if (!teamId || !appId || !featureName || !ownerId) {
          return NextResponse.json(
            { error: 'teamId, appId, featureName, and ownerId are required' },
            { status: 400 }
          );
        }

        // Check team membership
        const isMember = await isTeamMember(supabase, user.id, teamId);
        if (!isMember) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const result = await service.assignFeatureOwner(user.id, {
          teamId,
          appId,
          featureName,
          featureDescription,
          ownerId,
          phaseNumber,
        });

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          ownershipId: result.data.ownershipId,
          message: `Feature "${featureName}" assigned`,
        });
      }

      case 'get-debate-prompt': {
        const { conflict } = body as GetDebatePromptAction;

        if (!conflict) {
          return NextResponse.json({ error: 'conflict is required' }, { status: 400 });
        }

        const debatePrompt = service.getDebatePromptForConflict(conflict);

        return NextResponse.json({
          success: true,
          debatePrompt,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${(body as { action: string }).action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error executing action:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute action' },
      { status: 500 }
    );
  }
}
