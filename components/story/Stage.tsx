'use client'

import { useEffect, useRef } from 'react'
import { Map as MapLibreMap, type StyleSpecification, type GeoJSONSource } from 'maplibre-gl'
import type { Camera } from '@/lib/interpolate'
import { routeHead } from '@/lib/interpolate'

/**
 * The persistent map stage.
 *
 * Deliberately dumb: it takes a Camera every frame and applies it with
 * `jumpTo`. All easing lives in the interpolation, because scroll position IS
 * the animation parameter — using flyTo/easeTo here would fight the scroll and
 * reintroduce exactly the abrupt, disconnected motion this model removes.
 */

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

/** Self-contained fallback so the renderer works with no secrets. The route
 *  line against a flat ground is enough to judge the interpolation, which is
 *  the thing worth looking at first. */
const FALLBACK_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#101416' } }],
}

function resolveStyle(styleUrl?: string): string | StyleSpecification {
  if (styleUrl?.startsWith('mapbox://') && MAPBOX_TOKEN) {
    const id = styleUrl.replace('mapbox://styles/', '')
    return `https://api.mapbox.com/styles/v1/${id}?access_token=${MAPBOX_TOKEN}`
  }
  return FALLBACK_STYLE
}

export default function Stage({
  styleUrl,
  route,
  camera,
  terrain,
}: {
  styleUrl?: string
  route?: [number, number][]
  camera: Camera
  terrain?: boolean
}) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const ready = useRef(false)

  useEffect(() => {
    if (!el.current || map.current) return
    const m = new MapLibreMap({
      container: el.current,
      style: resolveStyle(styleUrl),
      center: camera.center,
      zoom: camera.zoom,
      pitch: camera.pitch,
      bearing: camera.bearing,
      interactive: false,          // scroll drives the camera, not the mouse
      attributionControl: false,
    })
    map.current = m

    m.on('load', () => {
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
          paint: { 'line-color': '#f0623c', 'line-width': 14, 'line-opacity': 0.22, 'line-blur': 8 },
        })
        m.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#f0623c', 'line-width': 3 },
        })
      }
      ready.current = true
    })

    return () => { m.remove(); map.current = null; ready.current = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Apply the camera every time it changes. jumpTo, never flyTo.
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
      const src = m.getSource('route') as GeoJSONSource | undefined
      src?.setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: routeHead(route, camera.routeProgress) },
      })
    }
  }, [camera, route])

  return (
    <div className="stage">
      <div ref={el} className="stage-canvas" />
      {!MAPBOX_TOKEN && styleUrl?.startsWith('mapbox://') && (
        <p className="stage-note">
          No <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> — showing the route on a flat ground.
          The interpolation is the thing to watch.
        </p>
      )}
    </div>
  )
}
