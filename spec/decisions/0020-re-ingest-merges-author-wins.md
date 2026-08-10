# 0020 — Re-running ingest merges; the author always wins

**Status:** accepted (2026-08-09) · **Relates to:** 0012, 0016 · **Enables:** 0021

## Decision

`scripts/ingest-trip.ts` is **safe to re-run.** It refreshes what it owns and preserves everything
authored:

| Ingest owns — re-derived every run | The author owns — preserved verbatim |
|---|---|
| `sources.tracks`, `sources.legs`, `sources.media` | the entire `chapters` thread, in the author's order |
| `stage` (route, initial view, terrain) | prose, headings, captions, annotations |
| — | which photographs survived the cull |
| — | hand-tuned `move` keyframes |
| — | `title`, `subtitle`, `tags`, `authors` |

`--scaffold` bypasses the merge and regenerates from scratch.

## Why this had to come before the editor

The scaffold's header used to say *"Re-running overwrites this file."* That is fine while a document
is disposable and fatal the moment anyone writes into it. An editor whose output can be destroyed by
a routine `npm run ingest` is not an editor, it's a trap — so the merge is the enabling piece, not a
refinement, and it was built first.

## How "genuinely new" is decided

The hard part is telling *new material* from *material the author deleted*. Both look like "a
chapter the generator produced that isn't in the document."

**`sources` in the previous document is ingest's own record of what it knew last time.** So:

- a leg or media id **absent from previous `sources`** has never been seen → new, add it;
- a generated chapter **absent from the previous thread** but whose material *was* in previous
  `sources` → the author deleted it → **do not resurrect it.**

That distinction is what makes deletion possible at all. Without it, every re-run would undo every
cull, and the tool would be unusable after the first edit.

New photographs join the article for their leg. New legs bring their chapters, inserted after the
last chapter of the preceding leg so a leg added mid-trip doesn't land at the end of the story.

## Consequences

- **The merge relies on ingest embedding the leg id in the chapter ids it generates.** That was a
  naming convention; it is now load-bearing, and `lib/ingest/merge.ts` says so.
- **The authored envelope beats the CLI.** Renaming a story in the editor must not be undone by
  whatever `--title` the last ingest command happened to carry, so the flag is ignored on a merge.
- The merge is **idempotent** — running twice changes nothing — and asserted as such, because a
  non-idempotent merge would drift the document a little on every run.
- **Culled media stays in `sources.media[]`.** It is still a fact about the trip; it simply isn't in
  the story. The editor shows the count, and the merge reports it, so the silence is visible rather
  than mysterious.
- The generated header now says the file is safe to re-run, which is the thing a future reader most
  needs to know about it.
