// CS3483 addition: Game over screen: optional details (form fill-in) and saving the PGN.
import { useId, useState } from "react";
import { buildPgn, downloadPgn, LICHESS_IMPORT_URL, lichessAnalysisUrl } from "./pgn";
import type { GameResult } from "./pgn";

const RESULTS: { id: GameResult, label: string }[] = [
  { id: "1-0", label: "White won" },
  { id: "1/2-1/2", label: "Draw" },
  { id: "0-1", label: "Black won" },
  { id: "*", label: "Not finished" }
];

const GameOverPanel = ({ start, moves, plies }: { start: string, moves: string, plies: number }) => {
  const [result, setResult] = useState<GameResult>("*");
  const [white, setWhite] = useState("");
  const [black, setBlack] = useState("");
  const [status, setStatus] = useState("");
  const [date] = useState(() => new Date());
  const whiteId = useId();
  const blackId = useId();

  const pgn = buildPgn({ start, moves, result, white, black, date });
  const analysisUrl = lichessAnalysisUrl(start, moves);
  const fullMoves = Math.ceil(plies / 2);

  const copy = (then?: string) => {
    navigator.clipboard.writeText(pgn)
      .then(() => setStatus(then ?? "PGN copied to the clipboard. Paste it into Lichess or any chess app."))
      .catch(() => setStatus("Couldn't copy automatically. Select the PGN above and copy it."));
  };

  return (
    <section className="cc-card cc-panel cc-area-panel" aria-labelledby="cc-over-title">
      <div className="d-flex flex-column gap-1">
        <h1 id="cc-over-title" style={{ fontSize: 30 }}>
          Game recorded: {fullMoves} {fullMoves === 1 ? "move" : "moves"}
        </h1>
        <p style={{ color: "var(--cc-text-2)" }}>Add the details below if you like, then save the game.</p>
      </div>

      <fieldset>
        <legend>Result<span className="cc-optional">Optional</span></legend>
        <div className="cc-results">
          {RESULTS.map((r) => (
            <label key={r.id} className={`cc-result${result === r.id ? " cc-result--checked" : ""}`}>
              <input type="radio" name="cc-result" checked={result === r.id}
                onChange={() => { setResult(r.id); setStatus(""); }} />
              {r.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Players<span className="cc-optional">Optional</span></legend>
        <div className="cc-players">
          <div className="cc-field">
            <label htmlFor={whiteId}>White</label>
            <input id={whiteId} className="cc-input" type="text" placeholder="Name" value={white}
              autoComplete="off" onChange={(e) => { setWhite(e.target.value); setStatus(""); }} />
          </div>
          <div className="cc-field">
            <label htmlFor={blackId}>Black</label>
            <input id={blackId} className="cc-input" type="text" placeholder="Name" value={black}
              autoComplete="off" onChange={(e) => { setBlack(e.target.value); setStatus(""); }} />
          </div>
        </div>
      </fieldset>

      <div className="d-flex flex-column gap-2">
        <h2 style={{ fontSize: 15, fontWeight: 600 }}>PGN</h2>
        <pre className="cc-pgn">{pgn}</pre>
      </div>

      <div className="cc-actions">
        <button type="button" className="cc-btn cc-btn--primary cc-btn--xl" onClick={() => copy()}>
          <i className="bi bi-clipboard" aria-hidden="true" />Copy PGN
        </button>
        {analysisUrl !== null ? (
          <a className="cc-btn" href={analysisUrl} target="_blank" rel="noreferrer">
            Open in Lichess analysis<span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        ) : (
          <a className="cc-btn" href={LICHESS_IMPORT_URL} target="_blank" rel="noreferrer"
            onClick={() => copy("PGN copied. Paste it into the Lichess import page that just opened.")}>
            Import into Lichess<span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        )}
        <button type="button" className="cc-btn"
          onClick={() => { downloadPgn(pgn, date); setStatus("PGN file downloaded."); }}>
          <i className="bi bi-download" aria-hidden="true" />Download .pgn
        </button>
      </div>
      <p className="cc-status-ok" role="status" aria-live="polite">{status}</p>
    </section>
  );
};

export default GameOverPanel;
