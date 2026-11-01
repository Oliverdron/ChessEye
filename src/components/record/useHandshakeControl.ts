// CS3483 addition: hand tracking + handshake detection for the record page.
// The page decides what a handshake means (start, end or restart a game); this hook only
// reports tracking state and calls onHandshake when a handshake has been held long enough.
import { useEffect, useEffectEvent, useState } from "react";
import { startHandTracking } from "../../gestures/handTracking";
import type { HandTrackingStatus } from "../../gestures/handTracking";
import { createHandshakeDetector } from "../../gestures/handshake";
import type { CornersDict, VideoRef } from "../../types";

// The corner markers start as a small, exactly axis-aligned square (see cornersSlice).
// Window resizes only rescale it, so it stays exactly axis-aligned until the corners are
// found by "Find corners" or dragged by hand. (Their y values are always negative because
// the markers are positioned below the video, so "negative" does not mean "not found".)
export const cornersFound = (c: CornersDict): boolean => !(
  c.a1[0] === c.a8[0] && c.h1[0] === c.h8[0] && c.a1[1] === c.h1[1] && c.a8[1] === c.h8[1]
);

// ChessCam's piece detection only works when a1 -> h1 -> h8 -> a8 runs anticlockwise on screen
// (negative signed area, y pointing down). With mirrored labels it rejects every piece, so
// recording would "start" but never record a move.
export const cornersMirrored = (c: CornersDict): boolean => {
  const points = [c.a1, c.h1, c.h8, c.a8];
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    area += (x1 * y2) - (x2 * y1);
  }
  return area > 0;
};

export interface HandshakeControlState {
  status: HandTrackingStatus;
  handsSeen: number;
  progress: number;
  coolingDown: boolean;
}

export const useHandshakeControl = ({ videoRef, enabled, onHandshake }: {
  videoRef: VideoRef,
  enabled: boolean,
  onHandshake: () => void
}): HandshakeControlState => {
  const [status, setStatus] = useState<HandTrackingStatus>("loading");
  const [handsSeen, setHandsSeen] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [coolingDown, setCoolingDown] = useState<boolean>(false);

  const handleHandshake = useEffectEvent(() => onHandshake());
  const isEnabled = useEffectEvent(() => enabled);

  const onStatus = useEffectEvent((newStatus: HandTrackingStatus) => {
    setStatus(newStatus);
    if (newStatus !== "running") {
      setHandsSeen(0);
      setProgress(0);
    }
  });

  useEffect(() => {
    const detector = createHandshakeDetector();
    return startHandTracking({
      videoRef,
      isEnabled,
      onStatus,
      onFrame: (frame) => {
        const update = detector.update(frame);
        setHandsSeen(frame.hands.length);
        setProgress(update.progress);
        setCoolingDown(update.coolingDown);
        if (update.triggered) {
          handleHandshake();
        }
      }
    });
  }, [videoRef]);

  return { status, handsSeen, progress, coolingDown };
};
