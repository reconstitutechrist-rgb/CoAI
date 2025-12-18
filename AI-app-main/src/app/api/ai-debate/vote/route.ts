/**
 * AI Debate Message Voting Route
 *
 * Allows users to upvote or downvote individual debate messages.
 * Tracks vote counts and prevents duplicate voting.
 *
 * POST /api/ai-debate/vote - Cast or update a vote
 * GET /api/ai-debate/vote?messageId=xxx - Get votes for a message
 */

import { NextRequest, NextResponse } from "next/server";
import type { DebateMessageVotes } from "@/types/aiCollaboration";

// In-memory storage for votes (replace with database in production)
const messageVotes: Map<
  string,
  { upvotes: Set<string>; downvotes: Set<string> }
> = new Map();

// Vercel serverless function config
export const maxDuration = 10;
export const dynamic = "force-dynamic";

// ============================================================================
// TYPES
// ============================================================================

interface VoteRequest {
  messageId: string;
  vote: "up" | "down" | "none"; // 'none' to remove vote
  userId?: string;
}

// ============================================================================
// POST - Cast or update a vote
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as VoteRequest;

    // Validate required fields
    if (!body.messageId) {
      return NextResponse.json(
        { error: "messageId is required" },
        { status: 400 }
      );
    }

    if (!body.vote || !["up", "down", "none"].includes(body.vote)) {
      return NextResponse.json(
        { error: "vote must be 'up', 'down', or 'none'" },
        { status: 400 }
      );
    }

    // In production, get userId from auth
    const userId = body.userId || "anonymous";

    // Get or create vote record for this message
    let votes = messageVotes.get(body.messageId);
    if (!votes) {
      votes = { upvotes: new Set(), downvotes: new Set() };
      messageVotes.set(body.messageId, votes);
    }

    // Remove any existing vote from this user
    votes.upvotes.delete(userId);
    votes.downvotes.delete(userId);

    // Add new vote if not 'none'
    if (body.vote === "up") {
      votes.upvotes.add(userId);
    } else if (body.vote === "down") {
      votes.downvotes.add(userId);
    }

    // Build response
    const voteData: DebateMessageVotes = {
      upvotes: votes.upvotes.size,
      downvotes: votes.downvotes.size,
      voters: [...votes.upvotes, ...votes.downvotes],
      userVote: votes.upvotes.has(userId)
        ? "up"
        : votes.downvotes.has(userId)
        ? "down"
        : undefined,
    };

    return NextResponse.json({
      success: true,
      messageId: body.messageId,
      votes: voteData,
    });
  } catch (error) {
    console.error("[Vote API] Error:", error);
    return NextResponse.json(
      { error: "Failed to process vote" },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - Get votes for a message
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get("messageId");
    const userId = searchParams.get("userId") || "anonymous";

    if (!messageId) {
      return NextResponse.json(
        { error: "messageId is required" },
        { status: 400 }
      );
    }

    const votes = messageVotes.get(messageId);

    if (!votes) {
      // No votes yet
      return NextResponse.json({
        messageId,
        votes: {
          upvotes: 0,
          downvotes: 0,
          voters: [],
          userVote: undefined,
        } as DebateMessageVotes,
      });
    }

    const voteData: DebateMessageVotes = {
      upvotes: votes.upvotes.size,
      downvotes: votes.downvotes.size,
      voters: [...votes.upvotes, ...votes.downvotes],
      userVote: votes.upvotes.has(userId)
        ? "up"
        : votes.downvotes.has(userId)
        ? "down"
        : undefined,
    };

    return NextResponse.json({
      messageId,
      votes: voteData,
    });
  } catch (error) {
    console.error("[Vote API] Error:", error);
    return NextResponse.json(
      { error: "Failed to get votes" },
      { status: 500 }
    );
  }
}

// ============================================================================
// EXPORTED HELPERS
// ============================================================================

/**
 * Get vote counts for multiple messages at once
 */
export function getVotesForMessages(
  messageIds: string[],
  userId?: string
): Record<string, DebateMessageVotes> {
  const result: Record<string, DebateMessageVotes> = {};

  for (const messageId of messageIds) {
    const votes = messageVotes.get(messageId);
    if (votes) {
      result[messageId] = {
        upvotes: votes.upvotes.size,
        downvotes: votes.downvotes.size,
        voters: [...votes.upvotes, ...votes.downvotes],
        userVote: userId
          ? votes.upvotes.has(userId)
            ? "up"
            : votes.downvotes.has(userId)
            ? "down"
            : undefined
          : undefined,
      };
    } else {
      result[messageId] = {
        upvotes: 0,
        downvotes: 0,
        voters: [],
        userVote: undefined,
      };
    }
  }

  return result;
}

/**
 * Clear votes for a session (called when debate is deleted)
 */
export function clearVotesForSession(messageIds: string[]): void {
  for (const messageId of messageIds) {
    messageVotes.delete(messageId);
  }
}
