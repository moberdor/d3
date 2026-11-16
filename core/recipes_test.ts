import { assert, assertEquals } from "@std/assert";
import { apply, newGame, RECIPES, TERRAINS } from "./mod.ts";

const SEED = 121;

Deno.test("crafting spends the inputs and adds the output", () => {
  const recipe = RECIPES[0];
  const state = newGame(SEED);
  state.inventory = { ...recipe.inputs };

  const events = apply(state, { type: "craft", recipe: recipe.output });

  for (const item of Object.keys(recipe.inputs)) {
    assertEquals(state.inventory[item], 0);
  }
  assertEquals(state.inventory[recipe.output], 1);
  assertEquals(events, [
    { type: "crafted", recipe: recipe.output, inventory: state.inventory },
  ]);
});

Deno.test("a failed craft changes nothing and says what is missing", () => {
  const recipe = RECIPES[0];
  const state = newGame(SEED);
  const snapshot = JSON.parse(JSON.stringify(state));

  const events = apply(state, { type: "craft", recipe: recipe.output });

  assertEquals(state, snapshot);
  assertEquals(events, [
    { type: "craftFailed", recipe: recipe.output, missing: recipe.inputs },
  ]);
});

Deno.test("every recipe input can be gathered or made", () => {
  const sources = new Set([
    ...Object.values(TERRAINS).map((row) => row.yields),
    ...RECIPES.map((recipe) => recipe.output),
  ]);
  for (const recipe of RECIPES) {
    for (const item of Object.keys(recipe.inputs)) {
      assert(
        sources.has(item),
        `${recipe.output} needs ${item}, but nothing gives it`,
      );
    }
  }
});
