// The rules of the game. There is no clock here: a command updates the state at
// once, and the events it returns are a record of what happened. Whoever called
// apply() decides how, or whether, to show them over time.

import { type Recipe, RECIPES } from "./recipes.ts";
import {
  BOX_CENTER,
  isPassable,
  luckAt,
  type Terrain,
  terrainAt,
  TERRAINS,
} from "./terrain.ts";

export type Cell = { x: number; y: number };

export type Direction = "north" | "south" | "east" | "west";

// Plain data that survives JSON. Terrain is absent because the seed can recompute
// it: besides the seed, only what the player has caused belongs here.
export type GameState = {
  seed: number;
  player: Cell;
  inventory: Record<string, number>;
  gathered: Record<string, boolean>;
  unlocked: boolean;
};

// Command: https://gameprogrammingpatterns.com/command.html
export type Command =
  | { type: "move"; direction: Direction }
  | { type: "gather" }
  | { type: "craft"; recipe: string };

// Domain Event: https://martinfowler.com/eaaDev/DomainEvent.html
export type GameEvent =
  | { type: "moved"; from: Cell; to: Cell }
  | { type: "blocked"; at: Cell; toward: Cell; terrain: Terrain }
  | {
    type: "gathered";
    at: Cell;
    item: string;
    inventory: Record<string, number>;
  }
  | { type: "missed"; at: Cell; terrain: Terrain; item: string }
  | { type: "foundNothing"; at: Cell }
  | { type: "crafted"; recipe: string; inventory: Record<string, number> }
  | { type: "craftFailed"; recipe: string; missing: Record<string, number> }
  | { type: "unlocked"; at: Cell }

const STEPS: Record<Direction, Cell> = {
  north: { x: 0, y: -1 },
  south: { x: 0, y: 1 },
  east: { x: 1, y: 0 },
  west: { x: -1, y: 0 },
};

// Singleton, avoided on purpose: tests make as many games as they need. https://gameprogrammingpatterns.com/singleton.html
export function newGame(seed: number): GameState {
  return { seed, player: { x: 0, y: 0 }, inventory: {}, gathered: {}, unlocked: false };
}

// The single way in. It updates the state it is given and returns the events.
export function apply(state: GameState, command: Command): GameEvent[] {
  switch (command.type) {
    case "move":
      return move(state, command.direction);
    case "gather":
      return gather(state);
    case "craft":
      return craft(state, command.recipe);
  }
}

export function missingFor(
  state: GameState,
  recipe: Recipe,
): Record<string, number> {
  const missing: Record<string, number> = {};
  for (const [item, count] of Object.entries(recipe.inputs)) {
    const have = state.inventory[item] ?? 0;
    if (have < count) missing[item] = count - have;
  }
  return missing;
}

function craft(state: GameState, name: string): GameEvent[] {
  const recipe = RECIPES.find((row) => row.output === name);
  if (!recipe) return [];
  const missing = missingFor(state, recipe);
  if (Object.keys(missing).length > 0) {
    return [{ type: "craftFailed", recipe: name, missing }];
  }
  for (const [item, count] of Object.entries(recipe.inputs)) {
    state.inventory[item] -= count;
  }
  state.inventory[name] = (state.inventory[name] ?? 0) + 1;
  const events: GameEvent[] = [
    { type: "crafted", recipe: name, inventory: { ...state.inventory } },
  ];

  if (name === "key" && !state.unlocked) {
    state.unlocked = true;
    events.push({type: "unlocked", at: { ...BOX_CENTER}})
  }

  return events;
}

export function keyOf(cell: Cell): string {
  return `${cell.x},${cell.y}`;
}

export function cellAt(state: GameState, cell: Cell) {
  return {
    terrain: terrainAt(state.seed, cell.x, cell.y),
    gathered: state.gathered[keyOf(cell)] ?? false,
  };
}

function gather(state: GameState): GameEvent[] {
  const at = { ...state.player };
  const { terrain, gathered } = cellAt(state, at);
  if (gathered) return [{ type: "foundNothing", at }];
  const row = TERRAINS[terrain];
  state.gathered[keyOf(at)] = true;
  if (luckAt(state.seed, at.x, at.y) >= row.chance) {
    return [{ type: "missed", at, terrain, item: row.yields }];
  }
  state.inventory[row.yields] = (state.inventory[row.yields] ?? 0) + 1;
  return [{
    type: "gathered",
    at,
    item: row.yields,
    inventory: { ...state.inventory },
  }];
}

function move(state: GameState, direction: Direction): GameEvent[] {
  const step = STEPS[direction];
  // Events are retained and played back later, while state keeps changing. So an
  // event gets cells of its own, never an object that state still holds.
  // Aliasing Bug: https://martinfowler.com/bliki/AliasingBug.html
  // Cells in events act as a Value Object: https://martinfowler.com/bliki/ValueObject.html
  const from = { ...state.player };
  const to = { x: from.x + step.x, y: from.y + step.y };
  const terrain = terrainAt(state.seed, to.x, to.y);
  const open = isPassable(terrain) || (terrain === "box" && state.unlocked);
  if (!open) {
    return [{ type: "blocked", at: from, toward: to, terrain }];
  }
  state.player.x = to.x;
  state.player.y = to.y;
  return [{ type: "moved", from, to }];
}
