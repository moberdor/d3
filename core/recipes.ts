export type Recipe = { output: string; inputs: Record<string, number> };

export const CAPSTONE = "crown";

export const RECIPES: Recipe[] = [
  { output: "rope", inputs: { fiber: 2 } },
  { output: "raft", inputs: { wood: 3, rope: 1 } },
  { output: "key", inputs: { fiber: 1, wood: 2, rope: 1}},
  { output: CAPSTONE, inputs: { gem: 1, rope: 10}}
];
