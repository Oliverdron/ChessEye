// CS3483 addition: sidebar indicator for handshake control
// (tracking on/off, hands seen, handshake progress, last gesture event).
import { useId, useState } from "react";
import { useHandshakeControl } from "./useHandshakeControl";
import type { HandTrackingStatus } from "../../gestures/handTracking";
import type { CornersRef, SetBoolean, SetStringArray, VideoRef } from "../../types";

const STATUS_LABELS: Record<HandTrackingStatus, { label: string, badge: string }> = {
  loading: { label: "Loading…", badge: "bg-secondary" },
  waiting: { label: "Waiting for camera", badge: "bg-warning text-dark" },
  running: { label: "On", badge: "bg-success" },
  paused: { label: "Off", badge: "bg-secondary" },
  error: { label: "Error", badge: "bg-danger" }
};

const HandshakeControl = ({ videoRef, cornersRef, playing, setPlaying, setText }: {
  videoRef: VideoRef,
  cornersRef: CornersRef,
  playing: boolean,
  setPlaying: SetBoolean,
  setText: SetStringArray
}) => {
  const [enabled, setEnabled] = useState<boolean>(true);
  const switchId = useId();
  const { status, handsSeen, progress, coolingDown, pose, lastEvent } = useHandshakeControl({
    videoRef, cornersRef, playing, setPlaying, setText, enabled
  });

  const percent = Math.round(progress * 100);
  const { label, badge } = STATUS_LABELS[status];

  let hint = playing ? "Shake hands to end the game" : "Shake hands to start";
  if (coolingDown) {
    hint = "Handshake registered";
  } else if (progress > 0) {
    hint = `Hold the handshake… ${percent}%`;
  }

  return (
    <li className="my-1 text-white small text-start border border-secondary rounded p-2">
      <div className="form-check form-switch mb-1">
        <input className="form-check-input" type="checkbox" role="switch" id={switchId}
          checked={enabled} aria-checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        <label className="form-check-label fw-bold" htmlFor={switchId}>🤝 Handshake control</label>
      </div>
      <div className="d-flex justify-content-between">
        <span>Hand tracking</span>
        <span className={`badge ${badge}`}>{label}</span>
      </div>
      <div className="d-flex justify-content-between">
        <span>Hands seen</span>
        <span className={handsSeen === 2 ? "fw-bold text-success" : ""}>{handsSeen}</span>
      </div>
      <div className="progress my-1" style={{ height: "8px" }} role="progressbar"
        aria-label="Handshake progress" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className={`progress-bar ${coolingDown ? "bg-info" : "bg-success"}`}
          style={{ width: `${coolingDown ? 100 : percent}%` }} />
      </div>
      <div className="text-white-50">{hint}</div>
      {pose?.palmDistance != null && pose.directionDot != null && (
        // Live values for tuning the thresholds in src/gestures/handshake.ts
        <div className="text-white-50" style={{ fontSize: "0.7rem" }}>
          palms {pose.palmDistance.toFixed(2)} · dot {pose.directionDot.toFixed(2)}
        </div>
      )}
      {lastEvent !== "" && <div className="mt-1" role="status" aria-live="polite">{lastEvent}</div>}
    </li>
  );
};

export default HandshakeControl;
