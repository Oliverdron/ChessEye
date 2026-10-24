// CS3483 addition: handshake starts / ends / restarts the game on the record page.
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { gameResetFen, gameResetMoves, makeBoard, useGame } from "../../slices/gameSlice";
import { startHandTracking } from "../../gestures/handTracking";
import type { HandTrackingStatus } from "../../gestures/handTracking";
import { createHandshakeDetector } from "../../gestures/handshake";
import type { HandshakePose } from "../../gestures/handshake";
import { playCue } from "../../feedback/sound";
import type { SoundCue } from "../../feedback/sound";
import { speak } from "../../feedback/speech";
import type { CornersDict, CornersRef, SetBoolean, SetStringArray, VideoRef } from "../../types";

// Wait for the beep to finish before speaking.
const SPEECH_DELAY_MS = 400;

// The corner markers start as a small, exactly axis-aligned square (see cornersSlice).
// Window resizes only rescale it, so it stays exactly axis-aligned until the corners are
// found by "Find Corners" or dragged by hand. (Their y values are always negative because
// the markers are positioned below the video, so "negative" does not mean "not found".)
export const cornersFound = (c: CornersDict): boolean => !(
  c.a1[0] === c.a8[0] && c.h1[0] === c.h8[0] && c.a1[1] === c.h1[1] && c.a8[1] === c.h8[1]
);

export interface HandshakeControlState {
  status: HandTrackingStatus;
  handsSeen: number;
  progress: number;
  coolingDown: boolean;
  pose: HandshakePose | null;
  lastEvent: string;
}

export const useHandshakeControl = ({ videoRef, cornersRef, playing, setPlaying, setText, enabled }: {
  videoRef: VideoRef,
  cornersRef: CornersRef,
  playing: boolean,
  setPlaying: SetBoolean,
  setText: SetStringArray,
  enabled: boolean
}): HandshakeControlState => {
  const dispatch = useDispatch();
  const game = useGame();

  const [status, setStatus] = useState<HandTrackingStatus>("loading");
  const [handsSeen, setHandsSeen] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [coolingDown, setCoolingDown] = useState<boolean>(false);
  const [pose, setPose] = useState<HandshakePose | null>(null);
  const [lastEvent, setLastEvent] = useState<string>("");

  // True after a handshake ended the game, so the next handshake starts a fresh one.
  const gameOverRef = useRef<boolean>(false);

  useEffect(() => {
    if (playing) {
      // Resumed with the Play button: we are back in the same game.
      gameOverRef.current = false;
    }
  }, [playing]);

  const announce = (message: string, cue: SoundCue, spoken: string) => {
    setText([message]);
    setLastEvent(message);
    playCue(cue);
    speak(spoken, SPEECH_DELAY_MS);
  };

  const onHandshake = useEffectEvent(() => {
    if (playing) {
      // End the game but KEEP the moves (unlike the Stop button) so the PGN can be copied.
      setPlaying(false);
      gameOverRef.current = true;
      const nMoves = makeBoard(game).history.length;
      announce(`Game over – ${nMoves} move${nMoves === 1 ? "" : "s"} recorded`, "end", "Game over");
      return;
    }

    if (!cornersFound(cornersRef.current)) {
      announce("Find the board corners first", "warning", "Find the board corners first");
      return;
    }

    if (gameOverRef.current) {
      dispatch(gameResetMoves());
      dispatch(gameResetFen());
      gameOverRef.current = false;
      announce("Handshake detected – new game started", "start", "New game started");
    } else {
      announce("Handshake detected – game started", "start", "Game started");
    }
    setPlaying(true);
  });

  const isEnabled = useEffectEvent(() => enabled);

  const onStatus = useEffectEvent((newStatus: HandTrackingStatus) => {
    setStatus(newStatus);
    if (newStatus !== "running") {
      setHandsSeen(0);
      setProgress(0);
      setPose(null);
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
        setPose(update.pose);
        if (update.triggered) {
          onHandshake();
        }
      }
    });
  }, [videoRef]);

  return { status, handsSeen, progress, coolingDown, pose, lastEvent };
};
