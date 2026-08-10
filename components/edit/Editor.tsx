'use client'

import { useCallback, useMemo, useState } from 'react'
import type { Trip } from '@/schema/trip'
import {
  addAnnotation, moveChapter, moveMedia, promoteToHero, removeAnnotation,
  removeChapter, removeMedia, setField, setMediaCaption, setTripField,
  unusedMedia, updateAnnotation,
} from '@/lib/edit-ops'

/**
 * The story editor — curate and write. **Dev only** (decisions/0021).
 *
 * Built for the job the scaffold leaves behind: 86 photographs to cut down, 12
 * headings with no prose under them, three panoramas with nothing named. It is
 * deliberately NOT a general chapter builder — ingest already gets the structure
 * right, and building the thing that wasn't needed is how editors get big and
 * unusable.
 *
 * All document changes go through `lib/edit-ops`, which is pure. This component
 * only decides what to show.
 */

type AnyChapter = Record<string, any>

const label = 'block text-[11px] uppercase tracking-wider text-stone-500 mb-1'
const input = 'w-full px-2.5 py-1.5 rounded bg-black/40 border border-white/10 text-stone-100 text-sm focus:outline-none focus:border-[#f0623c]'
const btn = 'px-2.5 py-1 rounded border border-white/15 text-stone-300 text-xs hover:bg-white/10'

export default function Editor({ initial, slug }: { initial: Trip; slug: string }) {
  const [doc, setDoc] = useState<Trip>(initial)
  const [past, setPast] = useState<Trip[]>([])
  const [selected, setSelected] = useState<string | null>(
    initial.chapters.find((c) => c.type !== 'move')?.id ?? null,
  )
  const [status, setStatus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const dirty = past.length > 0

  /** Every edit pushes the previous document, so undo is free. */
  const apply = useCallback((fn: (d: Trip) => Trip) => {
    setDoc((d) => { setPast((p) => [...p.slice(-49), d]); return fn(d) })
    setStatus(null)
  }, [])

  const undo = () => {
    setPast((p) => {
      if (!p.length) return p
      setDoc(p[p.length - 1])
      return p.slice(0, -1)
    })
  }

  const mediaById = useMemo(
    () => new Map((doc.sources?.media ?? []).map((m) => [m.id, m])),
    [doc.sources],
  )
  const srcOf = (ref: AnyChapter | undefined) =>
    !ref ? undefined : ref.src ?? mediaById.get(ref.mediaId)?.src
  const orphans = useMemo(() => unusedMedia(doc), [doc])

  const chapters = doc.chapters as AnyChapter[]
  const chapter = chapters.find((c) => c.id === selected)

  const save = async () => {
    setSaving(true)
    setStatus('Saving…')
    try {
      const res = await fetch(`/api/edit/${slug}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(doc),
      })
      const json = (await res.json()) as { error?: string; issues?: string[]; file?: string }
      if (!res.ok) {
        setStatus(`✗ ${json.error}${json.issues ? ` — ${json.issues[0]}` : ''}`)
      } else {
        setStatus(`Saved ${json.file}`)
        setPast([])
      }
    } catch (e) {
      setStatus(`✗ ${(e as Error).message}`)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 flex bg-[#14181a] text-stone-200">
      {/* ── the thread ─────────────────────────────────────────────────── */}
      <aside className="w-72 shrink-0 h-full overflow-y-auto border-r border-white/10">
        <div className="sticky top-0 bg-[#14181a] p-4 border-b border-white/10">
          <p className="m-0 text-[11px] uppercase tracking-wider text-stone-500">Editing</p>
          <input
            className={input + ' mt-1 font-serif text-base'}
            value={doc.title}
            onChange={(e) => apply((d) => setTripField(d, 'title', e.target.value))}
          />
          <div className="flex gap-2 mt-2">
            <button onClick={save} disabled={saving || !dirty}
              className="flex-1 px-3 py-1.5 rounded bg-[#f0623c] text-black text-sm font-semibold disabled:opacity-40">
              {dirty ? 'Save' : 'Saved'}
            </button>
            <button onClick={undo} disabled={!dirty} className={btn + ' disabled:opacity-30'}>Undo</button>
          </div>
          {status && <p className="m-0 mt-2 text-[11px] text-stone-400 break-words">{status}</p>}
          {orphans.length > 0 && (
            <p className="m-0 mt-2 text-[11px] text-stone-500">
              {orphans.length} photo{orphans.length === 1 ? '' : 's'} cut from the story
              <span className="block text-stone-600">still in sources; re-ingest leaves them out</span>
            </p>
          )}
        </div>

        <ul className="m-0 p-2 list-none">
          {chapters.map((c, i) => (
            <li key={c.id}>
              <button
                onClick={() => setSelected(c.id)}
                className={`w-full text-left px-2 py-1.5 rounded text-xs flex gap-2 items-baseline ${
                  selected === c.id ? 'bg-white/10 text-white' : 'text-stone-400 hover:bg-white/5'
                } ${c.type === 'move' ? 'opacity-45' : ''}`}
              >
                <span className="text-stone-600 tabular-nums">{String(i).padStart(2, '0')}</span>
                <span className="truncate">
                  {c.type === 'move' ? '· move' : (c.heading || c.caption || c.type)}
                </span>
                {/* A flyover label carries the same heading as its leg's article,
                    so without this the two are indistinguishable in the list —
                    which cost me a confused minute the first time I used it. */}
                {c.id.startsWith('ch_fly_') && (
                  <span className="ml-auto shrink-0 text-[10px] text-stone-600 uppercase">flyover</span>
                )}
                {c.type === 'article' && !c.text && !c.id.startsWith('ch_fly_') && (
                  <span className="ml-auto text-[#f0623c] shrink-0" title="no prose yet">•</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* ── the chapter ────────────────────────────────────────────────── */}
      <main className="flex-1 h-full overflow-y-auto p-8">
        {!chapter && <p className="text-stone-500">Select a chapter.</p>}

        {chapter && (
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-6">
              <span className="px-2 py-0.5 rounded bg-white/10 text-[11px] uppercase tracking-wider">{chapter.type}</span>
              <code className="text-stone-500 text-xs">{chapter.id}</code>
              <div className="ml-auto flex gap-2">
                <button className={btn} onClick={() => apply((d) => moveChapter(d, chapter.id, -1))}>↑</button>
                <button className={btn} onClick={() => apply((d) => moveChapter(d, chapter.id, 1))}>↓</button>
                <button
                  className={btn + ' border-red-500/40 text-red-300'}
                  onClick={() => {
                    if (!confirm(`Delete ${chapter.id}? Re-running ingest will not bring it back.`)) return
                    apply((d) => removeChapter(d, chapter.id))
                    setSelected(null)
                  }}
                >Delete</button>
              </div>
            </div>

            {'heading' in chapter || chapter.type === 'article' || chapter.type === 'title' ? (
              <div className="grid gap-4 mb-6">
                <div>
                  <label className={label}>Heading</label>
                  <input className={input} value={chapter.heading ?? ''}
                    onChange={(e) => apply((d) => setField(d, chapter.id, 'heading', e.target.value))} />
                </div>
                <div>
                  <label className={label}>Subheading</label>
                  <input className={input} value={chapter.subheading ?? ''}
                    onChange={(e) => apply((d) => setField(d, chapter.id, 'subheading', e.target.value))} />
                </div>
              </div>
            ) : null}

            {(chapter.type === 'article' || chapter.type === 'overview' || chapter.type === 'logistics') && (
              <div className="mb-8">
                <label className={label}>Prose — markdown</label>
                <textarea
                  className={input + ' font-mono text-[13px] leading-relaxed'}
                  rows={12}
                  value={chapter.text ?? ''}
                  placeholder="The heading and the stats are already true. This is the part only you can write."
                  onChange={(e) => apply((d) => setField(d, chapter.id, 'text', e.target.value))}
                />
              </div>
            )}

            {chapter.type === 'article' && (
              <MediaStrip
                chapter={chapter}
                srcOf={srcOf}
                onCut={(i) => apply((d) => removeMedia(d, chapter.id, i))}
                onCaption={(i, v) => apply((d) => setMediaCaption(d, chapter.id, i, v))}
                onHero={(i) => apply((d) => promoteToHero(d, chapter.id, i))}
                onMove={(i, to) => apply((d) => moveMedia(d, chapter.id, i, to))}
              />
            )}

            {chapter.type === 'panorama' && (
              <PanoramaEditor
                chapter={chapter}
                src={srcOf(chapter)}
                onAdd={(a) => apply((d) => addAnnotation(d, chapter.id, a))}
                onUpdate={(i, p) => apply((d) => updateAnnotation(d, chapter.id, i, p))}
                onRemove={(i) => apply((d) => removeAnnotation(d, chapter.id, i))}
                onCaption={(v) => apply((d) => setField(d, chapter.id, 'caption', v))}
              />
            )}
          </div>
        )}
      </main>
    </div>
  )
}

// ── the cull ────────────────────────────────────────────────────────────────

function MediaStrip({
  chapter, srcOf, onCut, onCaption, onHero, onMove,
}: {
  chapter: AnyChapter
  srcOf: (r: AnyChapter | undefined) => string | undefined
  onCut: (i: number) => void
  onCaption: (i: number, v: string) => void
  onHero: (i: number) => void
  onMove: (i: number, to: number) => void
}) {
  const media: AnyChapter[] = chapter.media ?? []
  const hero = srcOf(chapter.heroImage)

  return (
    <section>
      {hero && (
        <div className="mb-6">
          <label className={label}>Hero</label>
          <img src={hero} alt="" className="w-full max-h-72 object-cover rounded" />
        </div>
      )}

      <label className={label}>
        Strip — {media.length} photo{media.length === 1 ? '' : 's'}
        {media.length > 8 && <span className="text-[#f0623c] normal-case tracking-normal"> · long; most of these probably want cutting</span>}
      </label>

      {media.length === 0 && <p className="text-stone-600 text-sm">Nothing here.</p>}

      <div className="grid grid-cols-2 gap-4">
        {media.map((m, i) => {
          const src = srcOf(m)
          return (
            <figure key={`${m.mediaId ?? m.src}-${i}`} className="m-0 rounded overflow-hidden border border-white/10">
              {m.type === 'video' || src?.endsWith('.mp4')
                ? <video src={src} muted playsInline preload="metadata" className="w-full h-36 object-cover bg-black" />
                : <img src={src} alt="" loading="lazy" className="w-full h-36 object-cover bg-black" />}
              <div className="p-2 flex flex-col gap-2">
                <input
                  className={input + ' text-xs'}
                  placeholder="Caption…"
                  value={m.caption ?? ''}
                  onChange={(e) => onCaption(i, e.target.value)}
                />
                <div className="flex gap-1.5">
                  <button className={btn} onClick={() => onMove(i, i - 1)}>←</button>
                  <button className={btn} onClick={() => onMove(i, i + 1)}>→</button>
                  <button className={btn} onClick={() => onHero(i)}>Hero</button>
                  <button className={btn + ' ml-auto border-red-500/40 text-red-300'} onClick={() => onCut(i)}>Cut</button>
                </div>
              </div>
            </figure>
          )
        })}
      </div>
    </section>
  )
}

// ── naming what is in the panorama ──────────────────────────────────────────

function PanoramaEditor({
  chapter, src, onAdd, onUpdate, onRemove, onCaption,
}: {
  chapter: AnyChapter
  src?: string
  onAdd: (a: { x: number; y?: number; label: string }) => void
  onUpdate: (i: number, patch: Record<string, unknown>) => void
  onRemove: (i: number) => void
  onCaption: (v: string) => void
}) {
  const annotations: AnyChapter[] = chapter.annotations ?? []

  return (
    <section>
      <div className="mb-4">
        <label className={label}>Caption</label>
        <input className={input} value={chapter.caption ?? ''} onChange={(e) => onCaption(e.target.value)} />
      </div>

      <label className={label}>
        Click the image to place a label — no guessing coordinates
      </label>
      {src && (
        <div
          className="relative w-full overflow-x-auto rounded border border-white/10 cursor-crosshair"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            const x = (e.clientX - r.left + e.currentTarget.scrollLeft) / e.currentTarget.scrollWidth
            const y = (e.clientY - r.top) / r.height
            const text = prompt('Label for this point?')
            if (text) onAdd({ x: Number(x.toFixed(4)), y: Number(y.toFixed(3)), label: text })
          }}
        >
          <img src={src} alt="" className="h-48 max-w-none w-auto" />
          {annotations.map((a, i) => (
            <span
              key={i}
              className="absolute -translate-x-1/2 pointer-events-none text-[10px] bg-[#f0623c] text-black px-1 rounded"
              style={{ left: `${a.x * 100}%`, top: `${(a.y ?? 0.42) * 100}%` }}
            >{a.label}</span>
          ))}
        </div>
      )}

      <div className="mt-5 grid gap-2">
        {annotations.map((a, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              className={input + ' w-20 text-xs tabular-nums'} type="number" step="0.001" min="0" max="1"
              value={a.x}
              onChange={(e) => onUpdate(i, { x: Number(e.target.value) })}
            />
            <input
              className={input + ' text-sm'} value={a.label}
              onChange={(e) => onUpdate(i, { label: e.target.value })}
            />
            <input
              className={input + ' text-xs'} placeholder="Note…" value={a.note ?? ''}
              onChange={(e) => onUpdate(i, { note: e.target.value })}
            />
            <button className={btn + ' border-red-500/40 text-red-300'} onClick={() => onRemove(i)}>×</button>
          </div>
        ))}
      </div>
    </section>
  )
}
