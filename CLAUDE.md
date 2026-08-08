# oku — agent brief

Read this before doing anything. Then read `spec/01-data-model.md`. Then read the relevant ADRs in
`spec/decisions/`.

## What this is

A publishing platform for trip stories. The trip is the unit; the data does the assembly. Tracks
and media get aligned on one timeline so a story arrives half-built, and the author adds the voice.

**The differentiator is the reading experience, not the ingestion.** This is settled and
counter-intuitive — see `decisions/0009-craft-is-the-differentiator.md`. Ramblr has had trip-as-atom,
GPX import, and timestamp photo fusion shipping since ~2012 and it hasn't been enough. Assume any
feature can be copied; assume the *quality of the reading experience* cannot.

## Invariants — do not violate without a spec PR

1. **The trip is the atom.** Not the activity, not the route. `decisions/0001`.
2. **GPX-first, not GPX-required.** A story with no track is valid and the stage may be null.
   `decisions/0003`.
3. **Thread + stage.** A story is an ordered thread of chapters plus an *optional* persistent
   backdrop. `decisions/0002`.
4. **Persistence is a chapter property**, not a separate top-level concept. `decisions/0004`.
5. **A cue may be positional OR temporal.** Design for both now even if only scroll ships.
   `decisions/0005`.
6. **`segment` is generic** — sub-day, activity-flavored, may have no track, label scheme is
   format-defined. `decisions/0006`.
7. **Readers need no account, no app, and no domain knowledge.** A link that opens and works.
   `decisions/0008`.
8. **`tilt` means camera angle. `pitch` means a climbing rope length.** Never reuse `pitch` for
   camera tilt. `decisions/0007`.

## Conventions

- **The schema is the source of truth.** `schema/` defines the format; `spec/*.md` explains it. If
  they disagree, the schema wins and the prose is a bug.
- **Every format change lands a fixture** in `fixtures/forward/`. No fixture, no merge.
- **`fixtures/forward/` is the specification. `fixtures/legacy/` is evidence, not authority.** The
  four legacy documents are three hand-written blog stories and an itinerary; they point the way but
  **the format must be far more robust than anything they contain.** Breaking one is a legitimate
  outcome of a deliberate design decision — document the call in `spec/06-migration.md`, don't
  automatically revert. **Do not design backwards from them.**
- Match the surrounding code's style. Don't reformat unrelated lines.
- Don't add dependencies without saying so in the PR description.

## Working protocol

- **Assignment is the lease.** If an issue isn't assigned to you, don't start it.
- **Small vertical slices.** One chapter type end-to-end beats five half-built. Review capacity is
  the bottleneck, not generation speed.
- **Append to `DEVLOG.md` before opening a PR** — one paragraph: what changed, what surprised you,
  what you'd do differently. That is how the next cold session learns what happened.
- **Open PRs. Never merge.** A human merges.
- **Never commit or push without an explicit green light** from the person you're working with.

## Reviewing

The review question is *"open the preview and look,"* not *"does the diff look right."* If your PR
changes anything visual, say in the description **which fixture story to open and what to look at.**

## What's deliberately out of scope right now

Monetization, print, follower graphs, discovery feeds, moderation, billing, SEO, and OAuth to
Garmin/COROS. All parked, none invalidated — see `decisions/0008`. Don't build toward them, and
don't start with auth.
