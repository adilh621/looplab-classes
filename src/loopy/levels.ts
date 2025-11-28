export type TileType = "empty" | "wall" | "start" | "goal";

export enum BlockType {
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
    allowedBlocks: [BlockType.MOVE_RIGHT],
    optimalBlockCount: 4,
    instructions: "Help Loopy reach the apple! Use the Move Right block to make Loopy crawl to the goal.",
    hint: "You'll need 4 Move Right blocks to reach the apple.",
  },
  {
    id: 2,
    name: "Up and Over",
    width: 5,
    height: 4,
    grid: createGrid(5, 4, [
      ["empty", "empty", "empty", "empty", "goal"],
      ["empty", "empty", "empty", "empty", "empty"],
      ["empty", "empty", "empty", "empty", "empty"],
      ["start", "empty", "empty", "empty", "empty"],
    ]),
    start: { x: 0, y: 3 },
    goal: { x: 4, y: 0 },
    allowedBlocks: [BlockType.MOVE_RIGHT, BlockType.MOVE_UP],
    optimalBlockCount: 4,
    instructions: "Loopy needs to go right and then up to reach the apple. Try using Move Right and Move Up blocks!",
    hint: "You'll need to move right 4 times, then up 3 times. Or move up first, then right!",
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
    allowedBlocks: [BlockType.MOVE_RIGHT, BlockType.MOVE_UP, BlockType.MOVE_LEFT, BlockType.MOVE_DOWN],
    optimalBlockCount: 6,
    instructions: "There's a wall blocking the direct path! Find a way around it to reach the apple.",
    hint: "Go up first, then right around the wall, then up again to reach the goal.",
  },
];

export function getLevelById(id: number): LevelConfig {
  const level = LEVELS.find(l => l.id === id);
  if (!level) {
    throw new Error(`Level ${id} not found`);
  }
  return level;
}

