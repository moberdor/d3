import {
  type GameEvent,
  type GameState,
  keyOf,
  terrainAt,
} from "../core/mod.ts";

function element(id: string): HTMLElement {
  return document.getElementById(id)!;
}

function describe(event: GameEvent): string {
  switch (event.type) {
    case "moved":
      return `moved to ${event.to.x}, ${event.to.y}`;
    case "blocked":
      return `blocked by ${event.terrain} at ${event.toward.x}, ${event.toward.y}`;
    case "gathered":
      return `gathered ${event.item}`;
    case "foundNothing":
      return "nothing to gather here";
    case "crafted":
      return `made ${event.recipe}`;
    case "craftFailed":
      return `can't make ${event.recipe}, need ${itemList(event.missing)}`;
  }
}

export function itemList(items: Record<string, number>): string {
  return Object.entries(items)
    .map(([item, count]) => `${count} ${item}`)
    .join(", ");
}

// The readout, as ordinary page elements that CSS can style and that assistive
// tools can read. It changes only as events play.
export class Hud {
  private readonly seed: number;
  private readonly gathered = new Set<string>();

  constructor(state: GameState) {
    this.seed = state.seed;
    this.showPosition(state.player.x, state.player.y);
  }

  show(event: GameEvent) {
    element("live").textContent = describe(event);
    if (event.type === "moved") this.showPosition(event.to.x, event.to.y);
    if (event.type === "gathered") {
      this.gathered.add(keyOf(event.at));
      this.showPosition(event.at.x, event.at.y);
      this.showInventory(event.inventory);
    }
    if (event.type === "crafted") this.showInventory(event.inventory);
  }

  private showInventory(inventory: Record<string, number>) {
    const list = element("inventory");
    list.replaceChildren();
    for (const [item, count] of Object.entries(inventory)) {
      if (count === 0) continue;
      const row = document.createElement("li");
      row.textContent = `${item} x${count}`;
      list.append(row);
    }
  }

  private showPosition(x: number, y: number) {
    const terrain = terrainAt(this.seed, x, y);
    element("position").textContent = `${x}, ${y}`;
    element("terrain").textContent = this.gathered.has(keyOf({ x, y }))
      ? `${terrain} (gathered)`
      : terrain;
  }
}
