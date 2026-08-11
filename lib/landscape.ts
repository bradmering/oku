/**
 * How a landing-page drawing fades as it passes through the viewport.
 *
 * The drawings surface in the whitespace beside the text and go again — they are
 * a breath, not a banner. So opacity is a function of how near the drawing is to
 * the middle of the screen, which gives the fade-in and the fade-out from one
 * expression rather than two triggers.
 *
 * Kept pure because "does it actually go away again" is not a thing you want to
 * discover by scrolling, and because the same instinct applies here as to the
 * panorama: the maths is the part that can be wrong quietly.
 */

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

/** Smooth at both ends, so nothing pops on or off. */
const ease = (t: number) => t * t * (3 - 2 * t)

/**
 * @param top     the element's viewport-relative top (`getBoundingClientRect`)
 * @param height  the element's height
 * @param viewportHeight
 * @param reach   how far from centre the drawing is still visible, as a multiple
 *   of the viewport height. Below 1 it never quite reaches full strength at the
 *   edges of a tall section, which is the point — it should feel like it surfaces.
 */
export function proximityOpacity(
  top: number,
  height: number,
  viewportHeight: number,
  reach = 0.62,
): number {
  if (viewportHeight <= 0) return 0
  const centre = top + height / 2
  const distance = Math.abs(centre - viewportHeight / 2)
  const span = viewportHeight * reach
  if (span <= 0) return 0
  return ease(clamp01(1 - distance / span))
}

/**
 * A gentle horizontal drift, so the drawing settles rather than sitting still.
 *
 * Returns px offset: it comes in from further out and eases toward its resting
 * place as it reaches the middle. Sign is the caller's business — a drawing on
 * the left drifts the other way.
 */
export function driftX(opacity: number, distance = 26): number {
  return (1 - opacity) * distance
}
