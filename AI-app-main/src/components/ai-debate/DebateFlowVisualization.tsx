/**
 * DebateFlowVisualization Component
 *
 * Interactive flow diagram showing the debate progression.
 * Uses ReactFlow to visualize messages as nodes and relationships as edges.
 * Shows branching (disagreements) and convergence (agreements).
 *
 * NOTE: Requires reactflow package: npm install reactflow
 */

"use client";

import React, { useMemo, useCallback } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import type { DebateMessage, DebateConsensus, DebateModelId } from "@/types/aiCollaboration";

interface DebateFlowVisualizationProps {
  messages: DebateMessage[];
  consensus?: DebateConsensus | null;
  onNodeClick?: (message: DebateMessage) => void;
  className?: string;
}

// Custom node types
const nodeTypes = {
  debateMessage: DebateMessageNode,
  consensus: ConsensusNode,
  userInput: UserInputNode,
};

// Colors for different models
const MODEL_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  "claude-opus-4": { bg: "#8B5CF620", border: "#8B5CF6", text: "#C4B5FD" },
  "claude-sonnet-4": { bg: "#A78BFA20", border: "#A78BFA", text: "#DDD6FE" },
  "gpt-5": { bg: "#10B98120", border: "#10B981", text: "#6EE7B7" },
  "gpt-4o": { bg: "#34D39920", border: "#34D399", text: "#A7F3D0" },
  "gemini-pro": { bg: "#3B82F620", border: "#3B82F6", text: "#93C5FD" },
  "gemini-ultra": { bg: "#60A5FA20", border: "#60A5FA", text: "#BFDBFE" },
};

/**
 * Build nodes and edges from debate messages
 */
function buildGraphData(
  messages: DebateMessage[],
  consensus?: DebateConsensus | null
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Group messages by turn
  const turnGroups = new Map<number, DebateMessage[]>();
  for (const msg of messages) {
    const turn = turnGroups.get(msg.turnNumber) || [];
    turn.push(msg);
    turnGroups.set(msg.turnNumber, turn);
  }

  const sortedTurns = Array.from(turnGroups.keys()).sort((a, b) => a - b);
  const NODE_WIDTH = 280;
  const NODE_HEIGHT = 120;
  const VERTICAL_SPACING = 180;
  const HORIZONTAL_SPACING = 320;

  // Create nodes for each message
  for (const turn of sortedTurns) {
    const turnMessages = turnGroups.get(turn) || [];
    const xOffset = (turnMessages.length - 1) * HORIZONTAL_SPACING / 2;

    turnMessages.forEach((msg, idx) => {
      const colors = MODEL_COLORS[msg.modelId] || MODEL_COLORS["claude-opus-4"];

      nodes.push({
        id: msg.id,
        type: "debateMessage",
        position: {
          x: idx * HORIZONTAL_SPACING - xOffset,
          y: turn * VERTICAL_SPACING,
        },
        data: {
          message: msg,
          colors,
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      });

      // Create edges to previous messages
      if (turn > 0) {
        const prevTurn = sortedTurns[sortedTurns.indexOf(turn) - 1];
        const prevMessages = turnGroups.get(prevTurn) || [];

        for (const prevMsg of prevMessages) {
          // Connect to messages from other models (showing responses)
          if (prevMsg.modelId !== msg.modelId) {
            edges.push({
              id: `${prevMsg.id}-${msg.id}`,
              source: prevMsg.id,
              target: msg.id,
              type: "smoothstep",
              animated: msg.isAgreement,
              style: {
                stroke: msg.isAgreement ? "#10B981" : "#52525B",
                strokeWidth: 2,
              },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: msg.isAgreement ? "#10B981" : "#52525B",
              },
            });
          }
        }
      }
    });
  }

  // Add consensus node if available
  if (consensus) {
    const lastTurn = sortedTurns[sortedTurns.length - 1] || 0;
    const consensusY = (lastTurn + 1) * VERTICAL_SPACING;

    nodes.push({
      id: "consensus",
      type: "consensus",
      position: { x: 0, y: consensusY },
      data: { consensus },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    });

    // Connect last messages to consensus
    const lastMessages = turnGroups.get(lastTurn) || [];
    for (const msg of lastMessages) {
      edges.push({
        id: `${msg.id}-consensus`,
        source: msg.id,
        target: "consensus",
        type: "smoothstep",
        animated: true,
        style: { stroke: "#10B981", strokeWidth: 3 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#10B981",
        },
      });
    }
  }

  return { nodes, edges };
}

export function DebateFlowVisualization({
  messages,
  consensus,
  onNodeClick,
  className = "",
}: DebateFlowVisualizationProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildGraphData(messages, consensus),
    [messages, consensus]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.data.message && onNodeClick) {
        onNodeClick(node.data.message);
      }
    },
    [onNodeClick]
  );

  if (messages.length === 0) {
    return (
      <div className={`flex items-center justify-center h-96 bg-zinc-900 rounded-lg ${className}`}>
        <p className="text-zinc-500">No messages to visualize</p>
      </div>
    );
  }

  return (
    <div className={`h-[600px] bg-zinc-900 rounded-lg overflow-hidden ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#27272A" gap={20} />
        <Controls
          className="!bg-zinc-800 !border-zinc-700 !shadow-xl"
          showInteractive={false}
        />
        <MiniMap
          className="!bg-zinc-800 !border-zinc-700"
          nodeColor={(node) => node.data.colors?.border || "#52525B"}
          maskColor="rgba(0,0,0,0.8)"
        />
      </ReactFlow>
    </div>
  );
}

/**
 * Custom node for debate messages
 */
function DebateMessageNode({ data }: { data: { message: DebateMessage; colors: { bg: string; border: string; text: string } } }) {
  const { message, colors } = data;

  return (
    <div
      className="px-4 py-3 rounded-lg min-w-[240px] max-w-[300px] shadow-lg"
      style={{
        background: colors.bg,
        border: `2px solid ${colors.border}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium" style={{ color: colors.text }}>
          {message.modelDisplayName}
        </span>
        {message.isAgreement && (
          <span className="text-xs px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">
            Agreement
          </span>
        )}
      </div>

      {/* Content preview */}
      <p className="text-xs text-zinc-400 line-clamp-3">
        {message.content.slice(0, 150)}
        {message.content.length > 150 ? "..." : ""}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-700/30">
        <span className="text-xs text-zinc-500">Turn {message.turnNumber + 1}</span>
        <span className="text-xs text-zinc-500">
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}

/**
 * Custom node for consensus
 */
function ConsensusNode({ data }: { data: { consensus: DebateConsensus } }) {
  const { consensus } = data;

  return (
    <div
      className="px-4 py-3 rounded-lg min-w-[300px] max-w-[400px] shadow-lg"
      style={{
        background: "linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(16, 185, 129, 0.1))",
        border: "2px solid #10B981",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🎯</span>
        <span className="text-sm font-semibold text-emerald-400">Consensus Reached</span>
      </div>

      {/* Summary */}
      <p className="text-xs text-zinc-300 line-clamp-4">
        {consensus.summary.slice(0, 200)}
        {consensus.summary.length > 200 ? "..." : ""}
      </p>

      {/* Action items count */}
      {consensus.actionItems?.length > 0 && (
        <div className="mt-2 pt-2 border-t border-zinc-700/30">
          <span className="text-xs text-zinc-500">
            {consensus.actionItems.length} action item{consensus.actionItems.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Custom node for user input/interjection
 */
function UserInputNode({ data }: { data: { content: string } }) {
  return (
    <div
      className="px-4 py-3 rounded-lg min-w-[200px] max-w-[280px] shadow-lg"
      style={{
        background: "rgba(251, 191, 36, 0.1)",
        border: "2px solid #FBBF24",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm">💬</span>
        <span className="text-sm font-medium text-amber-400">User Input</span>
      </div>
      <p className="text-xs text-zinc-400">{data.content}</p>
    </div>
  );
}

/**
 * Legend component for the flow diagram
 */
export function DebateFlowLegend({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-4 text-xs ${className}`}>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-purple-500" />
        <span className="text-zinc-400">Claude</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-emerald-500" />
        <span className="text-zinc-400">GPT</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-blue-500" />
        <span className="text-zinc-400">Gemini</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-8 h-0.5 bg-emerald-500" />
        <span className="text-zinc-400">Agreement path</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-8 h-0.5 bg-zinc-600" />
        <span className="text-zinc-400">Discussion path</span>
      </div>
    </div>
  );
}

export default DebateFlowVisualization;
