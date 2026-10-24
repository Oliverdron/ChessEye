// CS3483 addition: shared MediaPipe hand-tracking loop.
// Runs the Hand Landmarker on the existing camera <video> element in its own throttled
// loop (separate from ChessCam's findPieces loop) and hands each result to the caller.
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import type { HandLandmarkerResult } from "@mediapipe/tasks-vision";
import type { VideoRef } from "../types";
import type { HandFrame } from "./types";

// Keep the version in this URL the same as @mediapipe/tasks-vision in package.json.
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

// Detections per second. Higher = smoother progress but more CPU/GPU taken from piece detection.
export const HAND_TRACKING_FPS = 12;
const NUM_HANDS = 2;

export type HandTrackingStatus = "loading" | "waiting" | "running" | "paused" | "error";

const toFrame = (result: HandLandmarkerResult, timestamp: number, video: HTMLVideoElement): HandFrame => ({
  hands: result.landmarks.map((landmarks, i) => ({
    landmarks,
    handedness: result.handedness[i]?.[0]?.categoryName ?? ""
  })),
  timestamp,
  aspectRatio: video.videoWidth / video.videoHeight
});

const createLandmarker = async (): Promise<HandLandmarker> => {
  const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
  const create = (delegate: "GPU" | "CPU") => HandLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: "VIDEO",
    numHands: NUM_HANDS
  });
  try {
    return await create("GPU");
  } catch (error) {
    console.warn("Hand tracking: GPU delegate failed, falling back to CPU", error);
    return await create("CPU");
  }
};

// Starts the loop and returns a function that stops it.
export const startHandTracking = ({ videoRef, isEnabled, onFrame, onStatus }: {
  videoRef: VideoRef,
  isEnabled: () => boolean,
  onFrame: (frame: HandFrame) => void,
  onStatus: (status: HandTrackingStatus) => void
}): (() => void) => {
  let active = true;
  let landmarker: HandLandmarker | null = null;
  let timer: number | undefined;
  let lastTimestamp = 0;

  const tick = () => {
    if (!active || landmarker === null) {
      return;
    }
    const start = performance.now();
    try {
      const video = videoRef.current;
      if (!isEnabled()) {
        onStatus("paused");
      } else if (video === null || video.readyState < 2 || video.videoWidth === 0) {
        onStatus("waiting");
      } else {
        // VIDEO mode needs strictly increasing timestamps.
        const timestamp = Math.max(performance.now(), lastTimestamp + 1);
        lastTimestamp = timestamp;
        const result = landmarker.detectForVideo(video, timestamp);
        onStatus("running");
        onFrame(toFrame(result, timestamp, video));
      }
    } catch (error) {
      console.error("Hand tracking failed", error);
    }
    const elapsed = performance.now() - start;
    timer = window.setTimeout(tick, Math.max(0, (1000 / HAND_TRACKING_FPS) - elapsed));
  };

  onStatus("loading");
  createLandmarker()
    .then((created) => {
      if (!active) {
        created.close();
        return;
      }
      landmarker = created;
      tick();
    })
    .catch((error: unknown) => {
      console.error("Unable to load the hand tracking model", error);
      if (active) {
        onStatus("error");
      }
    });

  return () => {
    active = false;
    window.clearTimeout(timer);
    landmarker?.close();
    landmarker = null;
  };
};
