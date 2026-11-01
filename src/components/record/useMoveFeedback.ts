// CS3483 addition: feedback each time ChessCam records a move.
// ChessCam only accepts moves that are legal in the current position, so every
// recorded move is a legal one. Feedback is kept modest (a minor action): a short click
// (higher for White, lower for Black), optionally the move spoken aloud, and a toast
// that the page shows for two seconds.
import { useEffect, useRef, useState } from "react";
import { makeBoard, useGame } from "../../slices/gameSlice";
import { playCue } from "../../feedback/sound";
import { speak } from "../../feedback/speech";
import { describeMove } from "../../feedback/describeMove";

// Number of half-moves in ChessCam's move text, e.g. "1. e4 e5 2. Nf3" -> 3
export const countPlies = (moves: string): number =>
  moves.split(/\s+/).filter((token) => token !== "" && !token.endsWith(".")).length;

export interface RecordedMove {
  label: string, // "10… Re8"
  words: string, // "Rook f8 to e8"
  id: number
}

export const useMoveFeedback = ({ playing, moveSound, speakMoves }: {
  playing: boolean,
  moveSound: boolean,
  speakMoves: boolean
}): RecordedMove | null => {
  const game = useGame();
  const { moves, lastMove, fen } = game;
  const previousRef = useRef({ plies: countPlies(moves), lastMove });
  const [recorded, setRecorded] = useState<RecordedMove | null>(null);

  useEffect(() => {
    const plies = countPlies(moves);
    const previous = previousRef.current;
    previousRef.current = { plies, lastMove };

    // More moves = a move was recorded. Same count but a different last move = ChessCam
    // corrected its guess for the last move. Fewer moves = take back or reset: stay silent.
    const newMove = (plies > previous.plies)
      || (plies > 0 && plies === previous.plies && lastMove !== previous.lastMove);
    if (!playing || !newMove) {
      return;
    }

    const history = makeBoard(game).history;
    const san = history[history.length - 1]?.san ?? "";
    // The FEN's second field is the side to move AFTER the move, so "b" means White just moved.
    const whiteMoved = fen.split(" ")[1] === "b";
    const moveNumber = Math.ceil(plies / 2);
    const words = describeMove(san, lastMove);

    if (moveSound) {
      playCue(whiteMoved ? "moveWhite" : "moveBlack");
    }
    if (speakMoves) {
      speak(words, moveSound ? 150 : 0);
    }
    setRecorded({ label: `${moveNumber}${whiteMoved ? "." : "…"} ${san}`, words, id: Date.now() });
  }, [game, moves, lastMove, fen, playing, moveSound, speakMoves]);

  return recorded;
};
