/**
 * Turn the rendered story into an editing canvas — decisions/0022.
 *
 * This DECORATES the renderer's output rather than living inside it: it hangs
 * off `data-chapter`, `data-chapter-type`, `data-move` and `data-field`, which
 * are provenance the renderer states about its own DOM. No edit concept crosses
 * into the reading path, and there is no "editing mode" branch in any chapter
 * component — the preview shows readers exactly what ships.
 *
 * Kept out of the React component because it is imperative DOM work with two
 * genuinely tricky rules, both of which are about not fighting the browser:
 *
 *   · **Never re-write a field while it has focus.** Doing so collapses the
 *     caret to position 0, which makes typing impossible.
 *   · **A `move` renders nothing** — it is a keyframe. In the canvas it needs a
 *     visible, clickable marker, so one is injected into its scroll anchor and
 *     removed again on teardown.
 */

import { fromParagraphs } from '@/lib/prose'

export type CanvasHandlers = {
  onSelect: (chapterId: string) => void
  onEdit: (chapterId: string, field: string, value: string) => void
}

const MARKER = 'data-oku-marker'
const SELECTED = 'oku-selected'

/** Read an edited field back out of the DOM. */
function readField(el: HTMLElement, field: string): string {
  if (field !== 'text') return el.textContent ?? ''
  // Prose is a block of paragraphs. `<p>` per paragraph going in, so paragraphs
  // coming out — see lib/prose.ts on why this must invert `toParagraphs`.
  const paras = [...el.querySelectorAll('p')].map((p) => p.textContent ?? '')
  return fromParagraphs(paras.length ? paras : [el.textContent ?? ''])
}

/**
 * @returns a teardown function. Safe to call repeatedly — each call fully
 *   un-decorates before the next one decorates.
 */
export function decorate(
  doc: Document,
  selectedId: string | null,
  handlers: CanvasHandlers,
): () => void {
  const cleanups: (() => void)[] = []

  // ── chapters: click to select ─────────────────────────────────────────────
  doc.querySelectorAll<HTMLElement>('[data-chapter]').forEach((el) => {
    const id = el.dataset.chapter!
    el.classList.toggle(SELECTED, id === selectedId)

    const onClick = (e: Event) => {
      // A click inside a field is a caret placement, not a selection change.
      if ((e.target as HTMLElement).closest('[data-field]')) return
      handlers.onSelect(id)
    }
    el.addEventListener('click', onClick)
    cleanups.push(() => { el.removeEventListener('click', onClick); el.classList.remove(SELECTED) })

    // ── fields: edit in place ───────────────────────────────────────────────
    el.querySelectorAll<HTMLElement>('[data-field]').forEach((field) => {
      const name = field.dataset.field!
      field.setAttribute('contenteditable', 'plaintext-only')
      field.spellcheck = true

      const onInput = () => handlers.onEdit(id, name, readField(field, name))
      const onFocus = () => handlers.onSelect(id)
      const onKey = (e: KeyboardEvent) => {
        // Enter in a heading would insert a line break into a single-line field.
        if (e.key === 'Enter' && name !== 'text') { e.preventDefault(); field.blur() }
      }
      field.addEventListener('input', onInput)
      field.addEventListener('focus', onFocus)
      field.addEventListener('keydown', onKey)
      cleanups.push(() => {
        field.removeEventListener('input', onInput)
        field.removeEventListener('focus', onFocus)
        field.removeEventListener('keydown', onKey)
        field.removeAttribute('contenteditable')
      })
    })
  })

  // ── moves: the invisible block, made visible ──────────────────────────────
  // A move renders nothing for readers by design. On the canvas it has to be
  // something you can see and click, or the thread has silent gaps in it.
  doc.querySelectorAll<HTMLElement>('[data-move]').forEach((anchor) => {
    const id = anchor.dataset.move!
    const marker = doc.createElement('button')
    marker.setAttribute(MARKER, '')
    marker.type = 'button'
    marker.textContent = id.startsWith('ch_fly_') ? '⟶  flyover frame' : '⟶  move'
    marker.className = [
      'oku-move-marker', id === selectedId ? 'is-selected' : '',
    ].filter(Boolean).join(' ')
    marker.addEventListener('click', (e) => { e.stopPropagation(); handlers.onSelect(id) })

    anchor.appendChild(marker)
    // The anchor is `pointer-events: none` so it never intercepts a reader's
    // clicks; the marker has to opt back in.
    anchor.style.pointerEvents = 'auto'
    cleanups.push(() => { marker.remove(); anchor.style.pointerEvents = '' })
  })

  return () => { for (const fn of cleanups) fn() }
}

/** Styles for the canvas affordances, injected into the preview document. */
export const CANVAS_CSS = `
  [data-chapter] { position: relative; }
  [data-chapter]:hover { outline: 1px dashed rgba(240,98,60,.35); outline-offset: 4px; }
  [data-chapter].${SELECTED} { outline: 2px solid #f0623c; outline-offset: 4px; }
  [data-field] { outline: none; }
  [data-field]:hover { background: rgba(240,98,60,.08); }
  [data-field]:focus { background: rgba(240,98,60,.12); box-shadow: 0 0 0 2px rgba(240,98,60,.5); border-radius: 2px; }
  [data-field]:empty::before { content: attr(data-placeholder); opacity: .4; }
  .oku-move-marker {
    position: absolute; left: 50%; transform: translateX(-50%);
    margin-top: 1rem; padding: .3rem .7rem; border-radius: 999px;
    background: rgba(0,0,0,.72); border: 1px dashed rgba(255,255,255,.25);
    color: #d6d3d1; font: 500 11px ui-monospace, monospace;
    letter-spacing: .06em; cursor: pointer; z-index: 30;
  }
  .oku-move-marker:hover { border-color: #f0623c; color: #fff; }
  .oku-move-marker.is-selected { border: 1px solid #f0623c; color: #fff; background: rgba(240,98,60,.25); }
`
