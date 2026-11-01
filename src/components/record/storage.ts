// CS3483 addition: remembered settings for the record page.
// Stored in localStorage; every access is wrapped because storage can be blocked
// (private windows) and the page must still work without it.
import type { CornersDict } from "../../types";

export type StartChoice = "standard" | "white" | "black";

export interface LastSetup {
  deviceId: string | null,
  // Corner positions in model coordinates (see getXY), so they survive a different window size.
  corners: CornersDict,
  start: StartChoice
}

export interface RecordPrefs {
  moveSound: boolean,
  speakMoves: boolean,
  handshake: boolean
}

const LAST_SETUP_KEY = "chesscam:lastSetup";
const PREFS_KEY = "chesscam:recordPrefs";

export const DEFAULT_PREFS: RecordPrefs = { moveSound: true, speakMoves: false, handshake: true };

const read = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Not saved; the defaults are used next time.
  }
};

export const loadLastSetup = (): LastSetup | null => {
  const setup = read<LastSetup>(LAST_SETUP_KEY);
  if (setup === null || typeof setup.corners !== "object" || setup.corners === null) {
    return null;
  }
  return setup;
};

export const saveLastSetup = (setup: LastSetup) => write(LAST_SETUP_KEY, setup);

export const loadPrefs = (): RecordPrefs => ({ ...DEFAULT_PREFS, ...read<Partial<RecordPrefs>>(PREFS_KEY) });

export const savePrefs = (prefs: RecordPrefs) => write(PREFS_KEY, prefs);
