# 0010 — Route-as-container: parked, not rejected

**Status:** parked (2026-07-27) · **Challenges:** 0001

## The alternative

The **route/place** is the container and trips are instances of it:
`route → trip → segment → chapter`.

Steph Abegg's Mt. Stuart North Ridge page holds three ascents (2006 / 2016 / 2026) with a clean
split: route-level content (overview, route overlays, GPS tracks, grades, rock type) versus
per-trip content (narrative, time stats, photos, conditions, gear, incidents).

Its strongest argument is that **the best content on that page is structurally impossible under
trip-as-root**: an essay comparing approach strategies across all three ascents *plus a friend's
separate report* only exists because the instances share a container.

## Why it's parked

- **Probably domain-specific.** Climbing has canonical, named, repeatable routes. An expedition
  traverse is effectively unrepeatable and has no canonical name to hang on.
- **It front-loads a taxonomy problem** — route identity, naming, matching, dedupe — orthogonal to
  the work actually being done.
- **It's a cheap retrofit.** A `route` reference on Trip, added later, turns cross-instance
  synthesis into a view over trips sharing that ref. Non-breaking.

## The general rule this establishes

**Decide "design for it now?" by retrofit cost, not by how interesting the idea is.**
Cue-as-scroll-or-time touches every chapter → do it early (0005). Route-as-container touches only
the root and is additive → do it late.

## What would un-park it

Evidence accumulating: **every serious archive organizes by place** — the American Alpine Journal
(country/region/range/peak, with route search in development), bikepacking.com (route),
the Mountaineers (route), Abegg (route). That's four independent instances, not one.

A lighter form worth considering first: **user-curated collections** ("off-trail routes near
Bozeman") — the container without the route-identity taxonomy problem.
