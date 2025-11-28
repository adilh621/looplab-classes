"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { LEVELS, getLevelById, BlockType, type Block, type LevelConfig, type BlockPosition } from "@/loopy/levels";
import { loadProgress, saveProgress, clearProgress, type Progress } from "@/loopy/progress";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";

// Types for drag data
type DragData = 
  | { source: "palette"; blockType: BlockType }
  | { source: "workspace"; blockId: string };

// Helper functions
function expandProgram(blocks: Block[]): BlockType[] {
  const result: BlockType[] = [];
  for (const b of blocks) {
    if (b.type === BlockType.REPEAT) {
      for (let i = 0; i < b.count; i++) {
        result.push(...expandProgram(b.children));
      }
    } else {
      result.push(b.type);
    }
  }
  return result;
}

// Removed unused functions: buildChains, expandChainsToMoves

function applyMove(pos: { x: number; y: number }, move: BlockType): { x: number; y: number } {
  switch (move) {
    case BlockType.MOVE_UP: return { x: pos.x, y: pos.y - 1 };
    case BlockType.MOVE_DOWN: return { x: pos.x, y: pos.y + 1 };
    case BlockType.MOVE_LEFT: return { x: pos.x - 1, y: pos.y };
    case BlockType.MOVE_RIGHT: return { x: pos.x + 1, y: pos.y };
    default: return pos;
  }
}

function isOutOfBounds(pos: { x: number; y: number }, level: LevelConfig): boolean {
  return pos.x < 0 || pos.x >= level.width || pos.y < 0 || pos.y >= level.height;
}

function isWall(pos: { x: number; y: number }, level: LevelConfig): boolean {
  const index = pos.y * level.width + pos.x;
  return level.grid[index] === "wall";
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getSpritePath(direction: "left" | "right" | "up" | "down"): string {
  switch (direction) {
    case "left": return "/game_assets/left_loopy.png";
    case "right": return "/game_assets/right_loopy.png";
    case "up": return "/game_assets/front_loopy.png";
    case "down": return "/game_assets/front_loopy.png";
    default: return "/game_assets/right_loopy.png";
  }
}

function calculateStars(blockCount: number, optimalCount: number): number {
  if (blockCount <= optimalCount) return 3;
  if (blockCount <= optimalCount + 2) return 2;
  return 1;
}

function labelForBlockType(t: BlockType): string {
  switch (t) {
    case BlockType.MOVE_UP:
      return "Move Up";
    case BlockType.MOVE_DOWN:
      return "Move Down";
    case BlockType.MOVE_LEFT:
      return "Move Left";
    case BlockType.MOVE_RIGHT:
      return "Move Right";
    case BlockType.REPEAT:
      return "Repeat";
    case BlockType.WHEN_RUN_CLICKED:
      return "when run clicked";
    default:
      return "Block";
  }
}

// Block shape constants (Scratch-style)
const BLOCK_WIDTH = 220;
const BLOCK_HEIGHT = 40;
const CORNER_RADIUS = 8;
const NOTCH_WIDTH = 20; // Width of the top groove / bottom tab
const NOTCH_HEIGHT = 8; // Height/depth of the notch
const NOTCH_OFFSET = 12; // Horizontal offset from left edge to start of notch

// Snapping constants
const SNAP_VERTICAL_DISTANCE = 15; // Reduced for tighter snapping
const SNAP_HORIZONTAL_TOLERANCE = 40;
const BLOCK_SPACING = 0; // No gap - blocks interlock visually

// Find the best snap target for a block being dragged
function findSnapTarget(
  blocks: Block[], 
  draggedId: string, 
  draggedPosition: { x: number; y: number }
): Block | null {
  let bestTarget: Block | null = null;
  let bestDistance = Infinity;

  for (const candidate of blocks) {
    if (candidate.id === draggedId) continue;
    
    // Can't snap to a block that's already a child of the dragged block
    // (would create a cycle)
    let isChild = false;
    let current: Block | undefined = blocks.find(b => b.id === candidate.id);
    while (current?.connection.nextBlockId) {
      if (current.connection.nextBlockId === draggedId) {
        isChild = true;
        break;
      }
      current = blocks.find(b => b.id === current!.connection.nextBlockId);
    }
    if (isChild) continue;

    const dx = draggedPosition.x - candidate.position.x;
    const dy = draggedPosition.y - (candidate.position.y + BLOCK_HEIGHT);
    const verticalClose = Math.abs(dy) <= SNAP_VERTICAL_DISTANCE;
    const horizontalAligned = Math.abs(dx) <= SNAP_HORIZONTAL_TOLERANCE;

    if (verticalClose && horizontalAligned) {
      const distance = Math.hypot(dx, dy);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestTarget = candidate;
      }
    }
  }

  return bestTarget;
}

function applySnapping(blocks: Block[], movedId: string, draggedPosition?: { x: number; y: number }): Block[] {
  const moved = blocks.find((b) => b.id === movedId);
  if (!moved) return blocks;

  // "when run clicked" block should not snap to other blocks (it's always the top)
  if (moved.type === BlockType.WHEN_RUN_CLICKED) {
    // Just update its position without snapping
    return blocks.map((b) =>
      b.id === movedId && draggedPosition
        ? { ...b, position: draggedPosition }
        : b
    );
  }

  // Use provided position or block's current position
  const currentPosition = draggedPosition || moved.position;

  // First, clear old connections to/from this moved block
  const clean = blocks.map((b) => {
    if (b.connection.nextBlockId === movedId) {
      return { ...b, connection: { ...b.connection, nextBlockId: null } };
    }
    if (b.connection.prevBlockId === movedId) {
      return { ...b, connection: { ...b.connection, prevBlockId: null } };
    }
    if (b.id === movedId) {
      return {
        ...b,
        connection: { nextBlockId: null, prevBlockId: null },
      };
    }
    return b;
  });

  const updatedBlocks = [...clean];
  const bestTarget = findSnapTarget(updatedBlocks, movedId, currentPosition);

  if (!bestTarget) {
    // No snap target - update position if provided
    return updatedBlocks.map((b) =>
      b.id === movedId && draggedPosition
        ? { ...b, position: draggedPosition }
        : b
    );
  }

  // Snap moved block directly under bestTarget (no gap - blocks interlock)
  const snappedX = bestTarget.position.x;
  const snappedY = bestTarget.position.y + BLOCK_HEIGHT + BLOCK_SPACING;

  // Handle insertion: if bestTarget has a next block, insert moved block between them
  const existingNextId = bestTarget.connection.nextBlockId;

  return updatedBlocks.map((b) => {
    if (b.id === movedId) {
      return {
        ...b,
        position: { x: snappedX, y: snappedY },
        connection: {
          prevBlockId: bestTarget!.id,
          nextBlockId: existingNextId,
        },
      };
    }
    if (b.id === bestTarget.id) {
      return {
        ...b,
        connection: { ...b.connection, nextBlockId: movedId },
      };
    }
    if (existingNextId && b.id === existingNextId) {
      return {
        ...b,
        connection: { ...b.connection, prevBlockId: movedId },
      };
    }
    return b;
  });
}

function createBlockInstance(blockType: BlockType, position: BlockPosition): Block {
  const id = crypto.randomUUID();
  const base = {
    id,
    type: blockType,
    position,
    connection: { nextBlockId: null, prevBlockId: null },
  };

  if (
    blockType === BlockType.MOVE_UP ||
    blockType === BlockType.MOVE_DOWN ||
    blockType === BlockType.MOVE_LEFT ||
    blockType === BlockType.MOVE_RIGHT
  ) {
    return { ...base, type: blockType };
  }

  if (blockType === BlockType.REPEAT) {
    return { ...base, type: BlockType.REPEAT, count: 2, children: [] };
  }

  if (blockType === BlockType.WHEN_RUN_CLICKED) {
    return { ...base, type: BlockType.WHEN_RUN_CLICKED };
  }

  throw new Error("Unsupported block type");
}

// BlockShape component - Scratch-style block with top groove and bottom tab
type BlockShapeProps = {
  width?: number;
  height?: number;
  color?: string;
  highlight?: boolean;
  smoothTop?: boolean; // If true, top is smooth (no groove) - for "when run clicked" block
  children: React.ReactNode;
};

function BlockShape({ 
  width = BLOCK_WIDTH, 
  height = BLOCK_HEIGHT, 
  color = "#2563eb", // blue-600
  highlight = false,
  smoothTop = false,
  children 
}: BlockShapeProps) {
  // Calculate path coordinates
  const w = width;
  const h = height;
  const r = CORNER_RADIUS;
  const nw = NOTCH_WIDTH;
  const nh = NOTCH_HEIGHT;
  const no = NOTCH_OFFSET;

  // Build the SVG path for Scratch-style block
  // If smoothTop is true, the top edge is smooth (no groove)
  // Otherwise, it has a top groove like normal blocks
  // Bottom always has a tab (unless it's the last block, but we always include it)

  const svgHeight = h + nh; // Include tab protrusion in SVG height

  // Build path based on whether top is smooth or has a groove
  const path = smoothTop
    ? // Smooth top (no groove) - for "when run clicked" block
      `
      M ${r},0
      L ${w - r},0
      Q ${w},0 ${w},${r}
      L ${w},${h - r}
      Q ${w},${h} ${w - r},${h}
      L ${no + nw},${h}
      L ${no + nw},${h + nh}
      L ${no},${h + nh}
      L ${no},${h}
      L ${r},${h}
      Q 0,${h} 0,${h - r}
      L 0,${r}
      Q 0,0 ${r},0
      Z
    `.replace(/\s+/g, ' ').trim()
    : // Normal block with top groove
      `
      M ${r},0
      L ${no},0
      L ${no},${nh}
      L ${no + nw},${nh}
      L ${no + nw},0
      L ${w - r},0
      Q ${w},0 ${w},${r}
      L ${w},${h - r}
      Q ${w},${h} ${w - r},${h}
      L ${no + nw},${h}
      L ${no + nw},${h + nh}
      L ${no},${h + nh}
      L ${no},${h}
      L ${r},${h}
      Q 0,${h} 0,${h - r}
      L 0,${r}
      Q 0,0 ${r},0
      Z
    `.replace(/\s+/g, ' ').trim();

  return (
    <div className="relative" style={{ width, height: h }}>
      <svg
        width={width}
        height={svgHeight}
        className="absolute"
        style={{ pointerEvents: 'none', top: 0, left: 0 }}
      >
        <path
          d={path}
          fill={highlight ? "#60a5fa" : color} // Brighter blue when highlighted
          stroke={highlight ? "#3b82f6" : "transparent"}
          strokeWidth={highlight ? 3 : 0}
          style={{
            filter: highlight ? 'drop-shadow(0 0 12px rgba(59, 130, 246, 0.8)) drop-shadow(0 0 6px rgba(96, 165, 250, 0.6))' : undefined,
            transition: 'all 0.2s ease-out',
          }}
        />
      </svg>
      <div 
        className="absolute inset-0 flex items-center justify-center px-4"
        style={{ 
          paddingTop: nh + 4, // Extra padding to avoid notch
          paddingBottom: nh + 4, // Extra padding to avoid tab
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Components
function InstructionsPanel({
  level,
  runStatus,
}: {
  level: LevelConfig;
  runStatus: "idle" | "running" | "success" | "crash";
}) {
  const [showHint, setShowHint] = useState(false);

  const statusText = {
    idle: "Ready",
    running: "Running…",
    success: "Success 🎉",
    crash: "Crash! Try again.",
  }[runStatus];

  return (
    <div className="border rounded-xl p-4 bg-white space-y-4 overflow-y-auto">
      <div>
        <h2 className="text-lg font-semibold mb-2">Level {level.id}: {level.name}</h2>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{level.instructions}</p>
      </div>
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Status:</span>
          <span className={`text-sm font-semibold ${
            runStatus === "success" ? "text-green-600" :
            runStatus === "crash" ? "text-red-600" :
            runStatus === "running" ? "text-blue-600" :
            "text-gray-600"
          }`}>
            {statusText}
          </span>
        </div>
        <button
          onClick={() => setShowHint(!showHint)}
          className="w-full px-3 py-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-sm font-medium text-amber-900 transition-colors"
        >
          {showHint ? "Hide Hint" : "Show Hint"}
        </button>
        {showHint && (
          <p className="mt-2 text-sm text-gray-600 italic bg-amber-50 p-2 rounded">
            {level.hint}
          </p>
        )}
      </div>
    </div>
  );
}

function GameBoard({
  level,
  loopyPos,
  lastDirection,
}: {
  level: LevelConfig;
  loopyPos: { x: number; y: number };
  lastDirection: "left" | "right" | "up" | "down";
}) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [tileSize, setTileSize] = useState<number>(64);

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      // small padding inside the board for aesthetics
      const padding = 16;
      const usableWidth = rect.width - padding * 2;
      const usableHeight = rect.height - padding * 2;

      const sizeFromWidth = usableWidth / level.width;
      const sizeFromHeight = usableHeight / level.height;

      const size = Math.floor(Math.min(sizeFromWidth, sizeFromHeight));
      setTileSize(size);
    };

    updateSize();

    const observer = new ResizeObserver(() => updateSize());
    observer.observe(el);

    return () => observer.disconnect();
  }, [level.width, level.height]);

  const appleSize = Math.floor(tileSize * 0.6); // roughly 40% smaller

  return (
    <div
      ref={boardRef}
      className="relative h-full w-full rounded-xl border border-slate-200 bg-sky-50 overflow-hidden flex items-center justify-center"
    >
      <div
        className="relative bg-sky-900 rounded-xl border border-slate-700 overflow-hidden"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${level.width}, ${tileSize}px)`,
          gridTemplateRows: `repeat(${level.height}, ${tileSize}px)`,
          imageRendering: "pixelated" as const,
          padding: 16,
        }}
      >
        {level.grid.map((tile, index) => {
          return (
            <div
              key={index}
              className="relative"
              style={{ width: tileSize, height: tileSize }}
            >
              <Image
                src="/game_assets/board.png"
                alt="board tile"
                width={tileSize}
                height={tileSize}
                className="absolute inset-0"
                style={{ imageRendering: "pixelated" }}
              />
              {tile === "wall" && (
                <Image
                  src="/game_assets/brick_wall.png"
                  alt="wall"
                  width={tileSize}
                  height={tileSize}
                  className="absolute inset-0"
                  style={{ imageRendering: "pixelated" }}
                />
              )}
              {tile === "goal" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Image
                    src="/game_assets/apple.png"
                    alt="goal"
                    width={appleSize}
                    height={appleSize}
                    style={{ imageRendering: "pixelated", marginTop: -50 }}
                  />
                </div>
              )}
            </div>
          );
        })}
        <div
          className="absolute transition-all duration-200 z-10"
          style={{
            left: loopyPos.x * tileSize + 16, // same padding offset
            top: loopyPos.y * tileSize + 16,
            width: tileSize,
            height: tileSize,
          }}
        >
          <Image
            src={getSpritePath(lastDirection)}
            alt="Loopy"
            width={tileSize}
            height={tileSize}
            style={{ imageRendering: "pixelated" }}
          />
        </div>
      </div>
    </div>
  );
}

type PaletteBlockProps = {
  blockType: BlockType;
  onAddBlock: (block: Block) => void;
};

function PaletteBlock({ blockType, onAddBlock }: PaletteBlockProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `palette-${blockType}`,
      data: {
        source: "palette",
        blockType,
      },
    });

  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0.8 : 1,
    cursor: "grab",
  };

  const handleClick = () => {
    const newBlock = createBlockInstance(blockType, { x: 40, y: 40 });
    onAddBlock(newBlock);
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className="w-full"
    >
      <button
        onClick={handleClick}
        className="w-full"
        style={{ pointerEvents: isDragging ? 'none' : 'auto' }}
      >
        <BlockShape width={BLOCK_WIDTH} height={BLOCK_HEIGHT}>
          <span className="text-sm font-semibold text-white">{labelForBlockType(blockType)}</span>
        </BlockShape>
      </button>
    </div>
  );
}

function BlockPalette({
  level,
  onAddBlock,
}: {
  level: LevelConfig;
  onAddBlock: (block: Block) => void;
}) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm flex flex-col gap-3">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">Block Palette</h3>
      {level.allowedBlocks.map((t) => (
        <PaletteBlock key={t} blockType={t} onAddBlock={onAddBlock} />
      ))}
    </div>
  );
}

type DraggableBlockProps = {
  block: Block;
  onChangePosition?: (id: string, x: number, y: number) => void;
  onRemoveBlock?: (id: string) => void;
  highlight?: boolean;
  isDragging?: boolean;
  allBlocks?: Block[];
  activeDragId?: string | null;
  onDragPositionUpdate?: (id: string, position: { x: number; y: number }) => void;
};

function DraggableBlock({ 
  block, 
  highlight: externalHighlight = false,
  isDragging: externalIsDragging = false,
  onDragPositionUpdate,
}: DraggableBlockProps) {
  
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: block.id,
      data: {
        source: "workspace",
        blockId: block.id,
      },
    });

  const getBlockLabel = (block: Block): string => {
    if (block.type === BlockType.REPEAT) {
      return `Repeat x${block.count}`;
    }
    return labelForBlockType(block.type);
  };

  const actualIsDragging = isDragging || externalIsDragging;

  // Use ref to track last reported position to prevent infinite loops
  const lastReportedPositionRef = React.useRef<{ x: number; y: number } | null>(null);

  // Report current drag position to parent for highlight computation
  React.useEffect(() => {
    if (actualIsDragging && transform && onDragPositionUpdate) {
      const pos = transform
        ? { x: block.position.x + transform.x, y: block.position.y + transform.y }
        : block.position;
      // Only update if position actually changed (avoid infinite loops)
      const lastPos = lastReportedPositionRef.current;
      if (!lastPos || lastPos.x !== pos.x || lastPos.y !== pos.y) {
        lastReportedPositionRef.current = pos;
        onDragPositionUpdate(block.id, pos);
      }
    } else if (!actualIsDragging) {
      // Reset when not dragging
      lastReportedPositionRef.current = null;
    }
  }, [actualIsDragging, transform, block.position, block.id, onDragPositionUpdate]);

  // Use the highlight passed from parent (computed in real-time)
  const finalHighlight = externalHighlight;

  const style: React.CSSProperties = {
    position: "absolute",
    left: block.position.x,
    top: block.position.y,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    cursor: actualIsDragging ? "grabbing" : "grab",
    opacity: actualIsDragging ? 0.8 : 1,
    zIndex: actualIsDragging ? 1000 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={style}
      className="inline-flex min-w-[180px] max-w-[260px]"
    >
      <BlockShape 
        width={BLOCK_WIDTH} 
        height={BLOCK_HEIGHT} 
        highlight={finalHighlight}
        smoothTop={block.type === BlockType.WHEN_RUN_CLICKED}
        color={block.type === BlockType.WHEN_RUN_CLICKED ? "#22c55e" : "#2563eb"} // Green for "when run clicked", blue for others
      >
        <span className="text-sm font-semibold text-white">{getBlockLabel(block)}</span>
      </BlockShape>
    </div>
  );
}

// Compute the actual rendered position of a block based on its connections
// If a block has a parent, it should be positioned directly below the parent
function computeRenderedPosition(block: Block, allBlocks: Block[]): BlockPosition {
  // If block has a parent, position it below the parent
  if (block.connection.prevBlockId) {
    const parent = allBlocks.find(b => b.id === block.connection.prevBlockId);
    if (parent) {
      const parentPos = computeRenderedPosition(parent, allBlocks);
      return {
        x: parentPos.x,
        y: parentPos.y + BLOCK_HEIGHT + BLOCK_SPACING,
      };
    }
  }
  // Otherwise use the block's stored position
  return block.position;
}

function WorkspacePanel({
  program,
  onRun,
  onReset,
  runStatus,
  workspaceRef,
  activeDragId,
  dragPosition,
}: {
  program: Block[];
  onRun: () => void;
  onReset: () => void;
  runStatus: "idle" | "running" | "success" | "crash";
  workspaceRef: React.RefObject<HTMLDivElement | null>;
  activeDragId: string | null;
  dragPosition: { x: number; y: number } | null;
}) {
  const { setNodeRef } = useDroppable({
    id: "workspace",
    data: { target: "workspace" },
  });

  const setWorkspaceRef = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    if (workspaceRef) {
      (workspaceRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    }
  };

  // Track current drag position from the active block's transform (updated via callback)
  const [currentDragPosition, setCurrentDragPosition] = React.useState<{ x: number; y: number } | null>(null);
  
  // Callback to receive drag position updates from DraggableBlock
  // Use ref to prevent unnecessary updates
  const lastPositionRef = React.useRef<{ x: number; y: number } | null>(null);
  const handleDragPositionUpdate = React.useCallback((id: string, position: { x: number; y: number }) => {
    if (id === activeDragId) {
      // Only update if position actually changed (avoid infinite loops)
      const lastPos = lastPositionRef.current;
      if (!lastPos || lastPos.x !== position.x || lastPos.y !== position.y) {
        lastPositionRef.current = position;
        setCurrentDragPosition(position);
      }
    }
  }, [activeDragId]);
  
  // Reset position ref when drag ends
  React.useEffect(() => {
    if (!activeDragId) {
      lastPositionRef.current = null;
    }
  }, [activeDragId]);

  // Clear drag position when drag ends
  React.useEffect(() => {
    if (!activeDragId) {
      setCurrentDragPosition(null);
    }
  }, [activeDragId]);

  // Find which block should be highlighted during drag
  const highlightedBlockId = React.useMemo(() => {
    if (!activeDragId) return null;
    
    const draggedBlock = program.find(b => b.id === activeDragId);
    if (!draggedBlock) return null;
    
    // Use current drag position if available, otherwise use stored position
    const checkPosition = currentDragPosition || dragPosition || draggedBlock.position;
    const target = findSnapTarget(program, activeDragId, checkPosition);
    return target?.id || null;
  }, [program, activeDragId, currentDragPosition, dragPosition]);

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-700">Your Program</h3>
        <div className="flex gap-2">
          <button
            onClick={onRun}
            disabled={runStatus === "running" || program.length === 0}
            className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold transition-colors text-sm"
          >
            Run
          </button>
          <button
            onClick={onReset}
            disabled={runStatus === "running"}
            className="px-4 py-2 rounded-lg bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold transition-colors text-sm"
          >
            Reset
          </button>
        </div>
      </div>

      <div
        ref={setWorkspaceRef}
        className="flex-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 relative overflow-auto min-h-[100px]"
        style={{ height: "500px" }}
      >
        {program.length === 0 ? (
          <p className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">
            Drag blocks from the palette into this workspace.
          </p>
        ) : (
          // Render all blocks, but use computed positions for connected blocks
          program.map((block) => {
            // During drag, use the drag position for the active block
            let displayPosition = block.position;
            if (block.id === activeDragId && dragPosition) {
              displayPosition = dragPosition;
            } else {
              displayPosition = computeRenderedPosition(block, program);
            }
            
            return (
              <DraggableBlock
                key={block.id}
                block={{ ...block, position: displayPosition }}
                highlight={block.id === highlightedBlockId}
                isDragging={block.id === activeDragId}
                onDragPositionUpdate={handleDragPositionUpdate}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

export default function LoopyPage() {
  const [progress, setProgress] = useState<Progress>({ unlockedLevels: [1], bestStars: {} });
  const [currentLevelId, setCurrentLevelId] = useState(1);
  const level = getLevelById(currentLevelId);
  
  const [program, setProgram] = useState<Block[]>([]);
  const [loopyPos, setLoopyPos] = useState(level.start);
  const [lastDirection, setLastDirection] = useState<"left" | "right" | "up" | "down">("right");
  const [runStatus, setRunStatus] = useState<"idle" | "running" | "success" | "crash">("idle");
  
  // Drag & drop state
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [activeBlockTemplate, setActiveBlockTemplate] = useState<BlockType | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  // Load progress on mount
  useEffect(() => {
    const loaded = loadProgress();
    setProgress(loaded);
    if (loaded.unlockedLevels.length > 0) {
      setCurrentLevelId(loaded.unlockedLevels[0]);
    }
  }, []);

  // Initialize workspace with "when run clicked" block
  const initializeWorkspace = useCallback(() => {
    const whenRunClickedBlock = createBlockInstance(BlockType.WHEN_RUN_CLICKED, { x: 20, y: 20 });
    return [whenRunClickedBlock];
  }, []);

  // Reset game state when level changes
  useEffect(() => {
    const newLevel = getLevelById(currentLevelId);
    setProgram(initializeWorkspace());
    setLoopyPos(newLevel.start);
    setLastDirection("right");
    setRunStatus("idle");
  }, [currentLevelId, initializeWorkspace]);

  const handleAddBlock = useCallback((block: Block) => {
    if (runStatus === "running") return;
    // For palette click, add block at default position
    const newBlock = {
      ...block,
      position: { x: 40, y: 40 },
      connection: { nextBlockId: null, prevBlockId: null },
    };
    setProgram(prev => [...prev, newBlock]);
  }, [runStatus]);

  const handleReset = useCallback(() => {
    if (runStatus === "running") return;
    setProgram(initializeWorkspace());
    setLoopyPos(level.start);
    setLastDirection("right");
    setRunStatus("idle");
  }, [level.start, runStatus, initializeWorkspace]);

  const handleResetGame = useCallback(() => {
    // Clear localStorage
    clearProgress();

    // Reset progress state
    const defaultProgress = { unlockedLevels: [1], bestStars: {} };
    setProgress(defaultProgress);

    // Reset to level 1
    const firstLevel = getLevelById(1);
    setCurrentLevelId(1);
    setProgram([]);
    setLoopyPos(firstLevel.start);
    setRunStatus("idle");
    setLastDirection("right");
    setProgram(initializeWorkspace());
  }, [initializeWorkspace]);

  const handleRunProgram = useCallback(async () => {
    if (runStatus === "running" || program.length === 0) return;

    // Find the "when run clicked" block
    const whenRunClickedBlock = program.find(b => b.type === BlockType.WHEN_RUN_CLICKED);
    if (!whenRunClickedBlock) return;

    // Only run blocks attached to "when run clicked" block
    const attachedBlocks: Block[] = [];
    let current: Block | undefined = whenRunClickedBlock;
    const visited = new Set<string>();
    
    // Follow the chain starting from the block attached to "when run clicked"
    const firstAttachedId = whenRunClickedBlock.connection.nextBlockId;
    if (firstAttachedId) {
      current = program.find(b => b.id === firstAttachedId);
      while (current && !visited.has(current.id)) {
        attachedBlocks.push(current);
        visited.add(current.id);
        const nextId = current.connection.nextBlockId;
        current = nextId ? program.find(b => b.id === nextId) : undefined;
      }
    }

    if (attachedBlocks.length === 0) {
      // No blocks attached, nothing to run
      return;
    }

    setRunStatus("running");
    const moves = expandProgram(attachedBlocks);
    let currentPos = level.start;
    setLoopyPos(currentPos);

    for (let i = 0; i < moves.length; i++) {
      await sleep(300);
      const move = moves[i];
      const newPos = applyMove(currentPos, move);

      // Determine direction for sprite
      if (move === BlockType.MOVE_LEFT) setLastDirection("left");
      else if (move === BlockType.MOVE_RIGHT) setLastDirection("right");
      else if (move === BlockType.MOVE_UP) setLastDirection("up");
      else if (move === BlockType.MOVE_DOWN) setLastDirection("down");

      if (isOutOfBounds(newPos, level) || isWall(newPos, level)) {
        setLoopyPos(newPos);
        setRunStatus("crash");
        return;
      }

      currentPos = newPos;
      setLoopyPos(currentPos);
    }

    // Check if reached goal
    if (currentPos.x === level.goal.x && currentPos.y === level.goal.y) {
      setRunStatus("success");
      
      // Calculate stars and update progress (use attached blocks count for scoring)
      const stars = calculateStars(attachedBlocks.length, level.optimalBlockCount);
      const currentBest = progress.bestStars[level.id] || 0;
      
      if (stars > currentBest) {
        const newProgress: Progress = {
          ...progress,
          bestStars: { ...progress.bestStars, [level.id]: stars },
        };
        
        // Unlock next level
        if (!newProgress.unlockedLevels.includes(level.id + 1)) {
          const nextLevel = LEVELS.find(l => l.id === level.id + 1);
          if (nextLevel) {
            newProgress.unlockedLevels.push(level.id + 1);
          }
        }
        
        setProgress(newProgress);
        saveProgress(newProgress);
      }
    } else {
      setRunStatus("crash");
    }
  }, [program, level, runStatus, progress]);

  // Get all blocks in a stack starting from a given block (including the block itself and all children)
  const getStackBlocks = useCallback((blockId: string): Block[] => {
    const block = program.find(b => b.id === blockId);
    if (!block) return [];
    
    const stack: Block[] = [block];
    let current: Block | undefined = block;
    
    // Collect all children
    while (current.connection.nextBlockId) {
      const next = program.find(b => b.id === current!.connection.nextBlockId);
      if (!next) break;
      stack.push(next);
      current = next;
    }
    
    return stack;
  }, [program]);

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as DragData | null | undefined;
    if (!data) return;

    if (data.source === "palette") {
      setActiveBlockTemplate(data.blockType as BlockType);
      setActiveBlockId(event.active.id as string);
      setDragPosition(null);
    } else if (data.source === "workspace") {
      const block = program.find((b) => b.id === event.active.id);
      if (block) {
        setActiveBlockTemplate(block.type);
        
        // Store the stack information in the drag data
        setActiveBlockId(event.active.id as string);
        setDragPosition(block.position);
      }
    }
  };

  // Note: dnd-kit doesn't provide onDragMove by default
  // We'll compute drag position from the block's transform in the DraggableBlock component
  // For now, we'll update drag position in handleDragEnd

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    const activeData = active.data.current as DragData | null | undefined;

    // 1) Dragging from palette into workspace
    if (activeData?.source === "palette" && over?.id === "workspace" && workspaceRef.current) {
      const rect = workspaceRef.current.getBoundingClientRect();
      const dragRect = active.rect.current.translated ?? active.rect.current.initial;
      if (!dragRect) {
        setActiveBlockId(null);
        setActiveBlockTemplate(null);
        setDragPosition(null);
        return;
      }
      const dropX = dragRect.left - rect.left;
      const dropY = dragRect.top - rect.top;

      const newBlock = createBlockInstance(activeData.blockType, {
        x: Math.max(0, dropX),
        y: Math.max(0, dropY),
      });
      setProgram((prev) => {
        // Try to snap the new block
        return applySnapping([...prev, newBlock], newBlock.id, { x: Math.max(0, dropX), y: Math.max(0, dropY) });
      });
      setActiveBlockId(null);
      setActiveBlockTemplate(null);
      setDragPosition(null);
      return;
    }

    // 2) Moving existing blocks inside workspace (and snapping)
    if (activeData?.source === "workspace" && workspaceRef.current) {
      const dragRect = active.rect.current.translated ?? active.rect.current.initial;
      if (!dragRect) {
        setActiveBlockId(null);
        setActiveBlockTemplate(null);
        setDragPosition(null);
        return;
      }
      const rect = workspaceRef.current.getBoundingClientRect();
      const dropX = dragRect.left - rect.left;
      const dropY = dragRect.top - rect.top;

      const draggedBlock = program.find(b => b.id === active.id);
      if (!draggedBlock) {
        setActiveBlockId(null);
        setActiveBlockTemplate(null);
        setDragPosition(null);
        return;
      }

      // Get the entire stack that needs to move together
      const stackBlocks = getStackBlocks(draggedBlock.id);
      const stackIds = new Set(stackBlocks.map(b => b.id));
      
      // Calculate offset from the dragged block's original position
      const offsetX = dropX - draggedBlock.position.x;
      const offsetY = dropY - draggedBlock.position.y;

      // Update position of all blocks in the stack, then apply snapping
      setProgram((prev) => {
        // First, move all blocks in the stack together
        const updated = prev.map((b) => {
          if (stackIds.has(b.id)) {
            return {
              ...b,
              position: { 
                x: b.position.x + offsetX, 
                y: b.position.y + offsetY 
              },
            };
          }
          return b;
        });

        // Then apply snapping to the dragged block (which will handle connections)
        return applySnapping(updated, active.id as string, { x: dropX, y: dropY });
      });
      
      setActiveBlockId(null);
      setActiveBlockTemplate(null);
      setDragPosition(null);
      return;
    }

    setActiveBlockId(null);
    setActiveBlockTemplate(null);
    setDragPosition(null);
  };

  return (
    <main className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-6xl mx-auto h-[95vh] flex flex-col gap-4">
        {/* Level selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-700">Level:</span>
          {LEVELS.map((l) => (
            <button
              key={l.id}
              onClick={() => {
                if (progress.unlockedLevels.includes(l.id)) {
                  setCurrentLevelId(l.id);
                }
              }}
              disabled={!progress.unlockedLevels.includes(l.id) || runStatus === "running"}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                currentLevelId === l.id
                  ? "bg-blue-500 text-white"
                  : progress.unlockedLevels.includes(l.id)
                  ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              {l.id}
              {progress.bestStars[l.id] && (
                <span className="ml-1">{"⭐".repeat(progress.bestStars[l.id])}</span>
              )}
            </button>
          ))}
          <button
            onClick={handleResetGame}
            className="ml-4 rounded-full border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Reset Game
          </button>
        </div>

        {/* Main game grid */}
        <DndContext 
          onDragStart={handleDragStart} 
          onDragEnd={handleDragEnd}
        >
          <div
            className="flex-1 grid gap-4"
            style={{
              gridTemplateColumns: "280px 1fr",
              gridTemplateRows: "320px 550px",
            }}
          >
            <InstructionsPanel level={level} runStatus={runStatus} />
            <div className="h-full">
              <GameBoard level={level} loopyPos={loopyPos} lastDirection={lastDirection} />
            </div>
            <BlockPalette level={level} onAddBlock={handleAddBlock} />
            <WorkspacePanel
              program={program}
              onRun={handleRunProgram}
              onReset={handleReset}
              runStatus={runStatus}
              workspaceRef={workspaceRef}
              activeDragId={activeBlockId}
              dragPosition={dragPosition}
            />
          </div>
          <DragOverlay>
            {activeBlockTemplate && (
              <BlockShape width={BLOCK_WIDTH} height={BLOCK_HEIGHT}>
                <span className="text-sm font-semibold text-white">{labelForBlockType(activeBlockTemplate)}</span>
              </BlockShape>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </main>
  );
}

