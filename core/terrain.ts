// The world is a pure function of a seed and coordinates. Nothing here is stored,
// so the world can be effectively unbounded while saved state stays small.

export type Terrain =
  | "grass"
  | "forest"
  | "stone"
  | "shallow_water"
  | "mountain"
  | "deep_water"
  | "ship"
  | "barrier"
  | "box"
  | "chest";

export const TERRAINS: Record<Terrain, { yields: string; chance: number }> = {
  grass: { yields: "fiber", chance: 0.8 },
  forest: { yields: "wood", chance: 1 },
  stone: { yields: "stone", chance: 1 },
  mountain: { yields: "iron", chance: 1 },
  shallow_water: { yields: "scrap", chance: 0 },
  deep_water: { yields: "scrap", chance: 0 },
  barrier: { yields: "wood", chance: 1 },
  box: { yields: "wood", chance: 0 },
  ship: { yields: "key", chance: 1 },
  chest: { yields: "gem", chance: 1 },
};

export const BOX_CENTER = { x: -5, y: -4 };
export const SHIP_CENTER = { x: 18, y: -8 };

export function terrainAt(seed: number, x: number, y: number): Terrain {
  const dx = x - BOX_CENTER.x;
  const dy = y - BOX_CENTER.y;

  if (dx === 0 && dy === 0) return "chest";

  //more it has more x shape for treasure hunt pirate theme
  if (
    (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) ||
    (Math.abs(dx) === 2 && Math.abs(dy) === 2)
  ) {
    return "box";
  }

  if (y >= 12 && y <= 13 && x >= -15 && x <= 15) return "barrier";
  if (x === SHIP_CENTER.x && y === SHIP_CENTER.y) {
    return "ship";
  }

  const distance = Math.hypot(x - SHIP_CENTER.x, y - SHIP_CENTER.y);
  const edge = (noise(seed + 10, x, y, 4) - 0.5) * 2;

  if (distance < 4 + edge) return "deep_water";
  if (distance < 6 + edge) return "shallow_water";

  const raw = 0.65 * noise(seed, x, y, 9) + 0.35 * noise(seed + 1, x, y, 3);
  // Every game starts at the origin, so flatten the land there. Otherwise some
  // seeds would start inside a lake or walled into a pocket.
  const height = 0.5 + (raw - 0.5) * Math.min(1, Math.hypot(x, y) / 10);
  if (height < 0.22) return "deep_water";
  if (height < 0.32) return "shallow_water";

  if (height > 0.72) return "mountain";

  if (height > 0.55 && noise(seed + 4, x, y, 2) > 0.78) {
    return "stone";
  }
  return noise(seed + 2, x, y, 6) < 0.45 ? "forest" : "grass";
}

export function isPassable(terrain: Terrain): boolean {
  return terrain !== "shallow_water" &&
    terrain !== "deep_water" &&
    terrain !== "mountain" &&
    terrain !== "barrier" &&
    terrain !== "box";
}
export function luckAt(seed: number, x: number, y: number): number {
  return gridValue(seed + 3, x, y);
}

// Value noise: random numbers at coarse grid points, blended between them, so
// that terrain forms regions instead of static.
function noise(seed: number, x: number, y: number, scale: number): number {
  const left = Math.floor(x / scale);
  const top = Math.floor(y / scale);
  const blendX = smooth(x / scale - left);
  const blendY = smooth(y / scale - top);
  return mix(
    mix(gridValue(seed, left, top), gridValue(seed, left + 1, top), blendX),
    mix(
      gridValue(seed, left, top + 1),
      gridValue(seed, left + 1, top + 1),
      blendX,
    ),
    blendY,
  );
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// A hash, not a generator: the same inputs give the same number in [0, 1), with
// no memory of earlier calls.
function gridValue(seed: number, x: number, y: number): number {
  let hash = Math.imul(seed, 0x9e3779b1) ^ Math.imul(x, 0x85ebca6b) ^
    Math.imul(y, 0xc2b2ae35);
  hash = Math.imul(hash ^ (hash >>> 15), 0x2c1b3c6d);
  hash = Math.imul(hash ^ (hash >>> 12), 0x297a2d39);
  return ((hash ^ (hash >>> 15)) >>> 0) / 2 ** 32;
}
