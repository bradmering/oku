'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'

type Pin = { coordinates: [number, number]; thumbnail: string; image: string; caption?: string }

/**
 * The interactive escape hatch.
 *
 * Everywhere else the map is deliberately non-interactive — scroll drives the
 * camera, and letting the mouse fight it would feel broken. This is the one
 * place a reader can actually explore: drag, zoom, and tap a photograph to see
 * where it was taken.
 */
export default function FullMap({
  styleUrl,
  route,
  pins,
  onClose,
}: {
  styleUrl?: string
  route?: [number, number][]
  pins?: Pin[]
  onClose: () => void
}) {
  const el = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!el.current || !token) return
    mapboxgl.accessToken = token

    const m = new mapboxgl.Map({
      container: el.current,
      style: styleUrl ?? 'mapbox://styles/mapbox/satellite-streets-v12',
      center: route?.[0] ?? [0, 0],
      zoom: 6,
      attributionControl: false,
    })
    m.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right')

    m.on('load', () => {
      if (route && route.length >= 2) {
        m.addSource('route', {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route } },
        })
        m.addLayer({
          id: 'glow', type: 'line', source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#f0623c', 'line-width': 16, 'line-opacity': 0.25, 'line-blur': 6 },
        })
        m.addLayer({
          id: 'line', type: 'line', source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#f0623c', 'line-width': 3 },
        })
        // Frame the whole traverse — the reason to open this at all.
        const b = route.reduce(
          (acc, c) => acc.extend(c as [number, number]),
          new mapboxgl.LngLatBounds(route[0], route[0]),
        )
        m.fitBounds(b, { padding: 60, duration: 0 })
      }

      pins?.forEach((pin) => {
        const hit = document.createElement('div')
        hit.style.cssText = 'width:44px;height:44px;display:flex;align-items:center;justify-content:center;cursor:pointer;'
        const dot = document.createElement('div')
        dot.style.cssText = `width:34px;height:34px;border-radius:50%;
          background-image:url('${pin.thumbnail}');background-size:cover;background-position:center;
          border:2px solid white;box-shadow:0 1px 5px rgba(0,0,0,.55);`
        hit.appendChild(dot)
        new mapboxgl.Marker({ element: hit })
          .setLngLat(pin.coordinates)
          .setPopup(
            new mapboxgl.Popup({ offset: 22, closeButton: false }).setHTML(
              `<img src="${pin.image}" style="width:260px;display:block;border-radius:3px" />` +
              (pin.caption ? `<p style="margin:.5rem 0 0;font-size:.78rem;color:#44403c">${pin.caption}</p>` : ''),
            ),
          )
          .addTo(m)
      })
    })

    return () => m.remove()
  }, [styleUrl, route, pins])

  return (
    <div className="fixed inset-0 z-[150] bg-ink">
      <div ref={el} className="absolute inset-0" />
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 flex items-center gap-2 rounded-lg bg-black/70 backdrop-blur px-3 py-2 text-sm text-white/80 hover:text-white transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
        Close
      </button>
    </div>
  )
}
