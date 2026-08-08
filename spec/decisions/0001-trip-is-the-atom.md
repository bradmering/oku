# 0001 — The trip is the atom

**Status:** accepted (2026-07-27) · **Challenged by:** 0010

## Decision

The atomic unit is the **trip** — multi-day, multi-sport, multi-person — not the activity and not
the route.

## Why

Strava's atom is the activity: one person, one session. That model structurally cannot express a
ten-day traverse carrying three people's devices, and storytelling is bolted on afterward.

Two alternatives were considered and rejected:

- **Activity as the atom** (the "Secret Strava" requirements doc argues for this). It resolves
  rather than conflicts: their "activity" ≈ our `segment`. What that model lacks is a container
  above it, which is why it needs hand-curated lists to reassemble a tour.
- **Route as the container**, with trips as instances — Steph Abegg's Mt. Stuart page does exactly
  this, three ascents of one route on one page with a clean route-level vs per-trip split. Parked,
  not rejected. See 0010.

## Consequences

- `authors` is plural from day one; making it plural later is a migration.
- A trip with one segment and one person is a valid degenerate case — that's an activity.
