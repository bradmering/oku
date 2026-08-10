/**
 * The panorama's scroll maths — see decisions/0019.
 *
 * Kept out of the component because the interaction is the whole feature and
 * "does it release the reader at the bottom" is not something you want to
 * discover by scrolling.
 *
 * **This is sticky positioning, not scroll-jacking.** Nothing calls
 * `preventDefault`. The pan consumes a stretch of ordinary scroll distance, so a
 * reader who wants past it just keeps going and momentum still works. The
 * distinction matters: a panorama that traps the reader is worse than no
 * panorama.
 */

/** How far the image can travel: everything wider than the viewport. */
export function panDistance(imageWidth: number, viewportWidth: number): number {
  return Math.max(0, imageWidth - viewportWidth)
}

/**
 * Scroll height the chapter must occupy for the pan to complete.
 *
 * One viewport (the image is on screen for at least a full screen) plus the pan
 * itself, scaled by `rate`. `rate: 1` means a pixel of scrolling moves the image
 * a pixel sideways, which reads as natural; lower pans faster.
 */
export function scrollHeight(distance: number, viewportHeight: number, rate = 1): number {
  return viewportHeight + distance * rate
}

/** `Math.max` rather than a ternary specifically to normalise `-0` to `0`:
 *  `-containerTop / travel` produces `-0` at the top of the pan, which is
 *  harmless in a transform but leaks into comparisons and readouts. */
const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

/**
 * Progress through the pan, from the container's viewport-relative top.
 *
 * 0 while the container's top is at or below the viewport top, 1 once it has
 * been scrolled up by the whole pan length. Clamped at both ends so the image
 * sits still before and after rather than drifting.
 */
export function panProgress(containerTop: number, distance: number, rate = 1): number {
  const travel = distance * rate
  if (travel <= 0) return 0
  return clamp01(-containerTop / travel)
}

/**
 * How visible an annotation is, given where it has landed on screen.
 *
 * Fades in and out near the edges rather than popping, and is fully opaque
 * across the middle. Off-screen is 0 so labels don't render behind the bezel.
 */
export function annotationVisibility(screenX: number, viewportWidth: number, fade = 0.18): number {
  if (screenX < 0 || screenX > viewportWidth) return 0
  const edge = Math.max(1, viewportWidth * fade)
  if (screenX < edge) return clamp01(screenX / edge)
  if (screenX > viewportWidth - edge) return clamp01((viewportWidth - screenX) / edge)
  return 1
}

/** Where an image-space annotation currently sits on screen, in px. */
export function annotationScreenX(x: number, imageWidth: number, translateX: number): number {
  return x * imageWidth - translateX
}
