# Fixed Daily Routine V1

Fufu's fixed daily routine is a local-time display layer. It does not create tasks, send additional notifications, or record whether the user followed the schedule.

## Schedule

| Local time | Pet state |
|---|---|
| 23:00–07:00 | `sleeping` |
| 07:00–08:00 | `idle` |
| 08:00–12:00 | `working` |
| 12:00–13:00 | `eating` |
| 13:00–14:00 | `sleeping` |
| 14:00–18:00 | `working` |
| 18:00–19:00 | `eating` |
| 19:00–20:00 | `idle` |
| 20:00–21:00 | `exercising` |
| 21:00–23:00 | `reading` |

Intervals are left-closed and right-open. For example, `08:00` belongs to `working` and `12:00` belongs to `eating`.

## State priority

From highest to lowest:

1. Blocking reminder interactions such as break running, hydration, and focus warnings.
2. An active Focus session.
3. The current fixed routine state.
4. `idle` when the routine is disabled.

After a temporary interaction finishes, the main process resolves the long-term state again instead of always returning to `idle`.

## Reliability

- The state is resolved when the app starts.
- A timer is scheduled for the next routine boundary.
- A minute-level reconciliation corrects missed timers.
- The routine is rescheduled when Windows resumes from sleep.
- No missed states are replayed after sleep; Fufu immediately shows the current state.

## Animation fallbacks

V1 adds semantic pet states without adding new third-party files:

| Routine state | Current fallback |
|---|---|
| `working` | `focusGuard` |
| `eating` | `idle` |
| `exercising` | `breakRunning` |
| `reading` | `sitting` |

Custom pet packs may upload dedicated GIFs for any new state. Dedicated built-in assets can replace the fallbacks later without changing the scheduling logic.
