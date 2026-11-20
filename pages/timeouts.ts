// Named wait timeouts (ms) for the Next Cycle / New Cycle pages.
export const TIMEOUT = {
  probe:    1000,  // is an optional element on screen right now?
  quick:    1500,  // short check for a conditional prompt
  brief:    3000,
  short:    5000,
  moderate: 8000,  // waiting for the next screen after a tap
  ui:       10000, // a normal screen transition
  screen:   15000, // a screen that loads data
  long:     30000, // a slow transition
  sync:     60000, // server round trips (registration, backup)
};
