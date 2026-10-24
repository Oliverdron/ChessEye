// CS3483 addition: handshake gesture detector.
// A handshake = exactly two hands, palms close together, pointing toward each other,
// held for HANDSHAKE_HOLD_MS. Tune the constants below if it triggers too easily or not at all.
import type { GestureDetector, GestureUpdate, Hand, HandFrame } from "./types";
import { initialHoldState, updateHold } from "./hold";
import type { HoldState } from "./hold";

// Max distance between the two palm centres, as a fraction of the frame WIDTH.
// Increase if a real handshake is not detected; decrease if hands merely near each other trigger it.
export const HANDSHAKE_MAX_PALM_DISTANCE = 0.15;

// Max dot product of the two wrist->palm directions (1 = same direction, -1 = opposite).
// Hands in a handshake point toward each other (about -1). Clapped/praying hands of one
// person point the same way (about +1), so they are rejected. Raise toward 0 to be more lenient.
export const HANDSHAKE_MAX_DIRECTION_DOT = -0.3;

// How long the pose must be held continuously before the handshake fires.
export const HANDSHAKE_HOLD_MS = 800;

// After a handshake fires, ignore handshakes for this long (and until the hands let go).
export const HANDSHAKE_COOLDOWN_MS = 4000;

// A missed detection shorter than this does not reset the hold (MediaPipe can lose a
// hand for a frame when the hands overlap).
export const HANDSHAKE_DROPOUT_GRACE_MS = 250;

const WRIST = 0;
// Wrist plus the base of each finger (index, middle, ring, pinky).
const PALM_LANDMARKS = [0, 5, 9, 13, 17];

interface Vec2 {
  x: number;
  y: number;
}

export interface HandshakePose {
  isHandshake: boolean;
  palmDistance: number | null; // fraction of frame width, null unless exactly 2 hands
  directionDot: number | null; // null unless exactly 2 hands
}

// Landmark y is a fraction of the frame height; divide by the aspect ratio so x and y
// share the same unit (fraction of the frame width).
const toSquare = (x: number, y: number, aspectRatio: number): Vec2 => ({ x, y: y / aspectRatio });

export const palmCentre = (hand: Hand, aspectRatio: number): Vec2 => {
  let x = 0;
  let y = 0;
  for (const i of PALM_LANDMARKS) {
    x += hand.landmarks[i].x;
    y += hand.landmarks[i].y;
  }
  return toSquare(x / PALM_LANDMARKS.length, y / PALM_LANDMARKS.length, aspectRatio);
};

// Unit vector from the wrist to the palm centre, i.e. the direction the hand points.
export const handDirection = (hand: Hand, aspectRatio: number): Vec2 => {
  const wrist = toSquare(hand.landmarks[WRIST].x, hand.landmarks[WRIST].y, aspectRatio);
  const palm = palmCentre(hand, aspectRatio);
  const dx = palm.x - wrist.x;
  const dy = palm.y - wrist.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length };
};

// Pure check of a single frame: is this a handshake pose?
export const evaluateHandshakePose = (hands: Hand[], aspectRatio: number): HandshakePose => {
  if (hands.length !== 2) {
    return { isHandshake: false, palmDistance: null, directionDot: null };
  }
  const [a, b] = hands;
  const palmA = palmCentre(a, aspectRatio);
  const palmB = palmCentre(b, aspectRatio);
  const palmDistance = Math.hypot(palmA.x - palmB.x, palmA.y - palmB.y);

  const dirA = handDirection(a, aspectRatio);
  const dirB = handDirection(b, aspectRatio);
  const directionDot = dirA.x * dirB.x + dirA.y * dirB.y;

  const isHandshake = (palmDistance < HANDSHAKE_MAX_PALM_DISTANCE)
    && (directionDot < HANDSHAKE_MAX_DIRECTION_DOT);
  return { isHandshake, palmDistance, directionDot };
};

export interface HandshakeDetector extends GestureDetector {
  update: (frame: HandFrame) => GestureUpdate & { pose: HandshakePose };
}

// Stateful wrapper: adds the hold time and cooldown on top of evaluateHandshakePose.
export const createHandshakeDetector = (): HandshakeDetector => {
  let holdState: HoldState = initialHoldState;
  return {
    update: (frame: HandFrame) => {
      const pose = evaluateHandshakePose(frame.hands, frame.aspectRatio);
      const result = updateHold(holdState, pose.isHandshake, frame.timestamp, {
        holdMs: HANDSHAKE_HOLD_MS,
        cooldownMs: HANDSHAKE_COOLDOWN_MS,
        graceMs: HANDSHAKE_DROPOUT_GRACE_MS
      });
      holdState = result.state;
      return { ...result.update, pose };
    },
    reset: () => {
      holdState = initialHoldState;
    }
  };
};
