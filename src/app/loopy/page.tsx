"use client";

import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
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
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

// Types for drag data
type DragData = 
  | { source: "palette"; blockType: BlockType }
  | { source: "workspace"; blockId: string };

// Heading system: 0° = up, 90° = right, 180° = down, 270° = left
// This convention maps degrees to standard compass directions
type Heading = 0 | 90 | 180 | 270;

// Convert heading (degrees) to (dx, dy) movement vector
// Convention: 0° = up (y decreases), 90° = right (x increases), 180° = down (y increases), 270° = left (x decreases)
function headingToDelta(heading: Heading): { dx: number; dy: number } {
  switch (heading) {
    case 0: return { dx: 0, dy: -1 };   // Up
    case 90: return { dx: 1, dy: 0 };   // Right
    case 180: return { dx: 0, dy: 1 };  // Down
    case 270: return { dx: -1, dy: 0 }; // Left
    default: return { dx: 0, dy: 0 };
  }
}

// Convert heading to direction string for sprite rendering
function headingToDirection(heading: Heading): "left" | "right" | "up" | "down" {
  switch (heading) {
    case 0: return "up";
    case 90: return "right";
    case 180: return "down";
    case 270: return "left";
    default: return "right";
  }
}

// Get heading from a POINT_* block type
function getHeadingFromBlockType(blockType: BlockType): Heading | null {
  switch (blockType) {
    case BlockType.POINT_UP: return 0;
    case BlockType.POINT_RIGHT: return 90;
    case BlockType.POINT_DOWN: return 180;
    case BlockType.POINT_LEFT: return 270;
    default: return null;
  }
}

// Helper functions
function expandProgram(blocks: Block[], allBlocks: Block[]): BlockType[] {
  const result: BlockType[] = [];
  for (const b of blocks) {
    if (b.type === BlockType.REPEAT) {
      // Use the children property for nested blocks inside REPEAT
      const children = b.children || [];
      // Repeat the children blocks
      for (let i = 0; i < b.count; i++) {
        result.push(...expandProgram(children, allBlocks));
      }
    } else {
      result.push(b.type);
    }
  }
  return result;
}

// Apply movement based on heading (for MOVE_FORWARD)
function applyMoveForward(pos: { x: number; y: number }, heading: Heading): { x: number; y: number } {
  const { dx, dy } = headingToDelta(heading);
  return { x: pos.x + dx, y: pos.y + dy };
}

// Legacy applyMove for backward compatibility (deprecated)
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
    case "down": return "/game_assets/front_loopy.png"; // Will be flipped vertically
    default: return "/game_assets/right_loopy.png";
  }
}

// Check if sprite needs vertical flip (for down direction)
function needsVerticalFlip(direction: "left" | "right" | "up" | "down"): boolean {
  return direction === "down";
}

function calculateStars(blockCount: number, optimalCount: number): number {
  if (blockCount <= optimalCount) return 3;
  if (blockCount <= optimalCount + 2) return 2;
  return 1;
}

function labelForBlockType(t: BlockType): string {
  switch (t) {
    case BlockType.POINT_UP:
      return "Point Up (0°)";
    case BlockType.POINT_RIGHT:
      return "Point Right (90°)";
    case BlockType.POINT_DOWN:
      return "Point Down (180°)";
    case BlockType.POINT_LEFT:
      return "Point Left (270°)";
    case BlockType.MOVE_FORWARD:
      return "Move Forward";
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
    // Remove from REPEAT block's children if present
    if (b.type === BlockType.REPEAT && b.children) {
      const filteredChildren = b.children.filter(child => child.id !== movedId);
      if (filteredChildren.length !== b.children.length) {
        return { ...b, children: filteredChildren } as Block;
      }
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

  // Helper to find parent REPEAT block if bestTarget is a child of one
  const findParentRepeatBlock = (block: Block): Block | null => {
    if (block.connection.prevBlockId) {
      const parent = updatedBlocks.find(b => b.id === block.connection.prevBlockId);
      if (parent && parent.type === BlockType.REPEAT) {
        return parent;
      }
      if (parent) {
        return findParentRepeatBlock(parent);
      }
    }
    return null;
  };

  // Special handling for REPEAT blocks: blocks snapped below go into children
  if (bestTarget.type === BlockType.REPEAT) {
    return updatedBlocks.map((b) => {
      if (b.id === movedId) {
        return {
          ...b,
          position: { x: snappedX, y: snappedY },
          connection: {
            prevBlockId: bestTarget!.id,
            nextBlockId: null,
          },
        };
      }
      if (b.id === bestTarget.id) {
        // Add the moved block to the REPEAT block's children (avoid duplicates)
        const currentChildren = (b.type === BlockType.REPEAT ? b.children : []) || [];
        if (!currentChildren.some(child => child.id === movedId)) {
          return {
            ...b,
            children: [...currentChildren, moved],
          } as Block;
        }
      }
      return b;
    });
  }

  // If bestTarget is a child of a REPEAT block, add to that REPEAT's children
  const parentRepeat = findParentRepeatBlock(bestTarget);
  if (parentRepeat) {
    return updatedBlocks.map((b) => {
      if (b.id === movedId) {
        return {
          ...b,
          position: { x: snappedX, y: snappedY },
          connection: {
            prevBlockId: bestTarget!.id,
            nextBlockId: null,
          },
        };
      }
      if (b.id === parentRepeat.id) {
        // Add the moved block to the parent REPEAT block's children (avoid duplicates)
        const currentChildren = (b.type === BlockType.REPEAT ? b.children : []) || [];
        if (!currentChildren.some(child => child.id === movedId)) {
          return {
            ...b,
            children: [...currentChildren, moved],
          } as Block;
        }
      }
      return b;
    });
  }

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
    blockType === BlockType.POINT_UP ||
    blockType === BlockType.POINT_RIGHT ||
    blockType === BlockType.POINT_DOWN ||
    blockType === BlockType.POINT_LEFT ||
    blockType === BlockType.MOVE_FORWARD ||
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

// RepeatBlockShape component - C-shaped block for REPEAT blocks (like Scratch)
type RepeatBlockShapeProps = {
  count: number;
  onCountChange: (count: number) => void;
  highlight?: boolean;
  children?: React.ReactNode; // Blocks nested inside the repeat
};

// Inner padding constants for tight Scratch-like appearance
const INNER_PADDING_TOP = 2;
const INNER_PADDING_BOTTOM = 2;
const INNER_PADDING_LEFT = 4;
const MIN_CONTENT_HEIGHT = 40; // Minimum height when no children

function RepeatBlockShape({
  count,
  onCountChange,
  highlight = false,
  children,
}: RepeatBlockShapeProps) {
  const w = BLOCK_WIDTH;
  const headerHeight = BLOCK_HEIGHT;
  const r = CORNER_RADIUS;
  const nw = NOTCH_WIDTH;
  const nh = NOTCH_HEIGHT;
  const no = NOTCH_OFFSET;
  const sideWidth = 20; // Width of the left side bar
  
  // Measure actual height of nested children
  const contentRef = useRef<HTMLDivElement>(null);
  const [measuredHeight, setMeasuredHeight] = useState(0);

  // Measure children height after render and on resize
  useLayoutEffect(() => {
    const measureHeight = () => {
      if (contentRef.current) {
        // For absolutely positioned children, find the bottommost element
        const children = contentRef.current.children;
        let maxBottom = 0;
        
        if (children.length === 0) {
          setMeasuredHeight(0);
          return;
        }
        
        for (let i = 0; i < children.length; i++) {
          const child = children[i] as HTMLElement;
          const rect = child.getBoundingClientRect();
          const containerRect = contentRef.current.getBoundingClientRect();
          const relativeTop = rect.top - containerRect.top;
          const relativeBottom = relativeTop + rect.height;
          maxBottom = Math.max(maxBottom, relativeBottom);
        }
        
        // Use measured height or fallback to minimum
        const height = maxBottom > 0 ? maxBottom : MIN_CONTENT_HEIGHT;
        setMeasuredHeight(height);
      }
    };

    // Use requestAnimationFrame to ensure layout is complete
    requestAnimationFrame(() => {
      measureHeight();
    });

    // Also observe resize changes for dynamic content
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(measureHeight);
    });
    
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current);
      // Also observe all children
      Array.from(contentRef.current.children).forEach(child => {
        resizeObserver.observe(child as Element);
      });
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [children]);

  // Calculate contentHeight based on measured height + padding
  const contentHeight = Math.max(
    MIN_CONTENT_HEIGHT,
    measuredHeight + INNER_PADDING_TOP + INNER_PADDING_BOTTOM
  );
  const totalHeight = headerHeight + contentHeight + nh; // Include tab at bottom

  // C-shape path: top bar with groove, left side, bottom bar with tab
  // The cavity starts at headerHeight + INNER_PADDING_TOP and ends at headerHeight + contentHeight - INNER_PADDING_BOTTOM
  const path = `
    M ${r},0
    L ${no},0
    L ${no},${nh}
    L ${no + nw},${nh}
    L ${no + nw},0
    L ${w - r},0
    Q ${w},0 ${w},${r}
    L ${w},${headerHeight - r}
    Q ${w},${headerHeight} ${w - r},${headerHeight}
    L ${sideWidth},${headerHeight}
    L ${sideWidth},${headerHeight + contentHeight}
    L ${no + nw},${headerHeight + contentHeight}
    L ${no + nw},${headerHeight + contentHeight + nh}
    L ${no},${headerHeight + contentHeight + nh}
    L ${no},${headerHeight + contentHeight}
    L ${r},${headerHeight + contentHeight}
    Q 0,${headerHeight + contentHeight} 0,${headerHeight + contentHeight - r}
    L 0,${headerHeight + r}
    Q 0,${headerHeight} ${r},${headerHeight}
    L ${r},0
    Z
  `.replace(/\s+/g, ' ').trim();

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0 && value <= 99) {
      onCountChange(value);
    }
  };

  return (
    <div className="relative" style={{ width: w, height: totalHeight }}>
      <svg
        width={w}
        height={totalHeight}
        className="absolute"
        style={{ pointerEvents: 'none', top: 0, left: 0 }}
      >
        <path
          d={path}
          fill={highlight ? "#fb923c" : "#f97316"} // Orange-500, brighter when highlighted
          stroke={highlight ? "#ea580c" : "transparent"}
          strokeWidth={highlight ? 3 : 0}
          style={{
            filter: highlight ? 'drop-shadow(0 0 12px rgba(234, 88, 12, 0.8)) drop-shadow(0 0 6px rgba(251, 146, 60, 0.6))' : undefined,
            transition: 'all 0.2s ease-out',
          }}
        />
      </svg>
      {/* Header with "repeat" text and number input */}
      <div
        className="absolute flex items-center justify-center gap-2"
        style={{
          left: 0,
          top: 0,
          width: w,
          height: headerHeight,
          paddingTop: nh + 4,
          paddingBottom: 4,
        }}
      >
        <span className="text-sm font-semibold text-white">repeat</span>
        <input
          type="number"
          min="1"
          max="99"
          value={count}
          onChange={handleCountChange}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="w-12 h-6 rounded-full bg-white text-gray-900 text-sm font-semibold text-center border-0 focus:outline-none focus:ring-2 focus:ring-orange-300"
          style={{ pointerEvents: 'auto' }}
        />
        <span className="text-sm font-semibold text-white">times</span>
      </div>
      {/* Content area for nested blocks - positioned tightly with small padding */}
      <div
        ref={contentRef}
        className="absolute"
        style={{
          left: sideWidth + INNER_PADDING_LEFT,
          top: headerHeight + INNER_PADDING_TOP,
          width: w - sideWidth - INNER_PADDING_LEFT * 2,
          margin: 0,
          padding: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
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
    <div className="border rounded-xl p-4 bg-white space-y-4 overflow-y-auto h-full flex flex-col">
      <div className="flex-shrink-0">
        <h2 className="text-lg font-semibold mb-2">Level {level.id}: {level.name}</h2>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{level.instructions}</p>
      </div>
      <div className="border-t pt-4 flex-shrink-0">
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
  heading,
}: {
  level: LevelConfig;
  loopyPos: { x: number; y: number };
  heading: Heading;
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

  // Compute sprite properties based on heading
  const direction = headingToDirection(heading);
  const spritePath = getSpritePath(direction);
  const flipVertical = needsVerticalFlip(direction);

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
            src={spritePath}
            alt="Loopy"
            width={tileSize}
            height={tileSize}
            style={{
              imageRendering: "pixelated",
              transform: flipVertical ? "scaleY(-1)" : undefined,
            }}
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
    touchAction: "none", // Prevent default touch behaviors on the block
    WebkitUserSelect: "none", // Prevent text selection on iOS
    userSelect: "none",
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
      suppressHydrationWarning
    >
      <button
        onClick={handleClick}
        className="w-full"
        style={{ pointerEvents: isDragging ? 'none' : 'auto' }}
      >
        {blockType === BlockType.REPEAT ? (
          <RepeatBlockShape
            count={2}
            onCountChange={() => {}}
          />
        ) : (
          <BlockShape 
            width={BLOCK_WIDTH} 
            height={BLOCK_HEIGHT}
            color={blockType === BlockType.WHEN_RUN_CLICKED ? "#22c55e" : "#2563eb"}
          >
            <span className="text-sm font-semibold text-white">{labelForBlockType(blockType)}</span>
          </BlockShape>
        )}
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
  onUpdateBlock?: (id: string, updates: Partial<Block>) => void;
  allBlocksForNesting?: Block[]; // All blocks for finding nested children
};

function DraggableBlock({ 
  block, 
  highlight: externalHighlight = false,
  isDragging: externalIsDragging = false,
  onDragPositionUpdate,
  onUpdateBlock,
  allBlocksForNesting = [],
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

  // Handle REPEAT block count update
  const handleRepeatCountChange = (count: number) => {
    if (block.type === BlockType.REPEAT && onUpdateBlock) {
      onUpdateBlock(block.id, { count } as Partial<Block>);
    }
  };

  // Find nested blocks inside REPEAT block (from children property)
  const nestedBlocks: Block[] = [];
  if (block.type === BlockType.REPEAT) {
    nestedBlocks.push(...(block.children || []));
  }

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
    touchAction: "none", // Prevent default touch behaviors (scrolling, zooming) on the block itself
    WebkitUserSelect: "none", // Prevent text selection on iOS
    userSelect: "none",
  };

  // Render REPEAT block with special C-shape
  if (block.type === BlockType.REPEAT) {
    return (
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        style={style}
        className="inline-flex"
        suppressHydrationWarning
      >
        <RepeatBlockShape
          count={block.count}
          onCountChange={handleRepeatCountChange}
          highlight={finalHighlight}
        >
          {/* Render nested blocks inside the repeat */}
          {nestedBlocks.length > 0 && (
            <div 
              className="relative" 
              style={{ 
                width: '100%',
                margin: 0,
                padding: 0,
                minHeight: 0,
              }}
            >
              {nestedBlocks.map((nestedBlock, idx) => {
                return (
                  <div
                    key={nestedBlock.id}
                    style={{
                      position: "absolute",
                      left: 0,
                      top: idx * (BLOCK_HEIGHT + BLOCK_SPACING),
                      margin: 0,
                      padding: 0,
                    }}
                  >
                    <DraggableBlock
                      block={{ ...nestedBlock, position: { x: 0, y: 0 } }}
                      allBlocksForNesting={allBlocksForNesting}
                      onUpdateBlock={onUpdateBlock}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </RepeatBlockShape>
      </div>
    );
  }

  // Render regular blocks
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={style}
      className="inline-flex min-w-[180px] max-w-[260px]"
      suppressHydrationWarning
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
  onUpdateBlock,
}: {
  program: Block[];
  onRun: () => void;
  onReset: () => void;
  runStatus: "idle" | "running" | "success" | "crash";
  workspaceRef: React.RefObject<HTMLDivElement | null>;
  activeDragId: string | null;
  dragPosition: { x: number; y: number } | null;
  onUpdateBlock?: (id: string, updates: Partial<Block>) => void;
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
        className="flex-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 relative overflow-auto min-h-[200px] md:min-h-[400px]"
        style={{ 
          height: "400px",
          touchAction: "pan-y pinch-zoom", // Allow vertical scrolling while dragging
        }}
        suppressHydrationWarning
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
            
            // Skip rendering blocks that are nested inside REPEAT blocks (check children property)
            const isNestedInRepeat = program.some(b => 
              b.type === BlockType.REPEAT && 
              b.children && 
              b.children.some(child => child.id === block.id)
            );
            
            if (isNestedInRepeat) {
              return null; // Don't render nested blocks here, they're rendered inside the REPEAT block
            }
            
            return (
              <DraggableBlock
                key={block.id}
                block={{ ...block, position: displayPosition }}
                highlight={block.id === highlightedBlockId}
                isDragging={block.id === activeDragId}
                onDragPositionUpdate={handleDragPositionUpdate}
                onUpdateBlock={onUpdateBlock}
                allBlocksForNesting={program}
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
  const [heading, setHeading] = useState<Heading>((level.initialHeading ?? 90) as Heading); // Use level's initialHeading or default to 90° (right)
  const [runStatus, setRunStatus] = useState<"idle" | "running" | "success" | "crash">("idle");
  
  // Drag & drop state
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [activeBlockTemplate, setActiveBlockTemplate] = useState<BlockType | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  // Configure sensors for better mobile touch support
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts (prevents accidental drags)
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 200ms delay for touch to prevent conflicts with scrolling
        tolerance: 8, // 8px tolerance for touch movement
      },
    })
  );

  // Load progress on mount
  useEffect(() => {
    const loaded = loadProgress();
    setProgress(loaded);
    // Load the saved current level, or default to first unlocked level
    if (loaded.currentLevel && loaded.unlockedLevels.includes(loaded.currentLevel)) {
      setCurrentLevelId(loaded.currentLevel);
    } else if (loaded.unlockedLevels.length > 0) {
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
    setHeading((newLevel.initialHeading ?? 90) as Heading); // Use level's initialHeading or default to 90° (right)
    setRunStatus("idle");
  }, [currentLevelId, initializeWorkspace]);

  // Save current level to progress whenever it changes
  useEffect(() => {
    setProgress((prevProgress) => {
      const updatedProgress: Progress = {
        ...prevProgress,
        currentLevel: currentLevelId,
      };
      saveProgress(updatedProgress);
      return updatedProgress;
    });
  }, [currentLevelId]);

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

  const handleUpdateBlock = useCallback((id: string, updates: Partial<Block>) => {
    if (runStatus === "running") return;
    setProgram(prev => prev.map(block => {
      if (block.id === id) {
        if (block.type === BlockType.REPEAT && 'count' in updates) {
          return { ...block, count: updates.count as number } as Block;
        }
        return { ...block, ...updates } as Block;
      }
      return block;
    }));
  }, [runStatus]);

  const handleReset = useCallback(() => {
    if (runStatus === "running") return;
    setProgram(initializeWorkspace());
    setLoopyPos(level.start);
    setHeading((level.initialHeading ?? 90) as Heading); // Use level's initialHeading or default to 90° (right)
    setRunStatus("idle");
  }, [level.start, level.initialHeading, runStatus, initializeWorkspace]);

  const handleResetGame = useCallback(() => {
    // Clear localStorage
    clearProgress();

    // Reset progress state
    const defaultProgress: Progress = { unlockedLevels: [1], bestStars: {}, currentLevel: 1 };
    setProgress(defaultProgress);
    saveProgress(defaultProgress);

    // Reset to level 1
    const firstLevel = getLevelById(1);
    setCurrentLevelId(1);
    setProgram([]);
    setLoopyPos(firstLevel.start);
    setRunStatus("idle");
    setHeading((firstLevel.initialHeading ?? 90) as Heading); // Use level's initialHeading or default to 90° (right)
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
    const steps = expandProgram(attachedBlocks, program);
    let currentPos = level.start;
    let currentHeading: Heading = (level.initialHeading ?? 90) as Heading; // Use level's initialHeading or default to 90° (right)
    setLoopyPos(currentPos);
    setHeading(currentHeading);

    for (let i = 0; i < steps.length; i++) {
      await sleep(300);
      const step = steps[i];

      // Handle direction blocks (POINT_*)
      const newHeading = getHeadingFromBlockType(step);
      if (newHeading !== null) {
        currentHeading = newHeading;
        setHeading(currentHeading);
        // Continue to next step - direction blocks don't move Loopy, just change heading
        continue;
      }

      // Handle MOVE_FORWARD
      if (step === BlockType.MOVE_FORWARD) {
        const newPos = applyMoveForward(currentPos, currentHeading);

        // Check for crashes (out of bounds or wall)
        if (isOutOfBounds(newPos, level) || isWall(newPos, level)) {
          setLoopyPos(newPos);
          setRunStatus("crash");
          return;
        }

        currentPos = newPos;
        setLoopyPos(currentPos);
        continue;
      }

      // Legacy movement blocks (for backward compatibility)
      if (
        step === BlockType.MOVE_UP ||
        step === BlockType.MOVE_DOWN ||
        step === BlockType.MOVE_LEFT ||
        step === BlockType.MOVE_RIGHT
      ) {
        const newPos = applyMove(currentPos, step);
        
        // Update heading based on legacy move (for sprite orientation)
        if (step === BlockType.MOVE_LEFT) currentHeading = 270;
        else if (step === BlockType.MOVE_RIGHT) currentHeading = 90;
        else if (step === BlockType.MOVE_UP) currentHeading = 0;
        else if (step === BlockType.MOVE_DOWN) currentHeading = 180;
        setHeading(currentHeading);

        if (isOutOfBounds(newPos, level) || isWall(newPos, level)) {
          setLoopyPos(newPos);
          setRunStatus("crash");
          return;
        }

        currentPos = newPos;
        setLoopyPos(currentPos);
        continue;
      }
    }

    // Check if reached goal
    if (currentPos.x === level.goal.x && currentPos.y === level.goal.y) {
      setRunStatus("success");
      
      // Calculate stars and update progress (use attached blocks count for scoring)
      const stars = calculateStars(attachedBlocks.length, level.optimalBlockCount);
      const currentBest = progress.bestStars[level.id] || 0;
      
      let updatedProgress = progress;
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
        updatedProgress = newProgress;
      }
      
      // Auto-advance to next level after a short delay
      const nextLevelId = level.id + 1;
      const nextLevel = LEVELS.find(l => l.id === nextLevelId);
      if (nextLevel && updatedProgress.unlockedLevels.includes(nextLevelId)) {
        await sleep(1500); // Wait 1.5 seconds to show success state
        setCurrentLevelId(nextLevelId);
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
    <main className="min-h-screen p-3 md:p-6 bg-gray-50">
      <div className="max-w-6xl mx-auto h-[95vh] md:h-[95vh] flex flex-col gap-2 md:gap-4">
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
          sensors={sensors}
          onDragStart={handleDragStart} 
          onDragEnd={handleDragEnd}
        >
          <div
            className="flex-1 grid gap-4 grid-cols-1 md:grid-cols-2"
            style={{
              gridTemplateRows: "auto auto",
            }}
          >
            <div className="md:row-span-1 h-full flex">
              <InstructionsPanel level={level} runStatus={runStatus} />
            </div>
            <div className="h-full min-h-[250px] md:min-h-0 flex">
              <GameBoard level={level} loopyPos={loopyPos} heading={heading} />
            </div>
            <div className="md:row-span-1">
              <BlockPalette level={level} onAddBlock={handleAddBlock} />
            </div>
            <div className="md:row-span-1">
              <WorkspacePanel
                program={program}
                onRun={handleRunProgram}
                onReset={handleReset}
                runStatus={runStatus}
                workspaceRef={workspaceRef}
                activeDragId={activeBlockId}
                dragPosition={dragPosition}
                onUpdateBlock={handleUpdateBlock}
              />
            </div>
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

