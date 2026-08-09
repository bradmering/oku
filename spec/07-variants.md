# 07 — Chapter variants

> A pattern that formed by accident and is now named on purpose. Three chapter types had each
> invented a `layout` property with different value sets before anyone noticed it was one idea.

## What a variant is

**One chapter type, several presentations of the same content.**

```yaml
type: title            # what it is        — structure
layout: route          # how it looks      — presentation
heading: "…"           # what it says      — content
```

Change the variant and nothing about the content or its meaning changes; only the presentation
does. That is the test: **if switching the value would require rewriting the content, it isn't a
variant — it's a different chapter type.**

## Current variants

| Type | Property | Values |
|---|---|---|
| `title` | `layout` | `image` · `text` · `reveal` · `split` · `plate` · `route` |
| `gallery` | `layout` | `single` · `duo` · `trio` · `quad` · `grid` |
| `parallax-video` | `layout` | `full` · `split` |

## Rules

**1. A flat list of curated presets, never a parameter matrix.**
It is tempting to decompose `title.layout` into orthogonal axes — media × typography × arrival.
Resist it. Three axes with four values each is sixty-four combinations, of which perhaps six are
good, and it hands the author the blank-canvas problem the whole product avoids
(`decisions/0009`: quality comes from constraint, not capability).

**2. Presets are chosen by seeing, not by naming.**
"Reveal" means nothing until you've watched it. Any picker should show the thing. The fixture at
`fixtures/forward/chapters/title-layouts.yaml` exists for exactly this — all six on one page.

**3. Variants are the author's choice. Structure is not.**
This is the boundary. Format, posture and segmentation are **inferred** and never offered as a
dropdown (`decisions/0012`). But whether a story opens on a photograph or a sentence is a judgment
about *this* story that no amount of ingest can derive. **Structure is inferred; presentation is
chosen.**

**4. Every variant defaults sensibly.**
An absent `layout` must produce something good. `title` resolves to `image` when an image is
present and `text` when it isn't, so documents written before the variant existed are unaffected.

**5. Six is plenty.**
Few, each genuinely different in *feeling* rather than in parameter values. A seventh that is
"`split` but with the image on the other side" is a parameter, not a preset — and `align` already
covers it.

## Where variants must not leak

**A variant is presentation. It should not drive the stage.**

`title.layout: 'route'` breaks that rule and is the only sanctioned exception —
see `decisions/0015`. Before adding another, read that ADR: it argues the exception earns itself
because the effect is structurally unavailable to every competitor, and it says plainly that this
is a precedent to argue against rather than follow.
