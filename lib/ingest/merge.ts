/**
 * Re-run ingest without destroying authored work — see decisions/0020.
 *
 * Ingest derives facts; the author writes the story. Re-running has to refresh
 * the first without touching the second, or the scaffold becomes a one-shot and
 * "I added more photos" means redoing the alignment by hand.
 *
 * **The author wins, always.** Sources and stage are re-derived; the chapter
 * thread is preserved verbatim, in the author's order. Ingest only *adds*, and
 * only for material it has genuinely never seen.
 *
 * The trick that makes "genuinely new" decidable is that **`sources` in the
 * previous document is ingest's own record of what it knew last time.** A leg or
 * media id absent from it is new. A generated chapter whose id is absent from the
 * previous thread is NOT new — the author saw it and deleted it, and re-adding it
 * would make deletion impossible.
 */

import type { Trip } from '../../schema/trip.ts'

type Chapter = Trip['chapters'][number]

export type MergeReport = {
  preserved: number
  addedChapters: string[]
  appendedMedia: { chapterId: string; mediaIds: string[] }[]
  unplacedMedia: string[]
  culledStillCulled: number
}

const ids = (list: { id: string }[]) => new Set(list.map((x) => x.id))

/** Ingest embeds the leg id in every chapter id it generates for that leg. The
 *  merge relies on that convention to know which chapters belong together. */
function legOf(chapterId: string, legIds: string[]): string | undefined {
  return legIds.find((l) => chapterId.includes(l.replace(/^leg_/, '')))
}

/** Every media id a chapter points at, in any of the reference shapes. */
function mediaRefsOf(ch: Chapter): string[] {
  const c = ch as Record<string, any>
  const out: string[] = []
  if (c.mediaId) out.push(c.mediaId)
  if (c.imageId) out.push(c.imageId)
  if (c.heroImage?.mediaId) out.push(c.heroImage.mediaId)
  for (const m of c.media ?? []) if (m.mediaId) out.push(m.mediaId)
  for (const g of c.images ?? []) if (g.mediaId) out.push(g.mediaId)
  return out
}

export function mergeTrip(
  generated: Trip,
  previous: Trip,
): { trip: Trip; report: MergeReport } {
  const prevMedia = ids(previous.sources?.media ?? [])
  const prevLegs = ids(previous.sources?.legs ?? [])
  const genLegs = generated.sources?.legs ?? []
  const legIds = genLegs.map((l) => l.id)

  const report: MergeReport = {
    preserved: previous.chapters.length,
    addedChapters: [],
    appendedMedia: [],
    unplacedMedia: [],
    culledStillCulled: 0,
  }

  // ── the thread: the author's, verbatim ────────────────────────────────────
  const chapters: Chapter[] = previous.chapters.map((c) => structuredClone(c))
  const present = new Set(chapters.map((c) => c.id))

  // ── new legs contribute their generated chapters ──────────────────────────
  // Inserted after the last chapter belonging to the preceding leg, so a leg
  // added in the middle of a trip doesn't land at the end of the story.
  const newLegIds = legIds.filter((l) => !prevLegs.has(l))
  for (const legId of newLegIds) {
    const incoming = generated.chapters.filter((c) => legOf(c.id, [legId]) && !present.has(c.id))
    if (!incoming.length) continue

    const genIndex = legIds.indexOf(legId)
    const precedingLeg = legIds[genIndex - 1]
    let at = chapters.length
    if (precedingLeg) {
      for (let i = chapters.length - 1; i >= 0; i--) {
        if (legOf(chapters[i].id, [precedingLeg])) { at = i + 1; break }
      }
    }
    chapters.splice(at, 0, ...incoming.map((c) => structuredClone(c)))
    for (const c of incoming) { present.add(c.id); report.addedChapters.push(c.id) }
  }

  // ── new media joins the article for its leg ───────────────────────────────
  const genMedia = generated.sources?.media ?? []
  const newMedia = genMedia.filter((m) => !prevMedia.has(m.id))

  for (const item of newMedia) {
    // A panorama generated for brand-new media is a whole chapter, already added
    // above if its leg is new; otherwise add it next to its leg's article.
    const generatedPano = generated.chapters.find(
      (c) => c.type === 'panorama' && mediaRefsOf(c).includes(item.id),
    )
    const target = item.legId
      ? chapters.find((c) => c.type === 'article' && c.id.includes(item.legId!.replace(/^leg_/, '')))
      : undefined

    if (generatedPano && !present.has(generatedPano.id)) {
      const at = target ? chapters.indexOf(target) + 1 : chapters.length
      chapters.splice(at, 0, structuredClone(generatedPano))
      present.add(generatedPano.id)
      report.addedChapters.push(generatedPano.id)
      continue
    }

    if (!target) { report.unplacedMedia.push(item.id); continue }
    const t = target as Record<string, any>
    t.media ??= []
    t.media.push({ mediaId: item.id })
    const entry = report.appendedMedia.find((a) => a.chapterId === target.id)
    if (entry) entry.mediaIds.push(item.id)
    else report.appendedMedia.push({ chapterId: target.id, mediaIds: [item.id] })
  }

  // Media ingest knows about, that the author removed from the thread, and that
  // we are deliberately NOT re-adding. Reported so the silence is visible.
  const referenced = new Set(chapters.flatMap(mediaRefsOf))
  report.culledStillCulled = genMedia.filter(
    (m) => prevMedia.has(m.id) && !referenced.has(m.id),
  ).length

  return {
    trip: {
      ...generated,
      // Authored envelope beats the CLI: renaming a story in the editor must not
      // be undone by whatever --title the last ingest command happened to use.
      title: previous.title,
      subtitle: previous.subtitle,
      tags: previous.tags,
      authors: previous.authors,
      visibility: previous.visibility,
      chapters,
    },
    report,
  }
}
