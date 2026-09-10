import assert from "node:assert/strict";
import { canFollowCursor, cursorPetBounds, FOLLOW_TICK_MS, PetFollowController } from "../src/main/petMovement";
import type { WindowBounds, WorkArea } from "../src/main/displayPosition";
import type { PetFacing } from "../src/shared/types";
import { DEFAULT_SETTINGS } from "../src/shared/constants";
import { normalizeSettings } from "../src/main/settingsStore";

const size = { width: 220, height: 340 };
const macArea = { x: 0, y: 25, width: 1440, height: 810 };
const winArea = { x: 0, y: 0, width: 1920, height: 1040 };
const negativeArea = { x: -1920, y: -1080, width: 1920, height: 1040 };

function assertInside(bounds: WindowBounds, area: WorkArea): void {
  assert.ok(bounds.x >= area.x && bounds.y >= area.y);
  assert.ok(bounds.x + bounds.width <= area.x + area.width);
  assert.ok(bounds.y + bounds.height <= area.y + area.height);
}

function simulation(initial: WindowBounds, area = winArea) {
  const controller = new PetFollowController();
  let bounds = initial;
  let moving = false;
  let facing: PetFacing = "right";
  let transitions = 0;
  let turns = 0;
  return {
    controller,
    get bounds() { return bounds; },
    get moving() { return moving; },
    get facing() { return facing; },
    get transitions() { return transitions; },
    get turns() { return turns; },
    step(cursor: { x: number; y: number }, dt = FOLLOW_TICK_MS, nextArea = area) {
      const frame = controller.step(bounds, cursor, nextArea, dt, facing);
      if (frame.moving !== moving) transitions++;
      if (frame.facing !== facing) turns++;
      bounds = frame.bounds;
      moving = frame.moving;
      facing = frame.facing;
      return frame;
    }
  };
}

const active = {
  enabled: true, visible: true, dragging: false, pointerDown: false,
  menuOpen: false, bubbleVisible: false, focusActive: false, blockingMode: null
} as const;

export const tests = [
  {
    name: "summon aligns the visible pet rather than the transparent window center",
    run(): void {
      const target = cursorPetBounds({ x: 500, y: 450 }, size, macArea);
      assert.equal(target.x + size.width / 2, 628);
      assert.equal(target.y + size.height - 92, 498);
      assertInside(target, macArea);
    }
  },
  {
    name: "summon respects Mac Dock, Windows taskbar and negative-coordinate screen edges",
    run(): void {
      for (const area of [macArea, winArea, negativeArea]) {
        for (const x of [area.x, area.x + area.width / 2, area.x + area.width - 1]) {
          for (const y of [area.y, area.y + area.height / 2, area.y + area.height - 1]) {
            assertInside(cursorPetBounds({ x, y }, size, area), area);
          }
        }
      }
      assert.ok(cursorPetBounds({ x: 1900, y: 500 }, size, winArea).x + size.width < 1900);
    }
  },
  {
    name: "damped follow accelerates smoothly, does not overshoot and settles exactly once",
    run(): void {
      const cursor = { x: 1000, y: 650 };
      const target = cursorPetBounds(cursor, size, winArea);
      const sim = simulation({ ...size, x: 100, y: 100 });
      let previousDistance = Infinity;
      for (let i = 0; i < 350; i++) {
        const before = sim.bounds;
        sim.step(cursor);
        assert.ok(Math.hypot(sim.bounds.x - before.x, sim.bounds.y - before.y) <= 12);
        const distance = Math.hypot(sim.bounds.x - target.x, sim.bounds.y - target.y);
        assert.ok(distance <= previousDistance + 1);
        previousDistance = distance;
        assertInside(sim.bounds, winArea);
      }
      assert.ok(previousDistance < 6);
      assert.equal(sim.moving, false);
      assert.equal(sim.transitions, 2);
    }
  },
  {
    name: "small cursor noise and subpixel corrections do not restart idle animation",
    run(): void {
      const cursor = { x: 700, y: 500 };
      const sim = simulation(cursorPetBounds(cursor, size, winArea));
      const initial = sim.bounds;
      for (let i = 0; i < 600; i++) sim.step({ x: cursor.x + (i % 2 ? 5 : -5), y: cursor.y + Math.sin(i) * 4 });
      assert.equal(sim.transitions, 0);
      assert.equal(sim.turns, 0);
      assert.deepEqual(sim.bounds, initial);
    }
  },
  {
    name: "slow continuous cursor motion remains one run instead of run-idle flicker",
    run(): void {
      const sim = simulation(cursorPetBounds({ x: 400, y: 500 }, size, winArea));
      for (let i = 0; i < 600; i++) sim.step({ x: 400 + i * 0.64, y: 500 });
      assert.equal(sim.transitions, 1);
      assert.equal(sim.moving, true);
      assert.ok(sim.bounds.x > 750);
      for (let i = 0; i < 150; i++) sim.step({ x: 400 + 599 * 0.64, y: 500 });
      assert.equal(sim.transitions, 2);
      assert.equal(sim.moving, false);
    }
  },
  {
    name: "right-edge threshold jitter no longer changes the target side by 256 pixels",
    run(): void {
      const cursor = { x: winArea.width - 238 - 2, y: 550 };
      const sim = simulation(cursorPetBounds(cursor, size, winArea));
      const initial = sim.bounds;
      for (let i = 0; i < 300; i++) sim.step({ x: cursor.x + (i % 2 ? 4 : -4), y: cursor.y });
      assert.deepEqual(sim.bounds, initial);
      assert.equal(sim.transitions, 0);
      assert.equal(sim.turns, 0);
    }
  },
  {
    name: "vertical movement with horizontal jitter does not flip the sprite",
    run(): void {
      const sim = simulation(cursorPetBounds({ x: 700, y: 300 }, size, winArea));
      for (let i = 0; i < 500; i++) sim.step({ x: 700 + (i % 2 ? 3 : -3), y: 300 + i * 0.8 });
      assert.equal(sim.turns, 0);
      assert.equal(sim.transitions, 1);
    }
  },
  {
    name: "deliberate reversal changes facing once, not for every rounding correction",
    run(): void {
      const sim = simulation(cursorPetBounds({ x: 900, y: 550 }, size, winArea));
      for (let i = 0; i < 250; i++) sim.step({ x: 350, y: 550 });
      assert.equal(sim.facing, "left");
      assert.equal(sim.turns, 1);
      assert.equal(sim.transitions, 2);
    }
  },
  {
    name: "display seam jitter is ignored but deliberate crossing reaches disconnected displays",
    run(): void {
      const sim = simulation(cursorPetBounds({ x: 30, y: 500 }, size, winArea));
      sim.step({ x: 30, y: 500 });
      for (let i = 0; i < 120; i++) {
        sim.step({ x: i % 2 ? 1 : -1, y: 500 }, 16, i % 2 ? winArea : negativeArea);
        assertInside(sim.bounds, winArea);
      }
      for (const area of [negativeArea, { x: 3000, y: 150, width: 1280, height: 800 }]) {
        const cursor = { x: area.x + 500, y: area.y + 500 };
        for (let i = 0; i < 350; i++) sim.step(cursor, 16, area);
        assertInside(sim.bounds, area);
        const target = cursorPetBounds(cursor, size, area);
        assert.ok(Math.hypot(sim.bounds.x - target.x, sim.bounds.y - target.y) < 6);
        assert.equal(sim.moving, false);
      }
    }
  },
  {
    name: "different frame rates converge and long sleep does not launch the pet across a screen",
    run(): void {
      const target = { x: 1200, y: 650 };
      const finals = [8, 16, 33].map((dt) => {
        const sim = simulation({ ...size, x: 100, y: 100 });
        for (let time = 0; time < 5000; time += dt) sim.step(target, dt);
        assert.equal(sim.moving, false);
        return sim.bounds;
      });
      for (const bounds of finals) assert.ok(Math.hypot(bounds.x - finals[0].x, bounds.y - finals[0].y) <= 2);
      const sim = simulation({ ...size, x: 100, y: 100 });
      const before = sim.bounds;
      sim.step(target, 60_000);
      assert.ok(Math.hypot(sim.bounds.x - before.x, sim.bounds.y - before.y) <= 34);
      const paused = sim.bounds;
      sim.step(target, -1);
      assert.deepEqual(sim.bounds, paused);
    }
  },
  {
    name: "reset and external relocation discard old momentum",
    run(): void {
      const controller = new PetFollowController();
      controller.step({ ...size, x: 100, y: 100 }, { x: 1500, y: 650 }, winArea, 16, "right");
      const cursor = { x: 500, y: 550 };
      const summoned = cursorPetBounds(cursor, size, winArea);
      assert.deepEqual(controller.step(summoned, cursor, winArea, 16, "right").bounds, summoned);
      controller.reset();
      assert.equal(controller.step(summoned, cursor, winArea, 16, "right").moving, false);
    }
  },
  {
    name: "follow pauses for interaction, hidden pet, reminders and focus",
    run(): void {
      assert.equal(canFollowCursor(active), true);
      for (const flag of ["dragging", "pointerDown", "menuOpen", "bubbleVisible", "focusActive"] as const) {
        assert.equal(canFollowCursor({ ...active, [flag]: true }), false, flag);
      }
      for (const blockingMode of ["break", "breakRun", "hydration", "focusWarning"] as const) {
        assert.equal(canFollowCursor({ ...active, blockingMode }), false);
      }
      assert.equal(canFollowCursor({ ...active, enabled: false }), false);
      assert.equal(canFollowCursor({ ...active, visible: false }), false);
    }
  },
  {
    name: "old settings migrate with follow disabled and only accept boolean preferences",
    run(): void {
      assert.equal(DEFAULT_SETTINGS.followCursorEnabled, false);
      assert.equal(normalizeSettings({}).followCursorEnabled, false);
      assert.equal(normalizeSettings({ followCursorEnabled: true }).followCursorEnabled, true);
      assert.equal(normalizeSettings({ followCursorEnabled: false }).followCursorEnabled, false);
      for (const value of ["true", 1, null]) assert.equal(normalizeSettings({ followCursorEnabled: value as never }).followCursorEnabled, false);
    }
  }
];
