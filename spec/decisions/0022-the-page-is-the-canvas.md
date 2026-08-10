# 0022 — The rendered page is the editing surface

**Status:** accepted (2026-08-09) · **Relates to:** 0009, 0016, 0018 · **Amends:** 0021

## Decision

**You edit the story on the story.** Clicking a chapter in the preview selects it; headings,
subheadings and prose are edited in place on the rendered page; a `move` — which renders nothing —
gets a **visible inline marker in the thread** that selects it.

The form beside it becomes an **inspector** for what can't be edited in place (media culling,
panorama annotations, keyframe values), not the primary surface.

## Why this changed

`0021` built a form-and-inspector editor with a read-only preview, and justified the scope by
counting the scaffold's gaps. The counting was right; **the interaction model was not what Brad had
in mind, and I never asked.** The two references were WordPress **Gutenberg** — a flat, ordered list
of typed blocks edited on a canvas that looks like the output — and **ArcGIS StoryMaps'** inline
editor, where you scroll the real story and set the map by moving the real map.

Neither was recorded here. StoryMaps appears in `03-stages.md` and `0009`, but every mention is
about *rendering*. That's the lesson worth keeping: **when scoping a tool, ask about the interaction
model, not just the feature set.** The scoping question offered curate / structural / hosted — three
points on a "how much does it do" axis — when the axis that mattered was "how do you edit."

Gutenberg's fit is not incidental. **oku's thread is already a Gutenberg document**: flat, ordered,
typed, no nesting (`0012` deleted the grouping object). A chapter *is* a block. Adopting the editing
model is convergence, not imitation.

## The renderer is decorated, never branched

`0021` said the preview "runs the shipping renderer, unmodified." That still holds in the sense that
matters — **there is no editing mode, no `editing` prop, and no conditional rendering in any chapter
component** — but it is now slightly less than literally true, and the difference should be named:

The renderer emits **provenance attributes**: `data-chapter`, `data-chapter-type` on the wrapper and
`data-field` on the DOM node holding each editable field. These state *which document node this DOM
came from*, which is true regardless of whether an editor exists. `components/edit/canvas.ts`
decorates against them.

The alternative — threading an `editing` prop through the chapters — would put edit concerns in the
reading path, and the reading experience is the whole product (`0009`). A decorator can be deleted
without touching a single rendering decision.

## Bidirectional messaging, and the caret

Messages now flow both ways over `postMessage`. The subtle part is that **naively echoing the
document back to the canvas destroys typing**: re-rendering a `contentEditable` under the caret
collapses it to position 0.

So an edit that originates on the canvas is applied to the document but **not broadcast back** — the
canvas already shows it, because the user typed it there. Only form-side changes are broadcast. The
same flag suppresses scroll-to-selection when the selection came *from* the canvas, which would
otherwise yank the page out from under the click.

## Inline prose editing has a tripwire

Prose is edited on the page and read back by walking the rendered `<p>` elements. **That is lossless
only while rendering is a split, not a transform.** The renderer does not process markdown today, so
`**bold**` reaches the page literally and round-trips exactly.

`lib/prose.ts` owns both directions and `scripts/test-prose.ts` asserts they invert. **The moment a
markdown processor is added to `Article`, that test fails** — which is the point. `01-data-model.md`
still has "text flavour — markdown, but which" open, so this is a live risk, and a red test is much
better than silently eaten formatting.

One bounded lossiness is accepted and asserted: three or more consecutive newlines collapse to two,
because that is what the split already did.

## Consequences

- **A `move` is visible on the canvas and invisible to readers.** Brad's call, and the right one:
  the alternative — a rail beside the thread — puts the block somewhere the block isn't.
- Selecting a move now shows its **keyframe**, marking inherited values explicitly (a flyover frame
  reads `routeProgress: inherited`, which is `0018` surfaced where it's relevant).
- **Not built: capturing a camera from the preview's own map.** That is the ESRI move proper — make
  the stage interactive while a move is selected and let "use this view" write the keyframe. The
  camera picker at `/camera/<slug>` still does it in a separate tab, and the inspector links there.
- **Not built: a block inserter.** `0021` argued against a chapter palette from White Rim's
  scaffold, which was true of that document and does not generalise. Adding blocks is central to the
  Gutenberg model and is the next real gap.
