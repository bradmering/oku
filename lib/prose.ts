/**
 * How a chapter's `text` becomes paragraphs, and back.
 *
 * ⚠ **These two functions must stay exact inverses**, because the editor edits
 * prose *on the rendered page* (decisions/0022) and serialises it by reading the
 * paragraphs back out. `scripts/test-prose.ts` asserts the round trip.
 *
 * That round trip only holds while rendering is a **split, not a transform.**
 * The renderer does not process markdown today — `**bold**` reaches the page as
 * literal text — so editing what you see and reading it back is lossless.
 *
 * **The moment a markdown processor is added to `Article`, that stops being
 * true** and inline prose editing has to become markdown-aware or fall back to
 * the inspector. The round-trip test is the tripwire: it will fail rather than
 * silently eating someone's formatting. `01-data-model.md` still has "text
 * flavour — markdown, but which" open, so this is a live risk, not a hypothetical.
 */

/** Blank lines separate paragraphs. Nothing else is significant. */
export function toParagraphs(text: string): string[] {
  return text.split(/\n{2,}/)
}

export function fromParagraphs(paragraphs: string[]): string {
  return paragraphs.join('\n\n')
}
