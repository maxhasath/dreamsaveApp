// Finger-gesture geometry, defined once. The region assumes the test device's 1080-px-wide screen
// with 100-px side margins; change it here if the device resolution ever changes.
export const SWIPE_LEFT  = 100;
export const SWIPE_WIDTH = 880;

// One upward finger swipe over the page content (scrolls the page down by half the region).
// Used where scrollGesture cannot scroll a page whose bottom button sits under the nav bar.
export const PAGE_SWIPE = {
  left: SWIPE_LEFT, top: 400, width: SWIPE_WIDTH, height: 1200,
  direction: 'up' as const, percent: 0.5,
};

// The same swipe, slow enough not to fling the page: steps through long lists of tall cards one
// card at a time instead of jumping to the end.
export const PAGE_SWIPE_SLOW = { ...PAGE_SWIPE, speed: 600 };
