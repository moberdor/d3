import { assertEquals } from "@std/assert";
import { apply, CAPSTONE, type Command, newGame, RECIPES } from "./mod.ts";

const SEED = 121;

Deno.test("crafting the capstone ends the game and nothing changes after", () => {
  const capstone = RECIPES.find((recipe) => recipe.output === CAPSTONE)!;
  const state = newGame(SEED);
  state.inventory = { ...capstone.inputs };

  const events = apply(state, { type: "craft", recipe: CAPSTONE });

  assertEquals(events.at(-1), { type: "finished", recipe: CAPSTONE });
  const snapshot = JSON.parse(JSON.stringify(state));
  const commands: Command[] = [
    { type: "move", direction: "east" },
    { type: "gather" },
    { type: "craft", recipe: "rope" },
  ];
  for (const command of commands) {
    assertEquals(apply(state, command), []);
  }
  assertEquals(state, snapshot);
});
