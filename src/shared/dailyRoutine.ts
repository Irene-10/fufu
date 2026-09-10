import type { PetState } from "./types";

export type DailyRoutineState = Extract<
  PetState,
  "idle" | "working" | "eating" | "sleeping" | "exercising" | "reading"
>;

export type DailyRoutinePeriod = {
  id: string;
  start: string;
  end: string;
  startMinute: number;
  endMinute: number;
  state: DailyRoutineState;
};

const hour = (value: number): number => value * 60;

export const DAILY_ROUTINE: readonly DailyRoutinePeriod[] = [
  { id: "night-sleep", start: "23:00", end: "07:00", startMinute: hour(23), endMinute: hour(7), state: "sleeping" },
  { id: "morning-free", start: "07:00", end: "08:00", startMinute: hour(7), endMinute: hour(8), state: "idle" },
  { id: "morning-work", start: "08:00", end: "12:00", startMinute: hour(8), endMinute: hour(12), state: "working" },
  { id: "lunch", start: "12:00", end: "13:00", startMinute: hour(12), endMinute: hour(13), state: "eating" },
  { id: "nap", start: "13:00", end: "14:00", startMinute: hour(13), endMinute: hour(14), state: "sleeping" },
  { id: "afternoon-work", start: "14:00", end: "18:00", startMinute: hour(14), endMinute: hour(18), state: "working" },
  { id: "dinner", start: "18:00", end: "19:00", startMinute: hour(18), endMinute: hour(19), state: "eating" },
  { id: "evening-free", start: "19:00", end: "20:00", startMinute: hour(19), endMinute: hour(20), state: "idle" },
  { id: "exercise", start: "20:00", end: "21:00", startMinute: hour(20), endMinute: hour(21), state: "exercising" },
  { id: "reading", start: "21:00", end: "23:00", startMinute: hour(21), endMinute: hour(23), state: "reading" }
] as const;

const DAILY_ROUTINE_STATES = new Set<PetState>([
  "idle",
  "working",
  "eating",
  "sleeping",
  "exercising",
  "reading"
]);

function minuteOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function containsMinute(period: DailyRoutinePeriod, minute: number): boolean {
  if (period.startMinute < period.endMinute) {
    return minute >= period.startMinute && minute < period.endMinute;
  }
  return minute >= period.startMinute || minute < period.endMinute;
}

export function getDailyRoutineState(date = new Date()): DailyRoutineState {
  const minute = minuteOfDay(date);
  const period = DAILY_ROUTINE.find((candidate) => containsMinute(candidate, minute));
  if (!period) throw new Error(`Daily routine does not cover minute ${minute}`);
  return period.state;
}

export function nextDailyRoutineTransition(date = new Date()): Date {
  const candidates = DAILY_ROUTINE.map((period) => {
    const candidate = new Date(date);
    candidate.setHours(Math.floor(period.startMinute / 60), period.startMinute % 60, 0, 0);
    if (candidate.getTime() <= date.getTime()) candidate.setDate(candidate.getDate() + 1);
    return candidate;
  });

  return new Date(Math.min(...candidates.map((candidate) => candidate.getTime())));
}

export function isDailyRoutineState(state: PetState): state is DailyRoutineState {
  return DAILY_ROUTINE_STATES.has(state);
}

export function resolveLongTermPetState(
  options: { dailyRoutineEnabled: boolean; focusActive: boolean },
  date = new Date()
): PetState {
  if (options.focusActive) return "focusGuard";
  return options.dailyRoutineEnabled ? getDailyRoutineState(date) : "idle";
}
