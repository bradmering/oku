# 0021 — The editor curates and writes; it does not build

**Status:** accepted (2026-08-09) · **Relates to:** 0008, 0009, 0012 · **Depends on:** 0020

## Decision

`/edit/<slug>` is a **dev-only local authoring tool** that reads and writes the story's YAML on
disk. It does three things: **cut photographs, write prose, name what's in a panorama.**

It is explicitly **not** a general chapter builder — no chapter-type palette, no drag-and-drop
canvas, no template gallery.

## Why curation rather than construction

Measured, rather than guessed, from the White Rim scaffold:

| | |
|---|---|
| chapters | 41 — structure already correct |
| articles with prose | **0 of 12** |
| media references | 75 across 8 strips, largest **22** |
| captions written | **0** |
| panoramas annotated | **0 of 3** |
| media culled | **0 of 86** |

Ingest gets the *structure* right — that is what `0012` and the flyover work were for. What it
cannot do is decide which twenty of eighty-six photographs belong, or write a sentence. **Every gap
is content; none is structural.** A chapter builder would have been the one tool the story didn't
need.

This follows the same instinct as `0009`: fewer knobs, aimed at the actual bottleneck.

## Why local and dev-only

`0008` parks auth, accounts and hosting, and says not to start with auth. A hosted editor needs all
three before it can help anybody. A local tool that edits the file needs none of them and helps
today — the same trade the camera picker made.

A production build 404s both the pages and the write endpoint. The endpoint validates against the
schema *and* runs the media resolver before writing, because an editor that can save a document the
renderer then refuses is worse than one that won't save.

**This is the disposable half.** If the editor ever becomes a product surface, the UI is rewritten
and `lib/edit-ops.ts` is not — which is why the operations are pure functions over a document rather
than component state. Every one returns a new document, which also makes undo free.

## Consequences

- **`npm run dev` can finally show photographs.** `getCloudflareContext()` *throws* outside the
  Cloudflare adapter rather than returning an empty env, so the media route 500'd before any
  fallback could run — the long-standing "media 404s in dev" note in the handoff. It now falls back
  to reading the local conversion output, which the editor is unusable without.
- The strip warns above eight photographs. That is a nudge, not a rule: the scaffold proposes
  everything and the author disposes (`0012`), but "22 photographs in one strip" is not a decision
  anyone made.
- Promoting a photograph to hero **returns the outgoing hero to the strip.** Losing a photograph to
  a mis-click is the kind of small betrayal that stops people trusting a tool.
- Deleting a chapter is confirmed, and the dialog says re-running ingest will not bring it back —
  which is true, and is `0020`'s deletion rule surfaced at the point it matters.
- **Not built:** live preview beside the editor. It is the obvious next thing and was deliberately
  left out of v1 rather than done badly; the story renders at `/stories/<slug>` in another tab.
