import type { GameEvent } from "../core/mod.ts";

type SoundName = "step" | "bump" | "pickup" | "craft" | "click";

// Which sound each event plays. A new event fails to type-check until it has an entry.
const SOUND_FOR: Record<GameEvent["type"], SoundName | null> = {
  moved: "step",
  blocked: "bump",
  gathered: "pickup",
  missed: "bump",
  foundNothing: "bump",
  crafted: "craft",
  craftFailed: "bump",
};

const SOUNDS: Record<SoundName, { file: string; volume: number }> = {
  step: { file: "footstep00.ogg", volume: 0.2 },
  bump: { file: "bookPlace1.ogg", volume: 0.5 },
  pickup: { file: "beltHandle1.ogg", volume: 0.7 },
  craft: { file: "chop.ogg", volume: 0.6 },
  click: { file: "metalLatch.ogg", volume: 0.5 },
};

export class Sounds {
  private muted = false;
  private readonly button: HTMLButtonElement;

  constructor(button: HTMLButtonElement) {
    this.button = button;
    button.addEventListener("click", (event) => {
      this.setMuted(!this.muted);
      // After a mouse click, give keys back to the game. Keyboard users keep focus.
      if (event.detail > 0) button.blur();
    });
  }

  show(event: GameEvent) {
    const sound = SOUND_FOR[event.type];
    if (sound) this.play(sound);
  }

  private setMuted(muted: boolean) {
    this.muted = muted;
    this.button.textContent = muted ? "Sound: off" : "Sound: on";
    this.button.setAttribute("aria-pressed", String(muted));
    // Unmuting confirms itself.
    this.play("click");
  }

  private play(sound: SoundName) {
    if (this.muted) return;
    const audio = new Audio(`sounds/${SOUNDS[sound].file}`);
    audio.volume = SOUNDS[sound].volume;
    audio.play().catch(() => {});
  }
}
