/**
 * AI Debate Generate Diff Route
 *
 * Takes a consensus summary and generates actionable code diffs.
 * Uses AI to convert natural language decisions into code changes.
 *
 * POST /api/ai-debate/generate-diff
 */

import { NextRequest, NextResponse } from "next/server";
import { getProvider, type ProviderId } from "@/services/providers";
import type { MessageParam } from "@/services/providers/AIProvider";
import type { DebateConsensus } from "@/types/aiCollaboration";

// Vercel serverless function config
export const maxDuration = 120;
export const dynamic = "force-dynamic";

// ============================================================================
// TYPES
// ============================================================================

interface GenerateDiffRequest {
  sessionId: string;
  consensus: DebateConsensus;
  targetFiles?: { path: string; content: string }[];
  preferredModel?: ProviderId;
}

export interface FileDiff {
  path: string;
  type: "create" | "modify" | "delete";
  hunks: DiffHunk[];
  oldContent?: string;
  newContent?: string;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  changes: DiffChange[];
}

export interface DiffChange {
  type: "add" | "remove" | "context";
  content: string;
  lineNumber?: number;
}

interface GenerateDiffResponse {
  success: boolean;
  diffs: FileDiff[];
  explanation: string;
  implementable: boolean;
}

// ============================================================================
// PROMPT TEMPLATES
// ============================================================================

const DIFF_GENERATION_PROMPT = `You are a code generation assistant. Given a consensus summary from a discussion about code changes, generate precise, actionable code diffs.

CONSENSUS SUMMARY:
{consensus}

{fileContext}

INSTRUCTIONS:
1. Analyze the consensus and identify specific code changes needed
2. For each file that needs to change, generate a diff in unified format
3. Be precise - only change what the consensus specifies
4. Include context lines (3 lines before and after changes)
5. If creating new files, provide the complete content

OUTPUT FORMAT (JSON):
{
  "diffs": [
    {
      "path": "src/example.ts",
      "type": "modify",
      "oldContent": "// only for context",
      "newContent": "// complete new content for creates",
      "hunks": [
        {
          "oldStart": 10,
          "oldLines": 5,
          "newStart": 10,
          "newLines": 7,
          "changes": [
            {"type": "context", "content": "// existing code", "lineNumber": 10},
            {"type": "remove", "content": "old line", "lineNumber": 11},
            {"type": "add", "content": "new line", "lineNumber": 11}
          ]
        }
      ]
    }
  ],
  "explanation": "Brief explanation of the changes",
  "implementable": true
}

If the consensus doesn't contain actionable code changes, return:
{
  "diffs": [],
  "explanation": "The consensus contains discussion but no specific code changes",
  "implementable": false
}

Generate the JSON response:`;

// ============================================================================
// HELPERS
// ============================================================================

function buildFileContext(files?: { path: string; content: string }[]): string {
  if (!files?.length) {
    return "No target files provided. Generate diffs based on the consensus description.";
  }

  return `TARGET FILES TO MODIFY:
${files
  .slice(0, 5) // Limit to 5 files
  .map(
    (f) =>
      `--- ${f.path} ---
${f.content.slice(0, 3000)}
--- END ${f.path} ---`
  )
  .join("\n\n")}`;
}

function parseAIResponse(content: string): GenerateDiffResponse {
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    // Try to find JSON object
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      jsonStr = objectMatch[0];
    }

    const parsed = JSON.parse(jsonStr);

    return {
      success: true,
      diffs: parsed.diffs || [],
      explanation: parsed.explanation || "",
      implementable: parsed.implementable ?? false,
    };
  } catch (error) {
    console.error("[GenerateDiff] Failed to parse AI response:", error);
    return {
      success: false,
      diffs: [],
      explanation: "Failed to parse AI response into valid diffs",
      implementable: false,
    };
  }
}

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateDiffRequest;

    // Validate required fields
    if (!body.consensus?.summary) {
      return NextResponse.json(
        { error: "consensus with summary is required" },
        { status: 400 }
      );
    }

    // Get provider (default to Claude for code generation)
    const providerId: ProviderId = body.preferredModel || "claude-opus-4";
    const provider = getProvider(providerId);

    if (!provider.isConfigured()) {
      return NextResponse.json(
        { error: `${providerId} is not configured` },
        { status: 500 }
      );
    }

    // Build prompt
    const fileContext = buildFileContext(body.targetFiles);
    const prompt = DIFF_GENERATION_PROMPT.replace(
      "{consensus}",
      body.consensus.summary
    ).replace("{fileContext}", fileContext);

    // Include action items if available
    let fullConsensus = body.consensus.summary;
    if (body.consensus.actionItems?.length) {
      fullConsensus += "\n\nAction Items:\n";
      fullConsensus += body.consensus.actionItems
        .map((item) => `- [${item.priority}] ${item.description}`)
        .join("\n");
    }

    const finalPrompt = DIFF_GENERATION_PROMPT.replace(
      "{consensus}",
      fullConsensus
    ).replace("{fileContext}", fileContext);

    // Generate diffs
    const messages: MessageParam[] = [
      {
        role: "system",
        content:
          "You are a precise code generation assistant. Output only valid JSON.",
      },
      { role: "user", content: finalPrompt },
    ];

    let fullContent = "";

    for await (const chunk of provider.stream(messages, {
      maxTokens: 8192,
      temperature: 0.3, // Low temperature for precise code generation
    })) {
      if (chunk.type === "text") {
        fullContent += chunk.content;
      }
    }

    // Parse response
    const result = parseAIResponse(fullContent);

    return NextResponse.json({
      success: result.success,
      sessionId: body.sessionId,
      diffs: result.diffs,
      explanation: result.explanation,
      implementable: result.implementable,
    });
  } catch (error) {
    console.error("[GenerateDiff] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate diffs" },
      { status: 500 }
    );
  }
}

// ============================================================================
// EXPORTED HELPERS
// ============================================================================

/**
 * Format a diff for display
 */
export function formatDiffForDisplay(diff: FileDiff): string {
  const lines: string[] = [];

  lines.push(`--- a/${diff.path}`);
  lines.push(`+++ b/${diff.path}`);

  for (const hunk of diff.hunks) {
    lines.push(
      `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`
    );

    for (const change of hunk.changes) {
      const prefix =
        change.type === "add" ? "+" : change.type === "remove" ? "-" : " ";
      lines.push(`${prefix}${change.content}`);
    }
  }

  return lines.join("\n");
}

/**
 * Apply diffs to get new file contents
 */
export function applyDiffs(
  originalContent: string,
  diff: FileDiff
): string {
  if (diff.type === "create") {
    return diff.newContent || "";
  }

  if (diff.type === "delete") {
    return "";
  }

  // For modifications, apply hunks
  const lines = originalContent.split("\n");
  let offset = 0;

  for (const hunk of diff.hunks) {
    const startLine = hunk.oldStart - 1 + offset; // Convert to 0-indexed

    // Remove old lines
    const removes = hunk.changes.filter((c) => c.type === "remove").length;
    const adds = hunk.changes.filter((c) => c.type === "add");

    lines.splice(startLine, removes);

    // Insert new lines
    for (let i = 0; i < adds.length; i++) {
      lines.splice(startLine + i, 0, adds[i].content);
    }

    // Adjust offset for subsequent hunks
    offset += adds.length - removes;
  }

  return lines.join("\n");
}
