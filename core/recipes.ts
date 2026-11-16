export type Recipe = { output: string; inputs: Record<string, number> };

export const RECIPES: Recipe[] = [
  { output: "rope", inputs: { fiber: 2 } },
  { output: "raft", inputs: { wood: 3, rope: 1 } },
];
