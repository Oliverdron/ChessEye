// CS3483 addition: side panel while recording: handshake status, help and the move list.
import { useEffect, useId, useRef } from "react";
import type { HandTrackingStatus } from "../../gestures/handTracking";
import type { HandshakeControlState } from "./useHandshakeControl";
import { HandshakeIcon, Kbd } from "./feedbackUi";

export const trackingText = (status: HandTrackingStatus, handsSeen: number): string => {
  switch (status) {
    case "loading": return "Hand tracking: starting…";
    case "waiting": return "Hand tracking: waiting for the camera";
    case "paused": return "Hand tracking: off";
    case "error": return "Hand tracking: unavailable, use the buttons";
    case "running": return `Hand tracking: on · ${handsSeen} ${handsSeen === 1 ? "hand" : "hands"} in view`;
  }
};

export const HandshakeCard = ({ handshake, enabled, setEnabled, paused }: {
  handshake: HandshakeControlState,
  enabled: boolean,
  setEnabled: (enabled: boolean) => void,
  paused: boolean
}) => {
  const percent = Math.round(handshake.progress * 100);
  const holding = percent > 0 && !handshake.coolingDown;
  const switchId = useId();

  let hint = "Shake hands over the board to end the game.";
  if (!enabled) {
    hint = "Handshake control is off. Use End game instead.";
  } else if (handshake.coolingDown) {
    hint = "Handshake registered.";
  } else if (holding) {
    hint = `Keep holding to end the game… ${percent}%`;
  } else if (paused) {
    hint = "Paused: moves are not recorded. Shake hands to end the game, or press Resume.";
  }

  return (
    <section className="cc-card d-flex flex-column gap-3" aria-labelledby={`${switchId}-title`}
      style={{ borderColor: holding ? "var(--cc-info)" : undefined }}>
      <div className="cc-row" style={{ gap: 12 }}>
        <h2 id={`${switchId}-title`} className="d-flex align-items-center gap-2" style={{ fontSize: 16, fontWeight: 600 }}>
          <HandshakeIcon />Handshake
        </h2>
        <label className="cc-switch" htmlFor={switchId} style={{ minHeight: 40 }}>
          <input id={switchId} type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          On
        </label>
      </div>
      <div className="cc-progress" role="progressbar" aria-label="Handshake progress"
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={handshake.coolingDown ? 100 : percent}>
        <div className="cc-progress__bar" style={{ width: `${handshake.coolingDown ? 100 : percent}%` }} />
      </div>
      <p style={{ fontSize: 16 }}>{hint}</p>
      <p className="cc-muted" style={{ fontSize: 14 }}>{trackingText(handshake.status, handshake.handsSeen)}</p>
    </section>
  );
};

export const HelpCard = ({ onClose }: { onClose: () => void }) => (
  <section className="cc-card cc-help" aria-labelledby="cc-help-title">
    <div className="cc-row">
      <h2 id="cc-help-title" style={{ fontSize: 16, fontWeight: 600 }}>Gestures and shortcuts</h2>
      <button type="button" className="cc-btn cc-btn--icon" aria-label="Close help" onClick={onClose}>
        <i className="bi bi-x-lg" aria-hidden="true" />
      </button>
    </div>
    <dl>
      <dt><HandshakeIcon size={22} /></dt><dd>Shake hands over the board: start or end the game</dd>
      <dt><Kbd>Space</Kbd></dt><dd>Pause or resume recording</dd>
      <dt><Kbd>⌫</Kbd></dt><dd>Take back the last move (then put the piece back)</dd>
      <dt><Kbd>E</Kbd></dt><dd>End the game</dd>
    </dl>
  </section>
);

export interface MovePair {
  n: number,
  white: string,
  black: string
}

export const toPairs = (sans: string[], whiteFirst: boolean, firstMoveNumber: number): MovePair[] => {
  const pairs: MovePair[] = [];
  const all = whiteFirst ? sans : ["…", ...sans];
  for (let i = 0; i < all.length; i += 2) {
    pairs.push({ n: firstMoveNumber + i / 2, white: all[i], black: all[i + 1] ?? "" });
  }
  return pairs;
};

export const MovesCard = ({ pairs, plies }: { pairs: MovePair[], plies: number }) => {
  const listRef = useRef<HTMLOListElement>(null);
  const lastPair = pairs[pairs.length - 1];
  const lastIsBlack = lastPair !== undefined && lastPair.black !== "";

  // Keep the newest move in view
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll whenever a move is added or removed.
  useEffect(() => {
    const list = listRef.current;
    if (list !== null) {
      list.scrollTop = list.scrollHeight;
    }
  }, [plies]);

  return (
    <section className="cc-card d-flex flex-column gap-2" aria-labelledby="cc-moves-title">
      <div className="cc-row" style={{ alignItems: "baseline" }}>
        <h2 id="cc-moves-title" style={{ fontSize: 16, fontWeight: 600 }}>Moves</h2>
        <span className="cc-muted" style={{ fontSize: 14 }}>{plies} recorded</span>
      </div>
      {pairs.length === 0 ? (
        <p className="cc-muted" style={{ fontSize: 15 }}>No moves yet. Each move appears here as soon as it is recorded.</p>
      ) : (
        <ol ref={listRef} className="cc-moves" aria-label="Recorded moves">
          {pairs.map((pair, i) => {
            const latest = i === pairs.length - 1;
            return (
              <li key={pair.n} className={`cc-move${latest ? " cc-move--latest" : ""}`}>
                <span className="cc-move__num">{pair.n}.</span>
                <span className={latest && !lastIsBlack ? "cc-move__last" : ""}>{pair.white}</span>
                <span className={latest && lastIsBlack ? "cc-move__last" : ""}>{pair.black}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
};
