/**
 * AI Debate Interjection Route
 *
 * Allows users to inject comments, steering, or challenges into an active debate.
 * Interjections are queued and acknowledged by the AI models in subsequent turns.
 *
 * POST /api/ai-debate/interject
 */

import { NextRequest, NextResponse } from "next/server";
import type {
  CreateInterjectionInput,
  DebateInterjection,
  InterjectionType,
} from "@/types/aiCollaboration";

// In-memory storage for interjections (replace with database in production)
const activeInterjections: Map<string, DebateInterjection[]> = new Map();

// Vercel serverless function config
export const maxDuration = 30;
export const dynamic = "force-dynamic";

// ============================================================================
// HELPERS
// ============================================================================

function generateId(): string {
  return `interject_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function validateInterjectionType(type: string): type is InterjectionType {
  return ["comment", "steer", "challenge", "clarify"].includes(type);
}

// ============================================================================
// POST - Create Interjection
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateInterjectionInput;

    // Validate required fields
    if (!body.sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    if (!body.content || body.content.trim().length === 0) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }

    if (body.interjectionType && !validateInterjectionType(body.interjectionType)) {
      return NextResponse.json(
        { error: "Invalid interjectionType. Must be: comment, steer, challenge, or clarify" },
        { status: 400 }
      );
    }

    // Create interjection object
    const interjection: DebateInterjection = {
      id: generateId(),
      sessionId: body.sessionId,
      userId: "user", // In production, get from auth
      content: body.content.trim(),
      interjectionType: body.interjectionType || "comment",
      targetMessageId: body.targetMessageId,
      acknowledgedBy: [],
      afterTurn: 0, // Will be set by the stream handler
      timestamp: new Date().toISOString(),
    };

    // Store interjection
    const sessionInterjections = activeInterjections.get(body.sessionId) || [];
    sessionInterjections.push(interjection);
    activeInterjections.set(body.sessionId, sessionInterjections);

    return NextResponse.json({
      success: true,
      interjection,
    });
  } catch (error) {
    console.error("[Interject API] Error:", error);
    return NextResponse.json(
      { error: "Failed to create interjection" },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - Get pending interjections for a session
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    const interjections = activeInterjections.get(sessionId) || [];
    const pending = interjections.filter(
      (i) => i.acknowledgedBy.length === 0
    );

    return NextResponse.json({
      sessionId,
      interjections: pending,
      total: interjections.length,
      pending: pending.length,
    });
  } catch (error) {
    console.error("[Interject API] Error:", error);
    return NextResponse.json(
      { error: "Failed to get interjections" },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Clear interjections for a session
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    activeInterjections.delete(sessionId);

    return NextResponse.json({
      success: true,
      message: `Interjections cleared for session ${sessionId}`,
    });
  } catch (error) {
    console.error("[Interject API] Error:", error);
    return NextResponse.json(
      { error: "Failed to clear interjections" },
      { status: 500 }
    );
  }
}

// ============================================================================
// EXPORTED HELPERS (for use by stream route)
// ============================================================================

/**
 * Get pending interjections for a session
 */
export function getPendingInterjections(sessionId: string): DebateInterjection[] {
  const interjections = activeInterjections.get(sessionId) || [];
  return interjections.filter((i) => i.acknowledgedBy.length < 2); // Not acknowledged by both models
}

/**
 * Mark an interjection as acknowledged by a model
 */
export function acknowledgeInterjection(
  sessionId: string,
  interjectionId: string,
  modelId: string
): void {
  const interjections = activeInterjections.get(sessionId);
  if (!interjections) return;

  const interjection = interjections.find((i) => i.id === interjectionId);
  if (interjection && !interjection.acknowledgedBy.includes(modelId as any)) {
    interjection.acknowledgedBy.push(modelId as any);
  }
}

/**
 * Build context string for pending interjections
 */
export function buildInterjectionContext(interjections: DebateInterjection[]): string {
  if (interjections.length === 0) return "";

  const typeLabels: Record<InterjectionType, string> = {
    comment: "User Comment",
    steer: "User Direction",
    challenge: "User Challenge",
    clarify: "Clarification Request",
  };

  const items = interjections.map((i) => {
    const label = typeLabels[i.interjectionType];
    const target = i.targetMessageId ? ` (re: previous message)` : "";
    return `**${label}${target}:** ${i.content}`;
  });

  return `
---
## User Interjection${interjections.length > 1 ? "s" : ""}

${items.join("\n\n")}

Please acknowledge and address the user's input in your response.
---
`;
}
