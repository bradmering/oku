# 0008 — Friends-and-family scope; readers need no account

**Status:** accepted (2026-07-30)

## Decision

Build a publishing tool for a handful of people, not a business. **Readers need no account, no app,
and no domain knowledge** — a link that opens and works. Auth comes late; possibly not at all yet.

## Why

Two pieces of demand evidence, and they point the same way.

1. **A rider on the Great Divide publishes daily to Strava, and his dad can't read it.** The
   author is *already doing the work* — the effort barrier isn't his problem. What fails is the
   reading end.
2. **An 82-year-old was sent a hand-built trip report and said it "put you there," that he'd never
   seen a trip report like it.**

In both, **the author is an athlete and the audience is not.** The requirements doc calls this "a
platform for outdoor athletes" — true of the supply side only. Demand comes from people who love
someone who does these things.

Scoping to friends-and-family deletes nearly every open risk without removing substance: cold start
and retention economics evaporate at n=5, and moderation, billing, follower graphs, and Garmin
OAuth all go with them. It does not soften the platform posture — it makes it cheap.

## Consequences

- **Do not start with auth.** Unguessable unlisted URLs plus one person running ingest reaches
  three real users with zero authentication. Manual provisioning for five people is correct
  engineering. Add auth when a sixth person asks.
- `visibility` exists in the model so it isn't a retrofit, but nothing enforces it yet.
- Parked, not discarded: print/photobook revenue, follower lists, Garmin/COROS OAuth,
  Guide-as-SEO, and the guide-service dispatch beachhead.
