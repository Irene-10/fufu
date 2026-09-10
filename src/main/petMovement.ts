import { clampBoundsToWorkArea } from "./displayPosition";
import type { WindowBounds, WorkArea } from "./displayPosition";
import type { BlockingMode, PetFacing } from "../shared/types";

export const FOLLOW_TICK_MS = 16;
const FOLLOW_SPEED = 650; // All coordinates are DIP on macOS and Windows, including Retina.
const START_DISTANCE = 22;
const STOP_DISTANCE = 6;
const STOP_SPEED = 18;
const SETTLE_MS = 180;
const CURSOR_FILTER_MS = 65;
const SMOOTH_TIME = 0.16;
const DISPLAY_CONFIRM_MS = 120;
const TURN_CONFIRM_MS = 120;
const TURN_DISTANCE = 18;
const SIDE_MARGIN = 48;
const CURSOR_GAP = 128;
const PET_HALF_HEIGHT = 92; // The 184px pet button is bottom-aligned in its transparent window.

type Point = { x: number; y: number };
type Side = -1 | 1;

type FollowFrame = {
  bounds: WindowBounds;
  moving: boolean;
  facing: PetFacing;
};

function areaKey(area: WorkArea): string {
  return `${area.x}:${area.y}:${area.width}:${area.height}`;
}

function targetBounds(cursor: Point, size: WindowBounds | { width: number; height: number }, area: WorkArea, side: Side): WindowBounds {
  return clampBoundsToWorkArea({
    ...size,
    x: cursor.x + side * CURSOR_GAP - size.width / 2,
    y: cursor.y + 48 - (size.height - PET_HALF_HEIGHT)
  }, area);
}

export function cursorPetBounds(
  cursor: Point,
  size: { width: number; height: number },
  workArea: WorkArea
): WindowBounds {
  const fitsOnRight = cursor.x + CURSOR_GAP + size.width / 2 <= workArea.x + workArea.width;
  const bounds = targetBounds(cursor, size, workArea, fitsOnRight ? 1 : -1);
  return { ...bounds, x: Math.round(bounds.x), y: Math.round(bounds.y) };
}

// Critically damped motion with a speed cap. Unlike rounding each frame's delta,
// fractional position and velocity survive between ticks, including slow movement.
function damp(position: Point, target: Point, velocity: Point, seconds: number): { position: Point; velocity: Point } {
  const omega = 2 / SMOOTH_TIME;
  const decay = Math.exp(-omega * seconds);
  let dx = position.x - target.x;
  let dy = position.y - target.y;
  const distance = Math.hypot(dx, dy);
  const maxDistance = FOLLOW_SPEED * SMOOTH_TIME;
  if (distance > maxDistance) {
    dx *= maxDistance / distance;
    dy *= maxDistance / distance;
  }
  const tx = (velocity.x + omega * dx) * seconds;
  const ty = (velocity.y + omega * dy) * seconds;
  return {
    position: {
      x: position.x - dx + (dx + tx) * decay,
      y: position.y - dy + (dy + ty) * decay
    },
    velocity: {
      x: (velocity.x - omega * tx) * decay,
      y: (velocity.y - omega * ty) * decay
    }
  };
}

export class PetFollowController {
  private position: Point | null = null;
  private filteredTarget: Point | null = null;
  private velocity: Point = { x: 0, y: 0 };
  private area: WorkArea | null = null;
  private pendingArea = "";
  private pendingAreaMs = 0;
  private side: Side = 1;
  private moving = false;
  private settledMs = 0;
  private turn: PetFacing | null = null;
  private turnMs = 0;
  private lastBounds: WindowBounds | null = null;

  reset(): void {
    this.position = null;
    this.filteredTarget = null;
    this.velocity = { x: 0, y: 0 };
    this.area = null;
    this.pendingArea = "";
    this.pendingAreaMs = 0;
    this.moving = false;
    this.settledMs = 0;
    this.turn = null;
    this.turnMs = 0;
    this.lastBounds = null;
  }

  step(current: WindowBounds, cursor: Point, cursorArea: WorkArea, elapsedMs: number, facing: PetFacing): FollowFrame {
    const dt = Number.isFinite(elapsedMs) ? Math.max(0, Math.min(elapsedMs, 50)) : 0;
    // A drag, summon, window manager adjustment or display repair invalidates old momentum.
    if (this.lastBounds && (Math.abs(current.x - this.lastBounds.x) > 2 ||
      Math.abs(current.y - this.lastBounds.y) > 2 || current.width !== this.lastBounds.width ||
      current.height !== this.lastBounds.height)) this.reset();

    if (!this.area) {
      this.area = { ...cursorArea };
      this.side = cursor.x + CURSOR_GAP + current.width / 2 <= cursorArea.x + cursorArea.width ? 1 : -1;
    } else if (areaKey(this.area) !== areaKey(cursorArea)) {
      const key = areaKey(cursorArea);
      this.pendingAreaMs = this.pendingArea === key ? this.pendingAreaMs + dt : dt;
      this.pendingArea = key;
      if (this.pendingAreaMs >= DISPLAY_CONFIRM_MS) {
        this.area = { ...cursorArea };
        this.position = null;
        this.filteredTarget = null;
        this.velocity = { x: 0, y: 0 };
        this.side = cursor.x + CURSOR_GAP + current.width / 2 <= cursorArea.x + cursorArea.width ? 1 : -1;
        this.pendingArea = "";
        this.pendingAreaMs = 0;
        this.turn = null;
        this.turnMs = 0;
      }
    } else {
      this.pendingArea = "";
      this.pendingAreaMs = 0;
    }
    const area = this.area;
    if (this.side === 1 && cursor.x + CURSOR_GAP + current.width / 2 > area.x + area.width + SIDE_MARGIN) {
      this.side = -1;
    } else if (this.side === -1 && cursor.x - CURSOR_GAP - current.width / 2 < area.x - SIDE_MARGIN) {
      this.side = 1;
    }

    const start = clampBoundsToWorkArea(current, area);
    this.position ??= { x: start.x, y: start.y };
    const target = targetBounds(cursor, current, area, this.side);
    this.filteredTarget ??= { x: target.x, y: target.y };
    const alpha = -Math.expm1(-dt / CURSOR_FILTER_MS);
    this.filteredTarget.x += (target.x - this.filteredTarget.x) * alpha;
    this.filteredTarget.y += (target.y - this.filteredTarget.y) * alpha;
    const distance = Math.hypot(this.filteredTarget.x - this.position.x, this.filteredTarget.y - this.position.y);
    if (!this.moving && distance > START_DISTANCE) this.moving = true;

    if (this.moving) {
      const next = damp(this.position, this.filteredTarget, this.velocity, dt / 1000);
      const constrained = clampBoundsToWorkArea({ ...current, ...next.position }, area);
      this.position = { x: constrained.x, y: constrained.y };
      this.velocity = {
        x: constrained.x === next.position.x ? next.velocity.x : 0,
        y: constrained.y === next.position.y ? next.velocity.y : 0
      };
      const remaining = Math.hypot(this.filteredTarget.x - this.position.x, this.filteredTarget.y - this.position.y);
      const settled = remaining < STOP_DISTANCE && Math.hypot(this.velocity.x, this.velocity.y) < STOP_SPEED;
      this.settledMs = settled ? this.settledMs + dt : 0;
      if (this.settledMs >= SETTLE_MS) {
        this.moving = false;
        this.velocity = { x: 0, y: 0 };
        this.settledMs = 0;
      }
    }

    // Do not flip the sprite for a one-pixel sideways correction or a brief reversal.
    const horizontal = this.filteredTarget.x - this.position.x;
    const candidate = horizontal > TURN_DISTANCE && this.velocity.x > STOP_SPEED ? "right"
      : horizontal < -TURN_DISTANCE && this.velocity.x < -STOP_SPEED ? "left" : null;
    if (this.moving && candidate && candidate !== facing) {
      this.turnMs = candidate === this.turn ? this.turnMs + dt : dt;
      this.turn = candidate;
      if (this.turnMs >= TURN_CONFIRM_MS) {
        facing = candidate;
        this.turn = null;
        this.turnMs = 0;
      }
    } else {
      this.turn = null;
      this.turnMs = 0;
    }

    const bounds = { ...current, x: Math.round(this.position.x), y: Math.round(this.position.y) };
    this.lastBounds = bounds;
    return { bounds, moving: this.moving, facing };
  }
}

export function canFollowCursor(state: {
  enabled: boolean;
  visible: boolean;
  dragging: boolean;
  pointerDown: boolean;
  menuOpen: boolean;
  bubbleVisible: boolean;
  focusActive: boolean;
  blockingMode: BlockingMode;
}): boolean {
  return state.enabled && state.visible && !state.dragging && !state.pointerDown &&
    !state.menuOpen && !state.bubbleVisible && !state.focusActive && state.blockingMode === null;
}
