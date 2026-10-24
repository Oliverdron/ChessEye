// CS3483 addition: generic "hold a pose for X ms, then cool down" logic.
// Pure functions so any gesture detector can reuse it and it is easy to test.
import type { GestureUpdate } from "./types";

export interface HoldConfig {
  holdMs: number;      // how long the pose must be held to trigger
  cooldownMs: number;  // ignore the pose for this long after triggering
  graceMs: number;     // a missed detection shorter than this does not reset the hold
}

export interface HoldState {
  heldSince: number | null; // when the current hold started
  lastActive: number;       // last time the pose was seen
  cooldownUntil: number;
  armed: boolean;           // false after a trigger until the pose is released
}

export const initialHoldState: HoldState = {
  heldSince: null,
  lastActive: Number.NEGATIVE_INFINITY,
  cooldownUntil: 0,
  armed: true
};

export const updateHold = (state: HoldState, active: boolean, now: number, config: HoldConfig):
  { state: HoldState, update: GestureUpdate } => {
  const idle: GestureUpdate = { active, progress: 0, coolingDown: false, triggered: false };

  if (!active) {
    // Short tracking dropouts keep the current hold alive.
    const withinGrace = (state.heldSince !== null) && (now - state.lastActive <= config.graceMs);
    if (withinGrace && state.heldSince !== null) {
      const progress = Math.min((state.lastActive - state.heldSince) / config.holdMs, 1);
      return { state, update: { ...idle, progress } };
    }
    return {
      state: { ...state, heldSince: null, armed: true },
      update: { ...idle, coolingDown: now < state.cooldownUntil }
    };
  }

  if (now < state.cooldownUntil || !state.armed) {
    return {
      state: { ...state, heldSince: null, lastActive: now },
      update: { ...idle, coolingDown: true }
    };
  }

  // Start a new hold if there was none, or if the pose was lost for longer than the grace period.
  const continuing = (state.heldSince !== null) && (now - state.lastActive <= config.graceMs);
  const heldSince = (continuing && state.heldSince !== null) ? state.heldSince : now;
  const held = now - heldSince;

  if (held >= config.holdMs) {
    return {
      state: { heldSince: null, lastActive: now, cooldownUntil: now + config.cooldownMs, armed: false },
      update: { active, progress: 1, coolingDown: false, triggered: true }
    };
  }

  return {
    state: { ...state, heldSince, lastActive: now },
    update: { ...idle, progress: held / config.holdMs }
  };
};
