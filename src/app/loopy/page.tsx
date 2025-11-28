"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { LEVELS, getLevelById, BlockType, type Block, type LevelConfig } from "@/loopy/levels";
import { loadProgress, saveProgress, type Progress } from "@/loopy/progress";

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
  const tileSize = 64;

  return (
    <div className="border rounded-xl p-4 bg-sky-50 flex items-center justify-center">
      <div
        className="relative bg-sky-900 rounded-xl border border-slate-700 overflow-hidden"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${level.width}, ${tileSize}px)`,
          gridTemplateRows: `repeat(${level.height}, ${tileSize}px)`,
          imageRendering: "pixelated" as const,
        }}
      >
        {level.grid.map((tile, index) => {
          const x = index % level.width;
          const y = Math.floor(index / level.width);
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
                <Image
                  src="/game_assets/apple.png"
                  alt="goal"
                  width={tileSize}
                  height={tileSize}
                  className="absolute inset-0"
                  style={{ imageRendering: "pixelated" }}
                />
              )}
            </div>
          );
        })}
        <div
          className="absolute transition-all duration-200 z-10"
          style={{
            left: loopyPos.x * tileSize,
            top: loopyPos.y * tileSize,
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

function BlockPalette({
  level,
  onAddBlock,
}: {
  level: LevelConfig;
  onAddBlock: (block: Block) => void;
}) {
  const getBlockLabel = (type: BlockType): string => {
    switch (type) {
      case BlockType.MOVE_UP: return "Move Up";
      case BlockType.MOVE_DOWN: return "Move Down";
      case BlockType.MOVE_LEFT: return "Move Left";
      case BlockType.MOVE_RIGHT: return "Move Right";
      case BlockType.REPEAT: return "Repeat";
      default: return type;
    }
  };

  const handleClick = (type: BlockType) => {
    if (type === BlockType.REPEAT) {
      onAddBlock({
        id: `repeat-${Date.now()}`,
        type: BlockType.REPEAT,
        count: 2,
        children: [],
      });
    } else {
      onAddBlock({
        id: `move-${Date.now()}`,
        type: type as BlockType.MOVE_UP | BlockType.MOVE_DOWN | BlockType.MOVE_LEFT | BlockType.MOVE_RIGHT,
      });
    }
  };

  return (
    <div className="border rounded-xl p-4 bg-white overflow-y-auto">
      <h3 className="text-sm font-semibold mb-3 text-gray-700">Block Palette</h3>
      <div className="space-y-2">
        {level.allowedBlocks.map((type) => (
          <button
            key={type}
            onClick={() => handleClick(type)}
            className="w-full px-4 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm transition-colors"
          >
            {getBlockLabel(type)}
          </button>
        ))}
      </div>
    </div>
  );
}

function WorkspacePanel({
  program,
  onRemoveBlock,
  onRun,
  onReset,
  runStatus,
}: {
  program: Block[];
  onRemoveBlock: (id: string) => void;
  onRun: () => void;
  onReset: () => void;
  runStatus: "idle" | "running" | "success" | "crash";
}) {
  const getBlockLabel = (block: Block): string => {
    if (block.type === BlockType.REPEAT) {
      return `Repeat x${block.count} (children not used yet)`;
    }
    switch (block.type) {
      case BlockType.MOVE_UP: return "Move Up";
      case BlockType.MOVE_DOWN: return "Move Down";
      case BlockType.MOVE_LEFT: return "Move Left";
      case BlockType.MOVE_RIGHT: return "Move Right";
      default: return block.type;
    }
  };

  return (
    <div className="border rounded-xl p-4 bg-white flex flex-col">
      <h3 className="text-sm font-semibold mb-3 text-gray-700">Your Program</h3>
      <div className="flex-1 overflow-y-auto space-y-2 mb-4 min-h-[100px]">
        {program.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No blocks yet. Add blocks from the palette!</p>
        ) : (
          program.map((block, index) => (
            <div
              key={block.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 border border-gray-200"
            >
              <span className="text-xs text-gray-500 w-6">{index + 1}.</span>
              <span className="flex-1 text-sm font-medium">{getBlockLabel(block)}</span>
              <button
                onClick={() => onRemoveBlock(block.id)}
                className="px-2 py-1 rounded text-xs bg-red-100 hover:bg-red-200 text-red-700 font-medium"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-2 border-t pt-4">
        <button
          onClick={onRun}
          disabled={runStatus === "running" || program.length === 0}
          className="flex-1 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold transition-colors"
        >
          Run
        </button>
        <button
          onClick={onReset}
          disabled={runStatus === "running"}
          className="flex-1 px-4 py-2 rounded-lg bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold transition-colors"
        >
          Reset
        </button>
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

  // Load progress on mount
  useEffect(() => {
    const loaded = loadProgress();
    setProgress(loaded);
    if (loaded.unlockedLevels.length > 0) {
      setCurrentLevelId(loaded.unlockedLevels[0]);
    }
  }, []);

  // Reset game state when level changes
  useEffect(() => {
    const newLevel = getLevelById(currentLevelId);
    setProgram([]);
    setLoopyPos(newLevel.start);
    setLastDirection("right");
    setRunStatus("idle");
  }, [currentLevelId]);

  const handleAddBlock = useCallback((block: Block) => {
    if (runStatus === "running") return;
    setProgram(prev => [...prev, block]);
  }, [runStatus]);

  const handleRemoveBlock = useCallback((id: string) => {
    if (runStatus === "running") return;
    setProgram(prev => prev.filter(b => b.id !== id));
  }, [runStatus]);

  const handleReset = useCallback(() => {
    if (runStatus === "running") return;
    setProgram([]);
    setLoopyPos(level.start);
    setLastDirection("right");
    setRunStatus("idle");
  }, [level.start, runStatus]);

  const handleRunProgram = useCallback(async () => {
    if (runStatus === "running" || program.length === 0) return;

    setRunStatus("running");
    const moves = expandProgram(program);
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
      
      // Calculate stars and update progress
      const stars = calculateStars(program.length, level.optimalBlockCount);
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

  return (
    <main className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-6xl mx-auto h-[80vh] flex flex-col gap-4">
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
        </div>

        {/* Main game grid */}
        <div
          className="flex-1 grid gap-4"
          style={{
            gridTemplateColumns: "280px 1fr",
            gridTemplateRows: "1fr 220px",
          }}
        >
          <InstructionsPanel level={level} runStatus={runStatus} />
          <GameBoard level={level} loopyPos={loopyPos} lastDirection={lastDirection} />
          <BlockPalette level={level} onAddBlock={handleAddBlock} />
          <WorkspacePanel
            program={program}
            onRemoveBlock={handleRemoveBlock}
            onRun={handleRunProgram}
            onReset={handleReset}
            runStatus={runStatus}
          />
        </div>
      </div>
    </main>
  );
}

