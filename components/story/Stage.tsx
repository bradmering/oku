'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import type { Camera } from '@/lib/interpolate'
import { routeHead } from '@/lib/interpolate'
import Lightbox from './Lightbox'
import type { DerivedPin as Pin } from '@/schema/trip'

/**
 * The persistent map stage.
 *
 * Deliberately dumb: it takes a Camera and applies it with `jumpTo`. All easing
 * lives in the interpolation, because scroll position IS the animation
 * parameter — an easing animation here would fight the scroll and reintroduce
 * exactly the abrupt motion this model exists to remove.
 *
 * mapbox-gl rather than maplibre-gl: the trip documents specify Mapbox styles
 * (`mapbox://styles/mapbox/satellite-streets-v12`), and a Mapbox style's own
 * sprites, glyphs and sources are `mapbox://` URLs. MapLibre dropped that
 * protocol when it forked, so those styles load with every internal asset
 * failing — a blank map with no obvious error.
 */

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

export default function Stage({
  styleUrl,
  route,
  camera,
  terrain,
  pins,
}: {
  styleUrl?: string
  route?: [number, number][]
  camera: Camera
  terrain?: boolean
  pins?: Pin[]
}) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const ready = useRef(false)
  const [openPin, setOpenPin] = useState<number | null>(null)

  useEffect(() => {
    if (!el.current || map.current || !TOKEN) return
    mapboxgl.accessToken = TOKEN

    const m = new mapboxgl.Map({
      container: el.current,
      style: styleUrl ?? 'mapbox://styles/mapbox/satellite-streets-v12',
      center: camera.center,
      zoom: camera.zoom,
      pitch: camera.pitch,
      bearing: camera.bearing,
      interactive: false,        // scroll drives the camera, not the mouse
      attributionControl: false,
    })
    map.current = m

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
      }
      // Photograph pins. A 44px hit area around a 34px thumbnail — the visual
      // size stays put but it's actually tappable with a thumb.
      pins?.forEach((pin, i) => {
        const hit = document.createElement('div')
        hit.style.cssText = 'width:44px;height:44px;display:flex;align-items:center;justify-content:center;cursor:pointer;'
        const dot = document.createElement('div')
        dot.style.cssText = `
          width:34px; height:34px; border-radius:50%;
          background-image:url('${pin.thumbnail}');
          background-size:cover; background-position:center;
          border:2px solid white; box-shadow:0 1px 5px rgba(0,0,0,.55);
          transition:transform .2s ease, box-shadow .2s ease;`
        hit.appendChild(dot)
        hit.addEventListener('mouseenter', () => {
          dot.style.transform = 'scale(1.25)'
          dot.style.boxShadow = '0 2px 10px rgba(0,0,0,.6)'
          hit.style.zIndex = '10'
        })
        hit.addEventListener('mouseleave', () => {
          dot.style.transform = 'scale(1)'
          dot.style.boxShadow = '0 1px 5px rgba(0,0,0,.55)'
          hit.style.zIndex = ''
        })
        hit.addEventListener('click', () => setOpenPin(i))
        new mapboxgl.Marker({ element: hit }).setLngLat(pin.coordinates).addTo(m)
      })

      ready.current = true
    })

    return () => { m.remove(); map.current = null; ready.current = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Apply the camera whenever it changes. jumpTo, never flyTo.
  useEffect(() => {
    const m = map.current
    if (!m) return
    m.jumpTo({
      center: camera.center,
      zoom: camera.zoom,
      pitch: camera.pitch,
      bearing: camera.bearing,
    })
    if (ready.current && route && route.length >= 2) {
      const src = m.getSource('route') as mapboxgl.GeoJSONSource | undefined
      src?.setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: routeHead(route, camera.routeProgress) },
      })
    }
  }, [camera, route])

  return (
    <div className="fixed inset-0 z-0">
      <div ref={el} className="absolute inset-0 w-full h-full" />
      {openPin !== null && pins && (
        <Lightbox
          images={pins.map((p) => ({ src: p.image, caption: p.caption }))}
          index={openPin}
          onClose={() => setOpenPin(null)}
          onNav={setOpenPin}
        />
      )}
      {!TOKEN && (
        <p className="absolute left-4 bottom-4 z-20 m-0 max-w-sm px-3 py-2.5 rounded bg-black/80 text-stone-400 font-mono text-[11px] leading-relaxed">
          No <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> at build time — the map can&apos;t render.
          It&apos;s inlined into the client bundle, so it must be set when Next builds.
        </p>
      )}
    </div>
  )
}
