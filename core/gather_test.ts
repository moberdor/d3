import { assertEquals } from "@std/assert";
import {
  apply,
  type GameState,
  keyOf,
  luckAt,
  newGame,
  terrainAt,
  TERRAINS,
} from "./mod.ts";

const SEED = 121;

function standingWhere(lucky: boolean): GameState {
  for (let x = 0; x < 10_000; x++) {
    const chance = TERRAINS[terrainAt(SEED, x, 0)].chance;
    if ((luckAt(SEED, x, 0) < chance) === lucky) {
      return { ...newGame(SEED), player: { x, y: 0 } };
    }
  }
  throw new Error("Found no suitable cell on this row.");
}

Deno.test("gathering adds what the terrain yields", () => {
  const state = standingWhere(true);
  const at = { ...state.player };
  const item = TERRAINS[terrainAt(SEED, at.x, at.y)].yields;

  const events = apply(state, { type: "gather" });

  assertEquals(state.inventory, { [item]: 1 });
  assertEquals(events, [
    { type: "gathered", at, item, inventory: { [item]: 1 } },
  ]);
});

Deno.test("a kept gathered event does not change after a later gather", () => {
  const state = newGame(SEED);
  const kept = apply(state, { type: "gather" });
  const copy = JSON.parse(JSON.stringify(kept));

  apply(state, { type: "move", direction: "east" });
  apply(state, { type: "gather" });

  assertEquals(kept, copy);
});

Deno.test("an unlucky gather gives nothing but uses up the cell", () => {
  const state = standingWhere(false);
  const at = { ...state.player };
  const terrain = terrainAt(SEED, at.x, at.y);

  const events = apply(state, { type: "gather" });

  assertEquals(state.inventory, {});
  assertEquals(state.gathered, { [keyOf(at)]: true });
  assertEquals(events, [
    { type: "missed", at, terrain, item: TERRAINS[terrain].yields },
  ]);
});

Deno.test("gathering twice from one cell gives nothing the second time", () => {
  const state = standingWhere(true);
  apply(state, { type: "gather" });
  const snapshot = JSON.parse(JSON.stringify(state));

  const events = apply(state, { type: "gather" });

  assertEquals(state, snapshot);
  assertEquals(events, [{ type: "foundNothing", at: snapshot.player }]);
});

Deno.test("saved state holds only the cells that changed", () => {
  const state = standingWhere(true);

  apply(state, { type: "gather" });

  assertEquals(Object.keys(state.gathered), [keyOf(state.player)]);
});
