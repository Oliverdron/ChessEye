// CS3483 addition: the redesigned record page.
// One page with three views so the camera <video> (and ChessCam's detection loop) stays
// mounted the whole time: Setup (4 steps) -> Recording (live / paused) -> Game over.
// The camera keeps the same place in the React tree; CSS grid areas move it between layouts.
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useWindowHeight } from "@react-hook/window-size";
import Video from "../common/video";
import ChessboardPreview from "../common/chessboardPreview";
import { cornersReset, cornersSet, useCorners } from "../../slices/cornersSlice";
import {
  gameResetFen, gameResetMoves, gameResetStart, gameSetFen, gameTakeBack, makeBoard, useGame
} from "../../slices/gameSlice";
import { findCorners } from "../../utils/findCorners";
import { findFen } from "../../utils/findFen";
import { getMarkerXY, getXY } from "../../utils/detect";
import { CORNER_KEYS } from "../../utils/constants";
import { playCue } from "../../feedback/sound";
import { speak } from "../../feedback/speech";
import { describeMove } from "../../feedback/describeMove";
import type { CornersDict, ModelRefs, SetBoolean, SetStringArray } from "../../types";
import { cornersFound, cornersMirrored, useHandshakeControl } from "./useHandshakeControl";
import { useMoveFeedback } from "./useMoveFeedback";
import type { RecordedMove } from "./useMoveFeedback";
import { switchCamera, useCameras } from "./cameraSelect";
import SetupPanel, { CAMERA_CAPTIONS, Stepper } from "./setupPanel";
import type { SetupStep } from "./setupPanel";
import { HandshakeCard, HelpCard, MovesCard, toPairs, trackingText } from "./livePanel";
import GameOverPanel from "./gameOverPanel";
import { Banner, ConfirmDialog, HandshakeIcon, Kbd, MessageBox, MoveToast } from "./feedbackUi";
import type { BannerMessage, Problem } from "./feedbackUi";
import { loadLastSetup, loadPrefs, saveLastSetup, savePrefs } from "./storage";
import type { RecordPrefs, StartChoice } from "./storage";

type Phase = "setup" | "recording" | "paused" | "over";

// Wait for the beep to finish before speaking.
const SPEECH_DELAY_MS = 400;
const BANNER_MS = 4000;
const TOAST_MS = 2000;

// The detection loop reports "FPS: …" every frame. The redesign shows the move list instead,
// so those messages are dropped (this also avoids re-rendering the page on every frame).
const ignoreDetectionText: SetStringArray = () => undefined;

const RecordPage = () => {
  const { piecesModelRef, xcornersModelRef } = useOutletContext<ModelRefs>();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const corners = useCorners();
  const game = useGame();
  const windowHeight = useWindowHeight();

  const [phase, setPhase] = useState<Phase>("setup");
  const [step, setStep] = useState<SetupStep>(1);
  const [prefs, setPrefs] = useState<RecordPrefs>(loadPrefs);
  const [lastSetup] = useState(loadLastSetup);
  const [start, setStart] = useState<StartChoice>("standard");
  const [cornersBusy, setCornersBusy] = useState(false);
  const [cornersMessage, setCornersMessage] = useState<string[]>([]);
  const [startBusy, setStartBusy] = useState(false);
  const [startMessage, setStartMessage] = useState<string[]>([]);
  const [banner, setBanner] = useState<BannerMessage | null>(null);
  const [toast, setToast] = useState<RecordedMove | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [confirm, setConfirm] = useState<"discard" | "leave" | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraSlotRef = useRef<HTMLDivElement>(null);
  const cornersRef = useRef<CornersDict>(corners);
  const playingRef = useRef<boolean>(false);

  const playing = phase === "recording";
  const live = phase === "recording" || phase === "paused";
  const cameras = useCameras(videoRef);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    cornersRef.current = corners;
  }, [corners]);

  // Each view starts at the top (the layout changes completely between views)
  const view = phase === "setup" ? "setup" : (live ? "live" : "over");
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the view changes.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  useEffect(() => {
    dispatch(cornersReset());
    dispatch(gameResetStart());
    dispatch(gameResetMoves());
    dispatch(gameResetFen());
  }, [dispatch]);

  // ----- Derived game info -----
  const board = useMemo(() => makeBoard(game), [game]);
  const sans = board.history.map((entry) => entry.san);
  const plies = sans.length;
  const [, turn, , , , fullmove] = game.fen.split(" ");
  const startFields = game.start.split(" ");
  const pairs = toPairs(sans, startFields[1] !== "b", Number(startFields[5]) || 1);
  const lastPair = pairs[pairs.length - 1];
  const lastSan = sans[plies - 1];
  const lastLabel = lastPair === undefined ? "" : `${lastPair.n}${lastPair.black === "" ? "." : "…"} ${lastSan}`;
  const fullMoves = Math.ceil(plies / 2);
  const cornersOk = cornersFound(corners) && !cornersMirrored(corners);

  // ----- Feedback -----
  const showBanner = (kind: BannerMessage["kind"], title: string, detail: string) =>
    setBanner({ kind, title, detail, id: Date.now() });

  useEffect(() => {
    if (banner === null) {
      return;
    }
    const timer = window.setTimeout(() => setBanner(null), BANNER_MS);
    return () => window.clearTimeout(timer);
  }, [banner]);

  const recorded = useMoveFeedback({ playing, moveSound: prefs.moveSound, speakMoves: prefs.speakMoves });
  useEffect(() => {
    setToast(recorded);
  }, [recorded]);

  useEffect(() => {
    if (toast === null) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const setPref = (key: keyof RecordPrefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    savePrefs(next);
  };

  // ----- Actions -----
  const goToCorners = () => {
    setProblem(null);
    setPhase("setup");
    setStep(2);
  };

  const resetMoves = () => {
    dispatch(gameResetMoves());
    dispatch(gameSetFen(game.start));
  };

  const saveSetup = () => {
    const canvas = canvasRef.current;
    if (canvas === null || canvas.width === 0) {
      return;
    }
    const modelCorners = {} as CornersDict;
    CORNER_KEYS.forEach((key) => {
      modelCorners[key] = getXY(cornersRef.current[key], canvas.height, canvas.width);
    });
    saveLastSetup({ deviceId: cameras.deviceId, corners: modelCorners, start });
  };

  const startRecording = () => {
    const c = cornersRef.current;
    if (!cornersFound(c) || cornersMirrored(c)) {
      const mirrored = cornersFound(c);
      setProblem({
        title: "Can't start recording yet",
        cause: mirrored
          ? "The corner labels are mirrored, so ChessEye would not recognise any piece."
          : "The board corners haven't been found, so ChessEye can't read the squares.",
        fix: "Go to Board corners and press Find corners. All four corners must be visible to the camera.",
        action: { label: "Go to Board corners", run: goToCorners }
      });
      playCue("warning");
      speak(mirrored ? "The corners are mirrored. Find the corners again" : "Find the board corners first",
        SPEECH_DELAY_MS);
      return;
    }
    const isNewGame = phase === "over";
    if (isNewGame) {
      resetMoves();
    }
    setProblem(null);
    saveSetup();
    setPhase("recording");
    playCue("start");
    speak(isNewGame ? "New game started" : "Game started", SPEECH_DELAY_MS);
    showBanner("start", "Recording started", "Shake hands again to end the game");
  };

  const endGame = () => {
    setPhase("over");
    setShowHelp(false);
    playCue("end");
    speak("Game over", SPEECH_DELAY_MS);
    showBanner("over", "Game over", `${fullMoves} ${fullMoves === 1 ? "move" : "moves"} recorded`);
  };

  const togglePause = () => setPhase(phase === "paused" ? "recording" : "paused");

  const resumeGame = () => {
    setPhase("recording");
    playCue("start");
    showBanner("start", "Recording resumed", "Shake hands to end the game");
  };

  const takeBack = () => {
    if (plies === 0) {
      return;
    }
    const label = lastLabel;
    const words = describeMove(lastSan, game.lastMove);
    dispatch(gameTakeBack());
    setToast({ label: `Took back ${label}`, words: `${words}. Put the piece back on the board.`, id: Date.now() });
  };

  const discardGame = () => {
    setConfirm(null);
    resetMoves();
    setPhase("setup");
    setStep(4);
  };

  const newGame = () => {
    resetMoves();
    setPhase("setup");
    setStep(4);
  };

  const leave = () => {
    if (live && plies > 0) {
      setConfirm("leave");
    } else {
      void navigate("/");
    }
  };

  const onCameraError = () => {
    setProblem({
      title: "Can't use the camera",
      cause: "The browser blocked camera access, or no camera is connected.",
      fix: "Allow camera access for this site (usually an icon in the address bar), check that the camera is connected, then reload the page.",
      action: { label: "Reload page", run: () => window.location.reload() }
    });
  };

  // ----- Setup steps -----
  const collect = (store: { messages: string[] }): SetStringArray =>
    (value) => {
      store.messages = typeof value === "function" ? value(store.messages) : value;
    };

  const onFindCorners = () => {
    setCornersBusy(true);
    setCornersMessage([]);
    const store = { messages: [] as string[] };
    findCorners(piecesModelRef, xcornersModelRef, videoRef, canvasRef, dispatch, collect(store))
      .then(() => {
        setCornersMessage(store.messages.length > 0 ? store.messages
          : ["The camera isn't ready yet", "Wait until the camera image appears, then try again."]);
      })
      .catch((error: unknown) => {
        console.error("Unable to find chessboard corners", error);
        setCornersMessage(["Couldn't find the four corners", "Something went wrong while reading the board. Try again."]);
      })
      .finally(() => setCornersBusy(false));
  };

  const shownCornersMessage = cornersFound(corners) && cornersMirrored(corners)
    ? ["The corner labels are mirrored", "a1 must be at White's bottom-left. Press Find corners again."]
    : cornersMessage;

  const confirmStart = () => {
    setStartMessage([]);
    if (start === "standard") {
      dispatch(gameResetStart());
      dispatch(gameResetMoves());
      dispatch(gameResetFen());
      setStep(4);
      return;
    }
    setStartBusy(true);
    const store = { messages: [] as string[] };
    findFen({
      piecesModelRef, videoRef, cornersRef, canvasRef, dispatch,
      setText: collect(store), color: start === "white" ? "white" : "black"
    })
      .then(() => {
        if (store.messages[0] === "Set starting FEN") {
          setStep(4);
          return;
        }
        const reason = store.messages.slice(1).join(" ");
        setStartMessage(["Couldn't read the position",
          `${reason === "" ? "The camera isn't ready yet." : `${reason}.`} Check that every piece is visible, or choose Standard starting position.`]);
      })
      .catch((error: unknown) => {
        console.error("Unable to infer the starting position", error);
        setStartMessage(["Couldn't read the position", "Try again, or choose Standard starting position."]);
      })
      .finally(() => setStartBusy(false));
  };

  const nextDisabled = (step === 2 && !cornersOk) || (step === 3 && startBusy);
  const setupNext = () => {
    if (nextDisabled) {
      return;
    }
    if (step === 3) {
      confirmStart();
    } else if (step < 4) {
      setStep((step + 1) as SetupStep);
    }
  };

  const applyLastSetup = async () => {
    const canvas = canvasRef.current;
    if (lastSetup === null || canvas === null || canvas.width === 0) {
      return;
    }
    if (lastSetup.deviceId !== null) {
      await switchCamera(videoRef, lastSetup.deviceId)
        .catch((error: unknown) => console.warn("Last camera is not available", error));
    }
    CORNER_KEYS.forEach((key) => {
      dispatch(cornersSet({ key, xy: getMarkerXY(lastSetup.corners[key], canvas.height, canvas.width) }));
    });
    setStart(lastSetup.start);
    if (lastSetup.start === "standard") {
      dispatch(gameResetStart());
      dispatch(gameResetMoves());
      dispatch(gameResetFen());
      setStep(4);
    } else {
      // The position has to be read from the board again
      setStep(3);
    }
  };

  // ----- Handshake -----
  const handshake = useHandshakeControl({
    videoRef,
    enabled: prefs.handshake && confirm === null && (phase !== "setup" || step === 4),
    onHandshake: () => {
      if (live) {
        endGame();
      } else {
        startRecording();
      }
    }
  });

  // ----- Keyboard shortcuts (shown next to the buttons) -----
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || confirm !== null) {
      return;
    }
    // Let focused controls handle their own keys (Space / Enter on a button clicks it).
    const target = e.target as HTMLElement | null;
    if (target?.closest("input, select, textarea, button, a, [contenteditable]")) {
      return;
    }
    if (phase === "setup") {
      if (e.key === "Enter" && step < 4) {
        e.preventDefault();
        setupNext();
      } else if (e.key === " " && step === 4) {
        e.preventDefault();
        startRecording();
      }
    } else if (live) {
      if (e.key === " ") {
        e.preventDefault();
        togglePause();
      } else if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        endGame();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        takeBack();
      }
    }
  });

  useEffect(() => {
    const listener = (e: KeyboardEvent) => onKeyDown(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  // The video only calls this for uploaded files (which can end); here it can only pause.
  const setPlayingFromVideo: SetBoolean = (value) => {
    const next = typeof value === "function" ? value(playingRef.current) : value;
    if (!next) {
      setPhase((p) => (p === "recording" ? "paused" : p));
    }
  };

  const cameraCaption = phase === "setup" ? CAMERA_CAPTIONS[step]
    : live ? "Camera · corners locked"
    : "Shake hands over the board to start a new game with the same setup.";

  return (
    <div className={`cc cc-record cc-record--${view}`}>
      <div className="cc-page">
        <header className="cc-row">
          <div className="d-flex flex-wrap align-items-center gap-3">
            {phase === "setup" ? (
              <>
                <Link to="/" className="cc-btn cc-btn--icon">
                  <i className="bi bi-chevron-left" aria-hidden="true" />Home
                </Link>
                <h1 style={{ fontSize: 22 }}>Set up recording</h1>
              </>
            ) : (
              <>
                <button type="button" className="cc-btn cc-btn--icon" aria-label="Home" onClick={leave}>
                  <i className="bi bi-house" aria-hidden="true" />
                </button>
                <div role="status" aria-live="polite"
                  className={`cc-state${phase === "paused" ? " cc-state--paused" : ""}${phase === "over" ? " cc-state--over" : ""}`}>
                  {phase === "recording" && <span className="cc-rec-dot" aria-hidden="true" />}
                  {phase === "paused" && <i className="bi bi-pause-fill" style={{ fontSize: 22 }} aria-hidden="true" />}
                  {phase === "over" && <i className="bi bi-flag" style={{ fontSize: 20, color: "var(--cc-ok)" }} aria-hidden="true" />}
                  <span className="d-flex flex-column">
                    <span className="cc-state__title">
                      {phase === "recording" ? "Recording" : phase === "paused" ? "Paused" : "Game over"}
                    </span>
                    <span className="cc-state__detail">
                      {phase === "over"
                        ? (plies > 0 ? `Ended after ${lastLabel}` : "No moves were recorded")
                        : `Move ${fullmove} · ${turn === "w" ? "White" : "Black"} to move`}
                    </span>
                  </span>
                </div>
              </>
            )}
          </div>

          {phase === "setup" && <Stepper step={step} setStep={setStep} />}
          {live && (
            <div className="d-flex flex-wrap align-items-center gap-2">
              <label className="cc-switch">
                <input type="checkbox" checked={prefs.moveSound} onChange={(e) => setPref("moveSound", e.target.checked)} />
                Move sound
              </label>
              <label className="cc-switch">
                <input type="checkbox" checked={prefs.speakMoves} onChange={(e) => setPref("speakMoves", e.target.checked)} />
                Speak moves
              </label>
              <button type="button" className="cc-btn cc-btn--icon" aria-label="Help: gestures and shortcuts"
                aria-expanded={showHelp} onClick={() => setShowHelp(!showHelp)}>
                <i className="bi bi-question-lg" aria-hidden="true" />
              </button>
            </div>
          )}
          {phase === "over" && (
            <div className="d-flex flex-wrap align-items-center gap-2" style={{ color: "var(--cc-text-2)", fontSize: 15 }}>
              <span>Ended by mistake?</span>
              <button type="button" className="cc-btn" onClick={resumeGame}>
                <i className="bi bi-arrow-counterclockwise" aria-hidden="true" />Resume this game
              </button>
            </div>
          )}
        </header>

        {problem !== null && <MessageBox problem={problem} onClose={() => setProblem(null)} />}

        <main className="cc-record__main">
          {phase !== "setup" && (
            <section className="cc-area-board" aria-label={live ? "Recorded position" : "Final position"}>
              <ChessboardPreview fen={game.fen} lastMove={game.lastMove} fluid={true} />
              {live && plies > 0 && (
                <p className="cc-last-move">
                  <span className="cc-muted">Last move</span><b>{lastLabel}</b>
                  <span style={{ color: "var(--cc-text-2)" }}>{describeMove(lastSan, game.lastMove)}</span>
                </p>
              )}
              {live && plies === 0 && <p className="cc-muted">Play your first move on the board.</p>}
            </section>
          )}

          <div className="cc-area-camera">
            <div ref={cameraSlotRef} className="cc-camera">
              <Video piecesModelRef={piecesModelRef} canvasRef={canvasRef} videoRef={videoRef}
                playing={playing} setPlaying={setPlayingFromVideo} playingRef={playingRef}
                setText={ignoreDetectionText} mode="record" cornersRef={cornersRef}
                fitRef={cameraSlotRef} maxHeight={phase === "setup" ? Math.max(260, windowHeight - 240) : 360}
                showMarkers={phase === "setup" && step >= 2} onCameraError={onCameraError} />
            </div>
            <p className="cc-camera__caption">{cameraCaption}</p>
          </div>

          {phase === "setup" && (
            <SetupPanel step={step} setStep={setStep} cameras={cameras}
              hasLastSetup={lastSetup !== null} onUseLastSetup={() => void applyLastSetup()}
              cornersOk={cornersOk} cornersBusy={cornersBusy} cornersMessage={shownCornersMessage}
              onFindCorners={onFindCorners} start={start} setStart={setStart}
              startBusy={startBusy} startMessage={startMessage}
              nextDisabled={nextDisabled} onNext={setupNext}
              trackingLabel={trackingText(handshake.status, handshake.handsSeen)}
              onStartRecording={startRecording} />
          )}
          {live && (
            <div className="cc-area-panel">
              {showHelp && <HelpCard onClose={() => setShowHelp(false)} />}
              <HandshakeCard handshake={handshake} enabled={prefs.handshake}
                setEnabled={(enabled) => setPref("handshake", enabled)} paused={phase === "paused"} />
              <MovesCard pairs={pairs} plies={plies} />
            </div>
          )}
          {phase === "over" && <GameOverPanel start={game.start} moves={game.moves} plies={plies} />}
        </main>

        {live && (
          <footer className="cc-record__footer cc-row">
            <button type="button" className="cc-btn cc-btn--quiet"
              onClick={() => (plies > 0 ? setConfirm("discard") : discardGame())}>
              <i className="bi bi-trash3" aria-hidden="true" />Discard game
            </button>
            <div className="cc-actions">
              <button type="button" className="cc-btn" onClick={takeBack} disabled={plies === 0}>
                <i className="bi bi-arrow-counterclockwise" aria-hidden="true" />Take back move<Kbd>⌫</Kbd>
              </button>
              <button type="button" className="cc-btn" onClick={togglePause}>
                <i className={`bi ${phase === "paused" ? "bi-play-fill" : "bi-pause-fill"}`} aria-hidden="true" />
                {phase === "paused" ? "Resume" : "Pause"}<Kbd>Space</Kbd>
              </button>
              <button type="button" className="cc-btn cc-btn--primary cc-btn--xl" style={{ minWidth: 220 }} onClick={endGame}>
                <i className="bi bi-flag" aria-hidden="true" />End game<Kbd>E</Kbd>
              </button>
            </div>
          </footer>
        )}
        {phase === "over" && (
          <footer className="cc-record__footer cc-row">
            <span className="d-flex align-items-center gap-2" style={{ color: "var(--cc-text-2)", fontSize: 15 }}>
              <HandshakeIcon />Shake hands again to start a new game with the same setup
            </span>
            <button type="button" className="cc-btn" onClick={newGame}>New game</button>
          </footer>
        )}
      </div>

      <Banner banner={banner} />
      {toast !== null && <MoveToast label={toast.label} words={toast.words} />}
      {confirm === "discard" && (
        <ConfirmDialog title="Discard this game?"
          body={`The ${plies} recorded ${plies === 1 ? "move" : "moves"} will be deleted. This can't be undone. To keep them, choose End game instead.`}
          confirmLabel="Discard" cancelLabel="Keep game" onConfirm={discardGame} onCancel={() => setConfirm(null)} />
      )}
      {confirm === "leave" && (
        <ConfirmDialog title="Leave and discard this game?"
          body={`Going home deletes the ${plies} recorded ${plies === 1 ? "move" : "moves"}. To keep them, choose End game and copy the PGN first.`}
          confirmLabel="Leave" cancelLabel="Stay" onConfirm={() => void navigate("/")} onCancel={() => setConfirm(null)} />
      )}
    </div>
  );
};

export default RecordPage;
