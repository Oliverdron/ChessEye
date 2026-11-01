// CS3483 addition: PGN export for the Game over screen.
import { START_FEN } from "../../utils/constants";

export type GameResult = "1-0" | "1/2-1/2" | "0-1" | "*";

const formatDate = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
};

// Quotes and backslashes would break a PGN tag, so drop them.
const tagValue = (value: string): string => value.replace(/["\\]/g, "").trim();

export const buildPgn = ({ start, moves, result, white, black, date }: {
  start: string,
  moves: string,
  result: GameResult,
  white: string,
  black: string,
  date: Date
}): string => {
  const tags: [string, string][] = [
    ["Event", "Casual game"],
    ["Site", "ChessCam"],
    ["Date", formatDate(date)],
    ["White", tagValue(white) || "?"],
    ["Black", tagValue(black) || "?"],
    ["Result", result]
  ];
  if (start !== START_FEN) {
    tags.push(["SetUp", "1"], ["FEN", start]);
  }
  const header = tags.map(([name, value]) => `[${name} "${value}"]`).join("\n");
  const body = moves === "" ? result : `${moves} ${result}`;
  return `${header}\n\n${body}\n`;
};

// Lichess opens /analysis/pgn/<moves> (spaces written as "_") straight in its analysis board.
// Only the moves go in the link, never the player names. A game that started from a custom
// position can't be opened this way, so those return null and use the import page instead.
export const lichessAnalysisUrl = (start: string, moves: string): string | null => {
  if (start !== START_FEN) {
    return null;
  }
  return `https://lichess.org/analysis/pgn/${encodeURIComponent(moves).replace(/%20/g, "_")}`;
};

export const LICHESS_IMPORT_URL = "https://lichess.org/paste";

export const downloadPgn = (pgn: string, date: Date) => {
  const url = URL.createObjectURL(new Blob([pgn], { type: "application/x-chess-pgn" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `chesscam-${formatDate(date).replace(/\./g, "-")}.pgn`;
  link.click();
  URL.revokeObjectURL(url);
};
