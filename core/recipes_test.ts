import { assert, assertEquals } from "@std/assert";
import { apply, newGame, type Recipe, RECIPES, TERRAINS } from "./mod.ts";

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

function reachable(recipes: Recipe[]): Set<string> {
  const have = new Set<string>(
    Object.values(TERRAINS)
      .map((row) => row.yields)
      .filter((item) => item !== ""),
  );

  have.add("scrap");
  have.add("iron");
  have.add("key");
  have.add("gem");

  let changed = true;

  while (changed) {
    changed = false;

    for (const recipe of recipes) {
      if (have.has(recipe.output)) continue;

      if (Object.keys(recipe.inputs).every((item) => have.has(item))) {
        have.add(recipe.output);
        changed = true;
      }
    }
  }

  return have;
}

Deno.test("every recipe output is reachable", () => {
  const have = reachable(RECIPES);
  for (const recipe of RECIPES) {
    assert(have.has(recipe.output), `${recipe.output} can never be made`);
  }
});

Deno.test("a recipe that needs its own output is unreachable", () => {
  const broken: Recipe[] = [
    ...RECIPES,
    { output: "loop", inputs: { loop: 1, wood: 1 } },
  ];
  assert(!reachable(broken).has("loop"));
});
