'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { routeHead } from '@/lib/interpolate'
import { keyframeYaml, type CameraReading } from '@/lib/keyframe-yaml'
import type { Keyframe } from '@/schema/trip'

/**
 * Pick a `move` keyframe by looking at the map instead of guessing numbers.
 *
 * A move is four values you cannot picture — `coordinates`, `zoom`, `bearing`,
 * `tilt` — and authoring them meant editing YAML and reloading to squint at the
 * result. This shows the real stage (the story's own style, route and terrain),
 * lets you fly the camera by hand, and hands back the YAML.
 *
 * `routeProgress` gets a slider rather than a number box, because it controls
 * how much of the line is drawn and the only way to choose it is to watch the
 * line. It uses the same `routeHead` the stage does, so what you see here is
 * what the reader gets.
 *
 * Dev-only — see `app/camera/[slug]/page.tsx`.
 */

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

export type MoveSummary = { id: string; index: number; to: Keyframe }

const round = (n: number, places: number) => Number(n.toFixed(places))

export default function CameraPicker({
  slug,
  styleUrl,
  route,
  terrain,
  moves,
  initial,
}: {
  slug: string
  styleUrl?: string
  route?: [number, number][]
  terrain?: boolean
  moves: MoveSummary[]
  initial: Keyframe
}) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const styled = useRef(false)
  const snippet = useRef<HTMLTextAreaElement>(null)

  const [reading, setReading] = useState<CameraReading>({
    coordinates: [round(initial.coordinates?.[0] ?? 0, 5), round(initial.coordinates?.[1] ?? 0, 5)],
    zoom: round(initial.zoom ?? 10, 2),
    tilt: round(initial.tilt ?? 0, 0),
    bearing: round(initial.bearing ?? 0, 0),
    routeProgress: initial.routeProgress ?? 0,
  })
  const [selected, setSelected] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const drawRoute = useCallback((progress: number) => {
    const m = map.current
    if (!m || !styled.current || !route || route.length < 2) return
    const src = m.getSource('route') as mapboxgl.GeoJSONSource | undefined
    src?.setData({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: routeHead(route, progress) },
    })
  }, [route])

  // ── map setup ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!el.current || map.current || !TOKEN) return
    mapboxgl.accessToken = TOKEN

    const m = new mapboxgl.Map({
      container: el.current,
      style: styleUrl ?? 'mapbox://styles/mapbox/satellite-streets-v12',
      center: reading.coordinates,
      zoom: reading.zoom,
      pitch: reading.tilt,
      bearing: reading.bearing,
      // The one real difference from the stage: here the mouse drives.
      interactive: true,
      attributionControl: false,
    })
    map.current = m
    m.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'bottom-right')

    m.on('style.load', () => {
      if (terrain) {
        m.addSource('dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14,
        })
        m.setTerrain({ source: 'dem', exaggeration: 1.4 })
      }
      if (route && route.length >= 2) {
        m.addSource('route', {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } },
        })
        m.addLayer({
          id: 'route-glow',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#f0623c', 'line-width': 16, 'line-opacity': 0.25, 'line-blur': 6 },
        })
        m.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#f0623c', 'line-width': 3 },
        })
        // The full route, ghosted, so you can see where you are on the whole
        // traverse even when routeProgress has only drawn a little of it.
        m.addSource('route-full', {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route } },
        })
        m.addLayer({
          id: 'route-ghost',
          type: 'line',
          source: 'route-full',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#ffffff', 'line-width': 1.5, 'line-opacity': 0.35, 'line-dasharray': [2, 3] },
        }, 'route-glow')
      }
      styled.current = true
      drawRoute(reading.routeProgress)
    })

    // Read the camera back on every move — this is the whole point.
    const sync = () => {
      const c = m.getCenter()
      setReading((r) => ({
        ...r,
        coordinates: [round(c.lng, 5), round(c.lat, 5)],
        zoom: round(m.getZoom(), 2),
        tilt: round(m.getPitch(), 0),
        bearing: round(m.getBearing(), 0),
      }))
    }
    m.on('move', sync)
    return () => { m.remove(); map.current = null; styled.current = false }
    // Set up once; `reading` is seeded from `initial` and then owned by the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { drawRoute(reading.routeProgress) }, [reading.routeProgress, drawRoute])

  const goTo = (mv: MoveSummary) => {
    const m = map.current
    if (!m) return
    setSelected(mv.id)
    setReading((r) => ({ ...r, routeProgress: mv.to.routeProgress ?? r.routeProgress }))
    m.flyTo({
      center: mv.to.coordinates ?? m.getCenter().toArray() as [number, number],
      zoom: mv.to.zoom ?? m.getZoom(),
      pitch: mv.to.tilt ?? m.getPitch(),
      bearing: mv.to.bearing ?? m.getBearing(),
      duration: 900,
    })
  }

  /**
   * `navigator.clipboard.writeText` rejects whenever the document isn't focused
   * or the context isn't secure, and an unhandled rejection makes the button a
   * silent no-op. Fall back to selecting the snippet so ⌘C still works — the
   * YAML is on screen either way, so the tool never becomes useless.
   */
  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(what)
    } catch {
      snippet.current?.focus()
      snippet.current?.select()
      setCopied('select')
    }
    setTimeout(() => setCopied(null), 1800)
  }

  const field = 'flex justify-between gap-4 tabular-nums'

  return (
    <div className="fixed inset-0 flex">
      <div ref={el} className="flex-1 h-full" />

      <aside className="w-[340px] shrink-0 h-full overflow-y-auto bg-[#14181a] border-l border-white/10 text-stone-200 font-mono text-[12px]">
        <div className="p-4 border-b border-white/10">
          <p className="m-0 text-stone-500 text-[11px] uppercase tracking-wider">Camera picker</p>
          <p className="m-0 mt-1 text-stone-300">{slug}</p>
        </div>

        {!TOKEN && (
          <p className="m-0 p-4 text-amber-400 leading-relaxed">
            No <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> — the map can&apos;t render.
          </p>
        )}

        <div className="p-4 border-b border-white/10 space-y-1.5">
          <div className={field}><span className="text-stone-500">coordinates</span><span>{reading.coordinates[0]}, {reading.coordinates[1]}</span></div>
          <div className={field}><span className="text-stone-500">zoom</span><span>{reading.zoom}</span></div>
          <div className={field}><span className="text-stone-500">tilt</span><span>{reading.tilt}°</span></div>
          <div className={field}><span className="text-stone-500">bearing</span><span>{reading.bearing}°</span></div>
        </div>

        {route && route.length >= 2 && (
          <div className="p-4 border-b border-white/10">
            <div className={field + ' mb-2'}>
              <span className="text-stone-500">routeProgress</span>
              <span>{reading.routeProgress.toFixed(4)}</span>
            </div>
            <input
              type="range" min={0} max={1} step={0.0025}
              value={reading.routeProgress}
              onChange={(e) => {
                setReading((r) => ({ ...r, routeProgress: Number(e.target.value) }))
                setSelected(null)
              }}
              className="w-full accent-[#f0623c]"
            />
            <p className="m-0 mt-2 text-stone-600 text-[11px] leading-relaxed">
              Solid line is drawn; dashed is the rest of the route.
            </p>
          </div>
        )}

        <div className="p-4 border-b border-white/10 flex flex-col gap-2">
          {/* Always on screen, so the tool still works when the clipboard is
              unavailable — and so you can see what you're about to paste. */}
          <textarea
            ref={snippet}
            readOnly
            rows={6}
            value={keyframeYaml(reading)}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full resize-none rounded bg-black/40 border border-white/10 p-2 text-[11px] leading-relaxed text-stone-300 font-mono"
          />
          {copied === 'select' && (
            <p className="m-0 text-amber-400 text-[11px]">Clipboard blocked — selected instead, press ⌘C.</p>
          )}
          <button
            onClick={() => copy(keyframeYaml(reading), 'keyframe')}
            className="w-full px-3 py-2 rounded bg-[#f0623c] text-black font-semibold hover:opacity-90"
          >
            {copied === 'keyframe' ? 'Copied' : 'Copy keyframe'}
          </button>
          <button
            onClick={() => copy(keyframeYaml(reading, selected ?? 'ch_move_TODO'), 'move')}
            className="w-full px-3 py-2 rounded border border-white/20 hover:bg-white/5"
          >
            {copied === 'move' ? 'Copied' : `Copy move chapter${selected ? ` (${selected})` : ''}`}
          </button>
        </div>

        <div className="p-4">
          <p className="m-0 mb-2 text-stone-500 text-[11px] uppercase tracking-wider">
            Moves in this story ({moves.length})
          </p>
          {moves.length === 0 && <p className="m-0 text-stone-600">None yet.</p>}
          <ul className="m-0 p-0 list-none flex flex-col gap-1">
            {moves.map((mv) => (
              <li key={mv.id}>
                <button
                  onClick={() => goTo(mv)}
                  className={`w-full text-left px-2 py-1.5 rounded hover:bg-white/5 ${
                    selected === mv.id ? 'bg-white/10 text-white' : 'text-stone-400'
                  }`}
                >
                  <span className="text-stone-600 mr-2">{String(mv.index).padStart(2, '0')}</span>
                  {mv.id}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  )
}
