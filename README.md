# oku

> **Code name, not a product name.** 奥 — Japanese for *the deep interior*; from Bashō's
> *Oku no Hosomichi*, "the narrow road to the deep north." Disposable by design. The product name
> is still undecided (leading candidates: Terra Marginis, Where We Went).

A publishing platform for trip stories, where **the trip is the unit and the data does the
assembly**.

Every multi-day trip leaves the same wreckage: tracks on a watch, photos on a phone, video on a
GoPro, notes in a journal, and four apps that can't talk to each other. Turning that into something
worth reading means an Instagram dump or a weekend of hand-coding. So most trips never get told —
and the ones that do get told badly, in feeds built for athletes rather than readers.

**Strava tells people you did it. This tells them what it was like.**

## Status

**Early. Friends-and-family scope.** Building a publishing tool, not a business — monetization is
deliberately deferred. The bar is *a story that makes an 82-year-old say "it put me there,"
produced by someone who isn't Brad.*

## What's here

| Path | What |
|---|---|
| `spec/` | The specification. **Prose that explains the format.** |
| `spec/decisions/` | ADRs — what we chose and *why*. Read before re-opening a settled question. |
| `schema/` | The machine-checkable definition. **This, not the prose, is the source of truth.** |
| `fixtures/` | Trip documents that must parse and render. The conformance suite. |
| `app/` | The renderer and the authoring tool. |
| `DEVLOG.md` | Reverse-chronological journal. Append before every PR. |
| `CLAUDE.md` | Agent brief. Read first if you're an agent. |

## How we work

Two people, both working through Claude, coordinating through this repo rather than through
sessions. See `CLAUDE.md` for the full protocol. The short version:

1. **The spec is the memory; sessions are disposable.** Anything that matters goes in the repo.
2. **Issues are written as agent prompts** — self-contained, with acceptance criteria.
3. **Every PR gets a preview URL.** The product *is* the reading experience, so review means
   opening it and looking, not reading a diff.
4. **Fixtures are the contract.** A spec change lands its fixture; the renderer PR makes it pass.
5. **Humans merge.** Agents open PRs and never merge them.

## Background

The full concept work — 11 sessions of it, including a 12-entry reference corpus of real trip
reports and the competitive analysis — lives in the orchestrator workspace at
`_control/concepts/geo-narrative-trip-report.md`. This repo carries only what's needed to build.
