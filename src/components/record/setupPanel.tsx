// CS3483 addition: the four setup steps (a linear sequence: one decision per step).
import { Link } from "react-router-dom";
import CameraSelect from "./cameraSelect";
import type { useCameras } from "./cameraSelect";
import { HandshakeIcon, Kbd } from "./feedbackUi";
import type { StartChoice } from "./storage";

export type SetupStep = 1 | 2 | 3 | 4;

const STEP_LABELS = ["Camera", "Board corners", "Start position", "Ready"];

export const START_OPTIONS: { id: StartChoice, label: string, help: string }[] = [
  { id: "standard", label: "Standard starting position", help: "A new game from move 1." },
  { id: "white", label: "Position on the board, White to move", help: "Continue a game that is already in progress." },
  { id: "black", label: "Position on the board, Black to move", help: "Continue a game that is already in progress." }
];

export const Stepper = ({ step, setStep }: { step: SetupStep, setStep: (step: SetupStep) => void }) => (
  <nav aria-label="Setup steps">
    <ol className="cc-stepper">
      {STEP_LABELS.map((label, i) => {
        const n = (i + 1) as SetupStep;
        const done = n < step;
        const current = n === step;
        return (
          <li key={label}>
            <button type="button" disabled={!done}
              className={`cc-step${done ? " cc-step--done" : ""}${current ? " cc-step--current" : ""}`}
              aria-current={current ? "step" : undefined} onClick={() => setStep(n)}>
              <span className="cc-step__dot" aria-hidden="true">
                {done ? <i className="bi bi-check-lg" /> : n}
              </span>
              {label}
              <span className="visually-hidden">{done ? "(done)" : ""}</span>
            </button>
          </li>
        );
      })}
    </ol>
  </nav>
);

export const CAMERA_CAPTIONS: Record<SetupStep, string> = {
  1: "Move the camera until the whole board is in the picture.",
  2: "Drag a red marker if a corner is in the wrong place.",
  3: "The camera view stays visible so you can check the board.",
  4: "Hand tracking is watching for a handshake."
};

interface SetupPanelProps {
  step: SetupStep,
  setStep: (step: SetupStep) => void,
  cameras: ReturnType<typeof useCameras>,
  hasLastSetup: boolean,
  onUseLastSetup: () => void,
  cornersOk: boolean,
  cornersBusy: boolean,
  cornersMessage: string[],
  onFindCorners: () => void,
  start: StartChoice,
  setStart: (start: StartChoice) => void,
  startBusy: boolean,
  startMessage: string[],
  nextDisabled: boolean,
  onNext: () => void,
  trackingLabel: string,
  onStartRecording: () => void
}

const SetupPanel = (props: SetupPanelProps) => {
  const { step, setStep } = props;

  return (
    <section className="cc-card cc-panel cc-area-panel" aria-labelledby="cc-step-title">
      <p className="cc-eyebrow">Step {step} of 4</p>

      {step === 1 && (
        <>
          <h2 id="cc-step-title">Choose a camera</h2>
          <CameraSelect cameras={props.cameras} />
          <ul className="cc-tips">
            <li>Mount it above the board, looking down.</li>
            <li>Keep all 64 squares and both players' hands in view.</li>
            <li>Avoid strong reflections on the board.</li>
          </ul>
          {props.hasLastSetup && (
            <div className="cc-hint-box">
              <span>Same board and camera as last time?</span>
              <button type="button" className="cc-btn" onClick={props.onUseLastSetup}>Use last setup</button>
            </div>
          )}
        </>
      )}

      {step === 2 && (
        <>
          <h2 id="cc-step-title">Find the board corners</h2>
          <p className="cc-muted" style={{ color: "var(--cc-text-2)" }}>
            ChessCam needs the four corners to know where each square is. Set up the pieces and keep
            your hands off the board.
          </p>
          <button type="button" className="cc-btn" style={{ minHeight: 56, fontSize: 17 }}
            onClick={props.onFindCorners} disabled={props.cornersBusy}>
            <i className="bi bi-bounding-box-circles" aria-hidden="true" />
            {props.cornersBusy ? "Looking for the board…" : props.cornersOk ? "Find corners again" : "Find corners"}
          </button>
          <div role="status" aria-live="polite">
            {props.cornersOk ? (
              <div className="cc-success">
                <i className="bi bi-check-lg" aria-hidden="true" />
                <span className="d-flex flex-column gap-1">
                  <b>Corners found</b>
                  <span style={{ color: "var(--cc-text-2)" }}>
                    Check that a1 is at White's bottom-left. Not right? Drag a marker on the camera image.
                  </span>
                </span>
              </div>
            ) : props.cornersMessage.length > 0 && !props.cornersBusy ? (
              <div className="cc-error">
                <i className="bi bi-exclamation-triangle" aria-hidden="true" />
                <span className="d-flex flex-column gap-1">
                  <b>{props.cornersMessage[0]}</b>
                  <span style={{ color: "var(--cc-text-2)" }}>{props.cornersMessage[1]}</span>
                </span>
              </div>
            ) : (
              <p className="cc-muted" style={{ fontSize: 15 }}>Next unlocks once the corners are found.</p>
            )}
          </div>
        </>
      )}

      {step === 3 && (
        <fieldset className="d-flex flex-column gap-2">
          <legend id="cc-step-title" style={{ fontSize: 26, fontWeight: 700, marginBottom: 14 }}>Starting position</legend>
          {START_OPTIONS.map((option) => (
            <label key={option.id} className={`cc-opt${props.start === option.id ? " cc-opt--checked" : ""}`}>
              <input type="radio" name="cc-start" checked={props.start === option.id}
                onChange={() => props.setStart(option.id)} />
              <span className="d-flex flex-column gap-1">
                <b style={{ fontWeight: 600 }}>{option.label}</b>
                <span className="cc-muted" style={{ fontSize: 14 }}>{option.help}</span>
              </span>
            </label>
          ))}
          <div role="status" aria-live="polite">
            {props.startBusy && <p className="cc-muted" style={{ fontSize: 15 }}>Reading the position on the board…</p>}
            {!props.startBusy && props.startMessage.length > 0 && (
              <div className="cc-error">
                <i className="bi bi-exclamation-triangle" aria-hidden="true" />
                <span className="d-flex flex-column gap-1">
                  <b>{props.startMessage[0]}</b>
                  <span style={{ color: "var(--cc-text-2)" }}>{props.startMessage[1]}</span>
                </span>
              </div>
            )}
          </div>
        </fieldset>
      )}

      {step === 4 && (
        <>
          <h2 id="cc-step-title">Ready to record</h2>
          <ul className="cc-summary">
            <li><span className="cc-muted">Camera</span><b>{props.cameras.label}</b></li>
            <li><span className="cc-muted">Corners</span><b>{props.cornersOk ? "Found" : "Not found"}</b></li>
            <li>
              <span className="cc-muted">Start</span>
              <b>{START_OPTIONS.find((o) => o.id === props.start)?.label}</b>
            </li>
          </ul>
          <div className="cc-gestures">
            <b style={{ fontSize: 15 }}>Gestures</b>
            <span className="cc-gesture"><HandshakeIcon size={34} /><span><b>Shake hands</b> over the board to start</span></span>
            <span className="cc-gesture"><HandshakeIcon size={34} /><span><b>Shake hands again</b> to end the game</span></span>
            <span className="cc-muted" style={{ fontSize: 14 }}>
              Hold the handshake for about one second. {props.trackingLabel}
            </span>
          </div>
        </>
      )}

      <div className="cc-panel__nav">
        {step === 1
          ? <Link to="/" className="cc-btn">Back</Link>
          : <button type="button" className="cc-btn" onClick={() => setStep((step - 1) as SetupStep)}>Back</button>}
        {step < 4 ? (
          <button type="button" className="cc-btn cc-btn--primary" style={{ minWidth: 140 }}
            onClick={props.onNext} disabled={props.nextDisabled}>
            Next<Kbd>Enter</Kbd>
          </button>
        ) : (
          <button type="button" className="cc-btn cc-btn--primary cc-btn--xl" onClick={props.onStartRecording}>
            Start recording<Kbd>Space</Kbd>
          </button>
        )}
      </div>
    </section>
  );
};

export default SetupPanel;
