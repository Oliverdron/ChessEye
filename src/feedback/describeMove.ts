// CS3483 addition: turn a move into words for the screen and for speech,
// e.g. ("Re8", "f8e8") -> "Rook f8 to e8".

const PIECE_NAMES: Record<string, string> = {
  K: "King",
  Q: "Queen",
  R: "Rook",
  B: "Bishop",
  N: "Knight"
};

export const describeMove = (san: string, uci: string): string => {
  let suffix = "";
  if (san.includes("#")) {
    suffix = ", checkmate";
  } else if (san.includes("+")) {
    suffix = ", check";
  }

  if (san.startsWith("O-O-O")) {
    return `Castles queenside${suffix}`;
  }
  if (san.startsWith("O-O")) {
    return `Castles kingside${suffix}`;
  }

  const piece = PIECE_NAMES[san[0]] ?? "Pawn";
  const action = san.includes("x") ? "takes" : "to";
  let text = `${piece} ${uci.slice(0, 2)} ${action} ${uci.slice(2, 4)}`;

  const promotion = /=([QRBN])/.exec(san);
  if (promotion !== null) {
    text += `, promotes to ${PIECE_NAMES[promotion[1]].toLowerCase()}`;
  }
  return text + suffix;
};
