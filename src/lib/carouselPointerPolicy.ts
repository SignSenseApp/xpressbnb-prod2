/** Minimum horizontal movement before a carousel/gallery claims pointer capture. */
export const CAROUSEL_DRAG_CAPTURE_PX = 6;

/** Tap vs drag — movement below this on both axes is treated as a card click. */
export const CARD_TAP_MOVE_TOLERANCE_PX = 10;

export function isCardTapGesture(dx: number, dy: number): boolean {
  return (
    Math.abs(dx) <= CARD_TAP_MOVE_TOLERANCE_PX &&
    Math.abs(dy) <= CARD_TAP_MOVE_TOLERANCE_PX
  );
}
