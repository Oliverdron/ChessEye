// CS3483 addition: shared types for the hand-gesture layer.
// Every gesture (handshake now, "move done" / take-back later) is a
// GestureDetector that receives the same HandFrame from the shared
// hand-tracking loop in handTracking.ts.

// One MediaPipe landmark. x and y are normalised to [0, 1] of the video
// width and height; z is relative depth.
export interface Point {
  x: number;
  y: number;
  z: number;
}

export interface Hand {
  landmarks: Point[];   // 21 points, see MediaPipe hand landmark indices
  handedness: string;   // "Left" or "Right" (as seen by the camera)
}

export interface HandFrame {
  hands: Hand[];
  timestamp: number;    // ms, from performance.now()
  aspectRatio: number;  // video width / height, to measure distances in square units
}

export interface GestureUpdate {
  active: boolean;      // the pose is held in this frame
  progress: number;     // 0..1 towards triggering
  coolingDown: boolean; // recently triggered, ignoring input
  triggered: boolean;   // the gesture fired in this frame
}

export interface GestureDetector {
  update: (frame: HandFrame) => GestureUpdate;
  reset: () => void;
}
