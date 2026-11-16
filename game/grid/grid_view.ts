// The only folder allowed to import Phaser, and for one job: drawing the grid.
// Input, the HUD, sound, and the order of events all live outside it.
import Phaser from "phaser";
import type { Cell, GameEvent, GameState, Terrain } from "../../core/mod.ts";
import { keyOf, terrainAt } from "../../core/mod.ts";

export const CELL_SIZE = 32;
const TILE_SIZE = 16;
const SCALE = CELL_SIZE / TILE_SIZE;
const SHEET_COLUMNS = 49;
const VIEW_WIDTH = 800;
const VIEW_HEIGHT = 600;
const WALK_MS = 120;
const BUMP_MS = 60;
const HOP_MS = 80;
const BUMP_COLOR = 0xe0533d;

function frame(column: number, row: number): number {
  return row * SHEET_COLUMNS + column;
}

const HERO = frame(27, 0);

const TERRAIN_FRAMES: Record<Terrain, number> = {
  grass: frame(5, 0),
  forest: frame(0, 1),
  water: frame(8, 5),
  rock: frame(22, 0),
};

// Enough cells to cover the view, plus a margin so that the camera can lag behind
// the player without showing an unpainted edge.
const CELLS_ACROSS = 16;
const CELLS_DOWN = 13;

function cellCenter({ x, y }: Cell): Cell {
  return {
    x: x * CELL_SIZE + CELL_SIZE / 2,
    y: y * CELL_SIZE + CELL_SIZE / 2,
  };
}

// One output of the presenter. It shows events; it decides nothing.
// Humble Object: http://xunitpatterns.com/Humble%20Object.html
export class GridView extends Phaser.Scene {
  private readonly seed: number;
  private readonly start: Cell;
  private readonly gathered = new Set<string>();
  private readonly tiles: Phaser.GameObjects.Image[] = [];
  private marker!: Phaser.GameObjects.Image;
  onCreate: () => void = () => {};

  constructor(state: GameState) {
    super("grid");
    this.seed = state.seed;
    this.start = { ...state.player };
  }

  preload() {
    this.load.spritesheet("tiles", "tiles.png", {
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE,
    });
  }

  create() {
    for (let i = 0; i < (CELLS_ACROSS * 2 + 1) * (CELLS_DOWN * 2 + 1); i++) {
      this.tiles.push(this.add.image(0, 0, "tiles", 0).setScale(SCALE));
    }
    const { x, y } = cellCenter(this.start);
    this.marker = this.add.image(x, y, "tiles", HERO).setScale(SCALE);
    this.cameras.main.startFollow(this.marker, true, 0.2, 0.2);
    this.drawCellsAround(this.start);
    this.fitToDisplay();
    this.onCreate();
  }

  // Phaser has no device-pixel setting of its own. So the canvas backing store is
  // CSS size times devicePixelRatio, the CSS size stays put, and a camera zoom lets
  // all drawing stay in logical pixels. The media query fires when the ratio changes:
  // a move to another monitor, or browser zoom. The view's CSS size is fixed, so plain
  // window resizes need nothing here.
  private fitToDisplay() {
    const ratio = globalThis.devicePixelRatio || 1;
    this.scale.resize(
      Math.round(VIEW_WIDTH * ratio),
      Math.round(VIEW_HEIGHT * ratio),
    );
    this.scale.canvas.style.width = `${VIEW_WIDTH}px`;
    this.scale.canvas.style.height = `${VIEW_HEIGHT}px`;
    this.cameras.main.setZoom(ratio);
    matchMedia(`(resolution: ${ratio}dppx)`).addEventListener(
      "change",
      () => this.fitToDisplay(),
      { once: true },
    );
  }

  show(event: GameEvent): Promise<void> {
    switch (event.type) {
      case "moved":
        this.drawCellsAround(event.to);
        return this.walk(event.to);
      case "blocked":
        return this.bump(event.at, event.toward);
      case "gathered":
        this.gathered.add(keyOf(event.at));
        this.drawCellsAround(event.at);
        return this.hop();
      case "foundNothing":
      case "crafted":
      case "craftFailed":
        return Promise.resolve();
      default:
        // A new event type fails to type-check here until it has a presentation.
        event satisfies never;
        return Promise.resolve();
    }
  }

  private walk(to: Cell): Promise<void> {
    return new Promise((done) => {
      this.tweens.add({
        targets: this.marker,
        ...cellCenter(to),
        duration: WALK_MS,
        onComplete: () => done(),
      });
    });
  }

  // Lurch part of the way toward the blocked cell, flash, and come back.
  private bump(at: Cell, toward: Cell): Promise<void> {
    const start = cellCenter(at);
    const target = cellCenter(toward);
    this.marker.setTint(BUMP_COLOR);
    return new Promise((done) => {
      this.tweens.add({
        targets: this.marker,
        x: start.x + (target.x - start.x) * 0.3,
        y: start.y + (target.y - start.y) * 0.3,
        duration: BUMP_MS,
        yoyo: true,
        onComplete: () => {
          this.marker.clearTint();
          done();
        },
      });
    });
  }

  private hop(): Promise<void> {
    return new Promise((done) => {
      this.tweens.add({
        targets: this.marker,
        scale: this.marker.scale * 1.4,
        duration: HOP_MS,
        yoyo: true,
        onComplete: () => done(),
      });
    });
  }

  // Paint only what is near the camera. Asking the core again costs little, and
  // the world itself is never stored.
  private drawCellsAround({ x: centerX, y: centerY }: Cell) {
    let i = 0;
    for (let y = centerY - CELLS_DOWN; y <= centerY + CELLS_DOWN; y++) {
      for (let x = centerX - CELLS_ACROSS; x <= centerX + CELLS_ACROSS; x++) {
        const center = cellCenter({ x, y });
        this.tiles[i++]
          .setPosition(center.x, center.y)
          .setFrame(TERRAIN_FRAMES[terrainAt(this.seed, x, y)])
          .setAlpha(this.gathered.has(keyOf({ x, y })) ? 0.35 : 1);
      }
    }
  }
}

// Resolves once Phaser has booted and the scene exists. Phaser's input and audio
// are off: this project only asks it to draw.
export function startGridView(
  parent: HTMLElement,
  state: GameState,
): Promise<GridView> {
  return new Promise((ready) => {
    const view = new GridView(state);
    view.onCreate = () => ready(view);
    new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width: VIEW_WIDTH,
      height: VIEW_HEIGHT,
      backgroundColor: "#472d3c",
      pixelArt: true,
      banner: false,
      audio: { noAudio: true },
      input: { keyboard: false, mouse: false, touch: false, gamepad: false },
      scene: view,
    });
  });
}
