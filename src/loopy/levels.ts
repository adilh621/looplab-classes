export type TileType = "empty" | "wall" | "start" | "goal";

export enum BlockType {
  // New heading-based movement system
  POINT_UP = "POINT_UP",           // Set heading to 0°
  POINT_RIGHT = "POINT_RIGHT",     // Set heading to 90°
  POINT_DOWN = "POINT_DOWN",       // Set heading to 180°
  POINT_LEFT = "POINT_LEFT",       // Set heading to 270°
  MOVE_FORWARD = "MOVE_FORWARD",   // Move one tile in current heading
  // Legacy movement blocks (deprecated, kept for backward compatibility)
  MOVE_UP = "MOVE_UP",
  MOVE_DOWN = "MOVE_DOWN",
  MOVE_LEFT = "MOVE_LEFT",
  MOVE_RIGHT = "MOVE_RIGHT",
  REPEAT = "REPEAT",
  WHEN_RUN_CLICKED = "WHEN_RUN_CLICKED",
}

export type BlockPosition = {
  x: number; // pixels inside workspace
  y: number;
};

export type BlockConnection = {
  nextBlockId: string | null;  // the block snapped directly below this one
  prevBlockId: string | null;  // the block snapped directly above
};

export type BaseBlock = {
  id: string;
  type: BlockType;
  position: BlockPosition;
  connection: BlockConnection;
};

export type MoveBlock = BaseBlock & {
  type:
    | BlockType.POINT_UP
    | BlockType.POINT_RIGHT
    | BlockType.POINT_DOWN
    | BlockType.POINT_LEFT
    | BlockType.MOVE_FORWARD
    | BlockType.MOVE_UP
    | BlockType.MOVE_DOWN
    | BlockType.MOVE_LEFT
    | BlockType.MOVE_RIGHT;
};

export type RepeatBlock = BaseBlock & {
  type: BlockType.REPEAT;
  count: number;
  children: Block[]; // keep for future nested logic; we don't rely on it yet
};

export type WhenRunClickedBlock = BaseBlock & {
  type: BlockType.WHEN_RUN_CLICKED;
};

export type Block = MoveBlock | RepeatBlock | WhenRunClickedBlock;

export type LevelConfig = {
  id: number;
  name: string;
  width: number;
  height: number;
  grid: TileType[];       // length = width * height
  start: { x: number; y: number };
  goal: { x: number; y: number };
  allowedBlocks: BlockType[];
  optimalBlockCount: number;
  instructions: string;
  hint: string;
  initialHeading?: number; // Optional initial heading in degrees (0, 90, 180, 270). Defaults to 90° (right)
};

// Helper to create grid from 2D array representation
function createGrid(width: number, height: number, tiles: string[][]): TileType[] {
  const grid: TileType[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = tiles[y]?.[x] || "empty";
      grid.push(tile as TileType);
    }
  }
  return grid;
}

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: "First Crawl",
    width: 5,
    height: 3,
    grid: createGrid(5, 3, [
      ["empty", "empty", "empty", "empty", "empty"],
      ["start", "empty", "empty", "empty", "goal"],
      ["empty", "empty", "empty", "empty", "empty"],
    ]),
    start: { x: 0, y: 1 },
    goal: { x: 4, y: 1 },
    allowedBlocks: [BlockType.POINT_RIGHT, BlockType.MOVE_FORWARD],
    optimalBlockCount: 5, // 1 direction block + 4 move forward blocks
    instructions: "Help Loopy reach the apple! First point Loopy right (90°), then use Move Forward blocks to make Loopy crawl to the goal.",
    hint: "You'll need 1 Point Right (90°) block and 4 Move Forward blocks to reach the apple.",
    initialHeading: 270, // Start facing left (270°)
  },
  {
    id: 2,
    name: "Repeat the Move",
    width: 5,
    height: 3,
    grid: createGrid(5, 3, [
      ["empty", "empty", "empty", "empty", "empty"],
      ["start", "empty", "empty", "empty", "goal"],
      ["empty", "empty", "empty", "empty", "empty"],
    ]),
    start: { x: 0, y: 1 },
    goal: { x: 4, y: 1 },
    allowedBlocks: [BlockType.POINT_RIGHT, BlockType.MOVE_FORWARD, BlockType.REPEAT],
    optimalBlockCount: 3, // 1 direction block + 1 repeat block (containing 1 move forward)
    instructions: "Help Loopy reach the apple! This time, try using a Repeat block to repeat the Move Forward action. First point Loopy right (90°), then use a Repeat block with Move Forward inside it.",
    hint: "Use 1 Point Right (90°) block, then a Repeat block set to 4 with 1 Move Forward block inside it.",
    initialHeading: 270, // Start facing left (270°)
  },
  {
    id: 3,
    name: "Around the Rock",
    width: 6,
    height: 4,
    grid: createGrid(6, 4, [
      ["empty", "empty", "empty", "empty", "empty", "goal"],
      ["empty", "empty", "wall", "empty", "empty", "empty"],
      ["empty", "empty", "wall", "empty", "empty", "empty"],
      ["start", "empty", "empty", "empty", "empty", "empty"],
    ]),
    start: { x: 0, y: 3 },
    goal: { x: 5, y: 0 },
    allowedBlocks: [BlockType.POINT_UP, BlockType.POINT_RIGHT, BlockType.POINT_DOWN, BlockType.POINT_LEFT, BlockType.MOVE_FORWARD],
    optimalBlockCount: 8, // 3 direction blocks + 5 move forward blocks
    instructions: "There's a wall blocking the direct path! Use Point Up (0°), Point Right (90°), Point Down (180°), and Point Left (270°) to set Loopy's heading, then Move Forward to navigate around the wall.",
    hint: "Point Up (0°), move forward 3 times. Then Point Right (90°), move forward 3 times. Then Point Up (0°), move forward 2 times.",
  },
];

export function getLevelById(id: number): LevelConfig {
  const level = LEVELS.find(l => l.id === id);
  if (!level) {
    throw new Error(`Level ${id} not found`);
  }
  return level;
}

