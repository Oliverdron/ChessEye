// CS3483 addition: play a short click each time ChessCam records a move.
// ChessCam only accepts moves that are legal in the current position, so every
// recorded move is a legal one.
import { useEffect, useRef } from "react";
import { useGame } from "../../slices/gameSlice";
import { playCue } from "../../feedback/sound";

// Number of half-moves in ChessCam's move text, e.g. "1. e4 e5 2. Nf3" -> 3
export const countPlies = (moves: string): number =>
  moves.split(/\s+/).filter((token) => token !== "" && !token.endsWith(".")).length;

export const useMoveSound = (playing: boolean) => {
  const { moves, lastMove, fen } = useGame();
  const previousRef = useRef({ plies: countPlies(moves), lastMove });

  useEffect(() => {
    const plies = countPlies(moves);
    const previous = previousRef.current;
    previousRef.current = { plies, lastMove };

    // More moves = a move was recorded. Same count but a different last move = ChessCam
    // corrected its guess for the last move. Fewer moves = reset (Stop / new game): stay silent.
    const newMove = (plies > previous.plies)
      || (plies > 0 && plies === previous.plies && lastMove !== previous.lastMove);
    if (!playing || !newMove) {
      return;
    }

    // The FEN's second field is the side to move AFTER the move, so "b" means White just moved.
    const whiteMoved = fen.split(" ")[1] === "b";
    playCue(whiteMoved ? "moveWhite" : "moveBlack");
  }, [moves, lastMove, fen, playing]);
};
