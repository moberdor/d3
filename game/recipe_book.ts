import {
  type Command,
  type GameState,
  missingFor,
  RECIPES,
} from "../core/mod.ts";
import { itemList } from "./hud.ts";

export class RecipeBook {
  private readonly state: GameState;
  private readonly buttons: HTMLButtonElement[] = [];

  constructor(
    list: HTMLElement,
    state: GameState,
    send: (command: Command) => void,
  ) {
    this.state = state;
    for (const recipe of RECIPES) {
      const button = document.createElement("button");
      button.type = "button";
      button.addEventListener("click", (event) => {
        send({ type: "craft", recipe: recipe.output });
        if (event.detail > 0) button.blur();
      });
      const row = document.createElement("li");
      row.append(button);
      list.append(row);
      this.buttons.push(button);
    }
  }

  update() {
    RECIPES.forEach((recipe, i) => {
      const missing = missingFor(this.state, recipe);
      this.buttons[i].textContent = Object.keys(missing).length === 0
        ? recipe.output
        : `${recipe.output} (need ${itemList(missing)})`;
    });
  }
}
