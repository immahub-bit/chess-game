import { Chess, Move } from 'chess.js';
import { MoveLogItem } from '../types/chess';

const PIECE_VALS: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

export function getCapturedPiecesAndAdvantage(chess: Chess): {
  whiteCaptured: string[]; // Pieces captured BY white (black pieces)
  blackCaptured: string[]; // Pieces captured BY black (white pieces)
  whiteAdvantage: number;
  blackAdvantage: number;
} {
  const initialCounts: Record<string, { w: number; b: number }> = {
    p: { w: 8, b: 8 },
    n: { w: 2, b: 2 },
    b: { w: 2, b: 2 },
    r: { w: 2, b: 2 },
    q: { w: 1, b: 1 },
  };

  const currentCounts: Record<string, { w: number; b: number }> = {
    p: { w: 0, b: 0 },
    n: { w: 0, b: 0 },
    b: { w: 0, b: 0 },
    r: { w: 0, b: 0 },
    q: { w: 0, b: 0 },
  };

  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.type !== 'k') {
        currentCounts[piece.type][piece.color]++;
      }
    }
  }

  const whiteCaptured: string[] = []; // Black pieces that were lost
  const blackCaptured: string[] = []; // White pieces that were lost

  (['p', 'n', 'b', 'r', 'q'] as const).forEach((type) => {
    // Missing black pieces = captured by white
    const missingBlack = Math.max(0, initialCounts[type].b - currentCounts[type].b);
    for (let i = 0; i < missingBlack; i++) {
      whiteCaptured.push(type);
    }
    // Missing white pieces = captured by black
    const missingWhite = Math.max(0, initialCounts[type].w - currentCounts[type].w);
    for (let i = 0; i < missingWhite; i++) {
      blackCaptured.push(type);
    }
  });

  // Calculate material difference
  const whiteMaterial = Object.entries(currentCounts).reduce(
    (acc, [type, counts]) => acc + counts.w * (PIECE_VALS[type] || 0),
    0
  );
  const blackMaterial = Object.entries(currentCounts).reduce(
    (acc, [type, counts]) => acc + counts.b * (PIECE_VALS[type] || 0),
    0
  );

  const diff = whiteMaterial - blackMaterial;

  return {
    whiteCaptured,
    blackCaptured,
    whiteAdvantage: diff > 0 ? diff : 0,
    blackAdvantage: diff < 0 ? Math.abs(diff) : 0,
  };
}

export function buildMoveLog(historyMoves: Move[]): MoveLogItem[] {
  const items: MoveLogItem[] = [];

  for (let i = 0; i < historyMoves.length; i += 2) {
    const moveNum = Math.floor(i / 2) + 1;
    const whiteMove = historyMoves[i];
    const blackMove = historyMoves[i + 1];

    items.push({
      moveNumber: moveNum,
      white: whiteMove
        ? {
            san: whiteMove.san,
            from: whiteMove.from,
            to: whiteMove.to,
            fen: whiteMove.after,
            captured: whiteMove.captured,
          }
        : undefined,
      black: blackMove
        ? {
            san: blackMove.san,
            from: blackMove.from,
            to: blackMove.to,
            fen: blackMove.after,
            captured: blackMove.captured,
          }
        : undefined,
    });
  }

  return items;
}
