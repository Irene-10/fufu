import assert from "node:assert/strict";
import {
  DAILY_ROUTINE,
  getDailyRoutineState,
  nextDailyRoutineTransition,
  resolveLongTermPetState
} from "../src/shared/dailyRoutine";
import type { DailyRoutineState } from "../src/shared/dailyRoutine";

function at(hours: number, minutes = 0): Date {
  return new Date(2026, 0, 15, hours, minutes, 0, 0);
}

const boundaryCases: Array<[number, number, DailyRoutineState]> = [
  [0, 0, "sleeping"],
  [6, 59, "sleeping"],
  [7, 0, "idle"],
  [7, 59, "idle"],
  [8, 0, "working"],
  [11, 59, "working"],
  [12, 0, "eating"],
  [12, 59, "eating"],
  [13, 0, "sleeping"],
  [13, 59, "sleeping"],
  [14, 0, "working"],
  [17, 59, "working"],
  [18, 0, "eating"],
  [18, 59, "eating"],
  [19, 0, "idle"],
  [19, 59, "idle"],
  [20, 0, "exercising"],
  [20, 59, "exercising"],
  [21, 0, "reading"],
  [22, 59, "reading"],
  [23, 0, "sleeping"],
  [23, 59, "sleeping"]
];

export const tests = [
  {
    name: "daily routine returns the expected state at every boundary",
    run(): void {
      for (const [hours, minutes, expected] of boundaryCases) {
        assert.equal(getDailyRoutineState(at(hours, minutes)), expected, `${hours}:${minutes}`);
      }
    }
  },
  {
    name: "daily routine covers every minute of the day",
    run(): void {
      for (let minute = 0; minute < 24 * 60; minute += 1) {
        const state = getDailyRoutineState(at(Math.floor(minute / 60), minute % 60));
        assert.ok(state);
      }
      assert.equal(DAILY_ROUTINE.length, 10);
    }
  },
  {
    name: "next transition points to the next local schedule boundary",
    run(): void {
      assert.equal(nextDailyRoutineTransition(at(7, 30)).getTime(), at(8).getTime());
      assert.equal(nextDailyRoutineTransition(at(20, 59)).getTime(), at(21).getTime());
      assert.equal(nextDailyRoutineTransition(at(23, 0)).getTime(), new Date(2026, 0, 16, 7).getTime());
    }
  },
  {
    name: "focus takes priority over the routine and disabled routines fall back to idle",
    run(): void {
      assert.equal(
        resolveLongTermPetState({ dailyRoutineEnabled: true, focusActive: true }, at(12, 30)),
        "focusGuard"
      );
      assert.equal(
        resolveLongTermPetState({ dailyRoutineEnabled: true, focusActive: false }, at(12, 30)),
        "eating"
      );
      assert.equal(
        resolveLongTermPetState({ dailyRoutineEnabled: false, focusActive: false }, at(12, 30)),
        "idle"
      );
    }
  }
];
