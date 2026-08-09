/**
 * Render a camera reading as pasteable YAML — the output half of the camera
 * picker (`components/camera/CameraPicker.tsx`).
 *
 * Split out of the component so it can be tested: a tool whose entire job is
 * emitting YAML you paste into a document has exactly one way to waste your
 * time, which is emitting YAML that doesn't parse or doesn't validate.
 * `scripts/test-keyframe-yaml.ts` checks both against the real schema.
 */

export type CameraReading = {
  coordinates: [number, number]
  zoom: number
  tilt: number
  bearing: number
  routeProgress: number
}

/**
 * @param id  when given, wrap the keyframe in a full `move` chapter ready to
 *   drop into `chapters:`. Otherwise emit the bare `to:` block for pasting into
 *   a move that already exists.
 */
export function keyframeYaml(r: CameraReading, id?: string): string {
  const rows = [
    `coordinates: [${r.coordinates[0]}, ${r.coordinates[1]}]`,
    `zoom: ${r.zoom}`,
    `tilt: ${r.tilt}`,
    `bearing: ${r.bearing}`,
    `routeProgress: ${r.routeProgress}`,
  ]
  if (!id) return ['to:', ...rows.map((l) => `  ${l}`)].join('\n')
  return [
    `- id: ${id}`,
    `  type: move`,
    `  to:`,
    ...rows.map((l) => `    ${l}`),
  ].join('\n')
}
