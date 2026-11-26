// CS3483 addition: redesigned home page. Recording (the core task) comes first and largest;
// the other modes are grouped below. Modes that need Lichess stay visible but locked, with
// the reason shown, instead of disappearing.
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useUser } from "../../slices/userSlice";
import { lichessLogin, lichessLogout } from "../../utils/lichess";

const MODES = [
  { path: "/upload", title: "Upload", text: "Read the moves from a video you already filmed.", icon: "bi-upload", login: false },
  { path: "/play", title: "Play", text: "Play a Lichess game using your physical board.", icon: "bi-play-fill", login: true },
  { path: "/broadcast", title: "Broadcast", text: "Send a live board to a Lichess broadcast.", icon: "bi-broadcast", login: true },
  { path: "/export", title: "Export", text: "Save a recorded game to a Lichess study.", icon: "bi-box-arrow-up-right", login: true }
] as const;

const STEPS = [
  { title: "Set up the camera", text: "Above the board, with all 64 squares and both players' hands in view." },
  { title: "Shake hands to start", text: "Play normally. A short click confirms each recorded move." },
  { title: "Shake hands to finish", text: "Copy the PGN or open the game on Lichess." }
];

const Logo = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
    <rect x="2" y="2" width="28" height="28" rx="6" fill="#f0dec7" />
    <path d="M8 2h8v14H2V8a6 6 0 0 1 6-6z" fill="#b5876b" />
    <path d="M16 16h14v8a6 6 0 0 1-6 6h-8z" fill="#b5876b" />
    <circle cx="16" cy="16" r="5" fill="#121416" />
    <circle cx="16" cy="16" r="2.5" fill="#f5b83d" />
  </svg>
);

const Home = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { username, token } = useUser();
  const loggedIn = token !== "";

  // "R" starts recording (shortcut shown on the button)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if ((e.key === "r" || e.key === "R") && !e.repeat && !e.metaKey && !e.ctrlKey && !e.altKey
        && !target?.closest("input, select, textarea, [contenteditable]")) {
        void navigate("/record");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);

  const onAccount = () => {
    if (loggedIn) {
      void lichessLogout(dispatch, token).then(() => void navigate("/"));
    } else {
      lichessLogin();
    }
  };

  return (
    <div className="cc">
      <div className="cc-home">
        <header className="cc-home__header">
          <div className="cc-brand"><Logo />ChessEye</div>
          <nav aria-label="Account and help" className="d-flex flex-wrap align-items-center gap-2">
            <Link to="/faq" className="d-inline-flex align-items-center px-2" style={{ minHeight: 48, fontWeight: 500 }}>
              Help &amp; FAQ
            </Link>
            <button type="button" className="cc-btn" onClick={onAccount}>
              {loggedIn ? `Log out (${username})` : "Log in with Lichess"}
            </button>
          </nav>
        </header>

        <main>
          <section className="cc-hero">
            <div className="d-flex flex-column gap-3">
              <p className="cc-eyebrow">Over-the-board recorder</p>
              <h1>Record your game on a real board</h1>
              <p className="cc-hero__lead">
                Put a phone or webcam above the board. Shake hands to start, shake hands again to
                finish. ChessEye writes down every move.
              </p>
              <div className="cc-actions" style={{ gap: 16, marginTop: 8 }}>
                <Link to="/record" className="cc-btn cc-btn--primary cc-btn--xl">
                  <i className="bi bi-record-circle" aria-hidden="true" />Record a game<kbd className="cc-kbd">R</kbd>
                </Link>
                <span className="cc-muted" style={{ fontSize: 15 }}>No login needed</span>
              </div>
            </div>

            <div className="cc-card cc-how">
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--cc-muted)" }}>How it works</h2>
              <ol>
                {STEPS.map((step, i) => (
                  <li key={step.title}>
                    <span className="cc-num" aria-hidden="true">{i + 1}</span>
                    <span className="d-flex flex-column gap-1">
                      <b style={{ fontSize: 17, fontWeight: 600 }}>{step.title}</b>
                      <span className="cc-muted" style={{ fontSize: 15 }}>{step.text}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section aria-labelledby="cc-modes-title" className="d-flex flex-column gap-3" style={{ marginTop: 72 }}>
            <div className="cc-row" style={{ alignItems: "baseline", gap: 8 }}>
              <h2 id="cc-modes-title" style={{ fontSize: 20, fontWeight: 600 }}>Other modes</h2>
              <span className="cc-muted" style={{ fontSize: 14 }}>Play, Broadcast and Export use your Lichess account</span>
            </div>
            <div className="cc-modes">
              {MODES.map((mode) => {
                const locked = mode.login && !loggedIn;
                const content = (
                  <>
                    <i className={`bi ${mode.icon}`} style={{ fontSize: 24, color: locked ? undefined : "var(--cc-info)" }}
                      aria-hidden="true" />
                    <span className="cc-mode__title">{mode.title}</span>
                    <span className="cc-mode__text" style={{ color: locked ? undefined : "var(--cc-muted)" }}>{mode.text}</span>
                    {locked && (
                      <span className="cc-mode__lock">
                        <i className="bi bi-lock" aria-hidden="true" />Log in with Lichess to use
                      </span>
                    )}
                  </>
                );
                return locked
                  ? <div key={mode.path} className="cc-mode cc-mode--locked" aria-disabled="true">{content}</div>
                  : <Link key={mode.path} to={mode.path} className="cc-mode">{content}</Link>;
              })}
            </div>
          </section>
        </main>

        <footer className="cc-home__footer cc-row">
          <nav aria-label="Footer" className="cc-links">
            <Link to="/faq">FAQ</Link>
            <a href="https://github.com/Pbatch/CameraChessWeb" target="_blank" rel="noreferrer">
              GitHub<span className="visually-hidden"> (opens in a new tab)</span>
            </a>
            <a href="/privacy.html">Privacy</a>
          </nav>
          <span>Based on ChessCam by Pbatch and contributors · AGPL-3.0</span>
        </footer>
      </div>
    </div>
  );
};

export default Home;
