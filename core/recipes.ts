export type Recipe = { output: string; inputs: Record<string, number> };

export const CAPSTONE = "crown";

export const RECIPES: Recipe[] = [
  { output: "raft", inputs: { wood: 4, fiber: 2 } },
  { output: "fishing rod", inputs: { wood: 3, fiber: 2, stone: 1 } },
  { output: "rope", inputs: { fiber: 3, scrap: 1 } },
  { output: "pickaxe", inputs: { wood: 2, stone: 2, scrap: 1 } },
  { output: "boat", inputs: { wood: 5, iron: 3, rope: 2, raft: 1 } },
  { output: CAPSTONE, inputs: { gem: 1, iron: 10 } },
];
