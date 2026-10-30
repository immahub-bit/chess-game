import { Chess, Move, Square } from 'chess.js';

export type EngineLevel = 'beginner' | 'casual' | 'intermediate' | 'advanced' | 'master' | 'grandmaster';

export interface EngineProfile {
  id: EngineLevel;
  name: string;
  title: string;
  rating: number;
  avatar: string;
  depth: number;
  quiescence: boolean;
  useBook: boolean;
  randomnessChance: number;
  description: string;
}

export const ENGINE_PROFILES: Record<EngineLevel, EngineProfile> = {
  beginner: {
    id: 'beginner',
    name: 'Trainee Leo',
    title: 'Beginner',
    rating: 400,
    avatar: '🌱',
    depth: 1,
    quiescence: false,
    useBook: false,
    randomnessChance: 0.45,
    description: 'Learning the game. Leaves pieces undefended and misses basic threats.',
  },
  casual: {
    id: 'casual',
    name: 'Casual Chloe',
    title: 'Casual Player',
    rating: 800,
    avatar: '☕',
    depth: 2,
    quiescence: false,
    useBook: true,
    randomnessChance: 0.2,
    description: 'Plays basic moves, captures free pieces, but struggles against tactics.',
  },
  intermediate: {
    id: 'intermediate',
    name: 'Captain Elena',
    title: 'Club Player',
    rating: 1200,
    avatar: '⚔️',
    depth: 2,
    quiescence: true,
    useBook: true,
    randomnessChance: 0.05,
    description: 'Controls the center, develops pieces early, and castles safely.',
  },
  advanced: {
    id: 'advanced',
    name: 'Master Viktor',
    title: 'Tactician',
    rating: 1600,
    avatar: '🛡️',
    depth: 3,
    quiescence: true,
    useBook: true,
    randomnessChance: 0.0,
    description: 'Punishes tactical oversights, creates pins and forks, active pawn structure.',
  },
  master: {
    id: 'master',
    name: 'Candidate Master Maya',
    title: 'Candidate Master',
    rating: 2000,
    avatar: '⚡',
    depth: 4,
    quiescence: true,
    useBook: true,
    randomnessChance: 0.0,
    description: 'Deep calculations, strategic prophylaxis, and strong endgame technique.',
  },
  grandmaster: {
    id: 'grandmaster',
    name: 'Grandmaster Deep-Bot',
    title: 'Grandmaster AI',
    rating: 2450,
    avatar: '👑',
    depth: 4,
    quiescence: true,
    useBook: true,
    randomnessChance: 0.0,
    description: 'Uncompromising tactical precision with quiescence horizon search.',
  },
};

const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 325,
  b: 335,
  r: 500,
  q: 975,
  k: 20000,
};

// Opening Book moves repository (UCI moves indexed by initial sequences)
const OPENING_BOOK: Record<string, string[]> = {
  '': ['e2e4', 'd2d4', 'c2c4', 'g1f3'],
  // 1. e4
  'e2e4': ['e7e5', 'c7c5', 'e7e6', 'c7c6'],
  // 1. e4 e5
  'e2e4 e7e5': ['g1f3', 'f1c4', 'f2f4'],
  // 1. e4 e5 2. Nf3
  'e2e4 e7e5 g1f3': ['b8c6', 'g8f6', 'd7d6'],
  // 1. e4 e5 2. Nf3 Nc6
  'e2e4 e7e5 g1f3 b8c6': ['f1c4', 'f1b5', 'd2d4'],
  // 1. e4 c5 (Sicilian)
  'e2e4 c7c5': ['g1f3', 'c2c3', 'b1c3'],
  'e2e4 c7c5 g1f3': ['d7d6', 'e7e6', 'b8c6'],
  // 1. d4
  'd2d4': ['d7d5', 'g8f6', 'e7e6'],
  'd2d4 d7d5': ['c2c4', 'g1f3', 'e2e3'],
  'd2d4 d7d5 c2c4': ['e7e6', 'c7c6', 'd5c4'],
  // 1. d4 Nf6
  'd2d4 g8f6': ['c2c4', 'g1f3'],
  'd2d4 g8f6 c2c4': ['e7e6', 'g7g6', 'c7c5'],
};

// Positional Piece-Square Tables (White perspective)
const PAWN_PST = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0,
];

const KNIGHT_PST = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 25, 25, 15,  0,-30,
  -30,  5, 15, 25, 25, 15,  5,-30,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];

const BISHOP_PST = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  0, 10, 15, 15, 10,  0,-10,
  -10,  5,  5, 15, 15,  5,  5,-10,
  -10, 10,  5, 10, 10,  5, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
];

const ROOK_PST = [
   0,  0,  0,  0,  0,  0,  0,  0,
   5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
   0,  0,  0,  5,  5,  0,  0,  0,
];

const QUEEN_PST = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
   -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20,
];

const KING_MIDGAME_PST = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20,
];

function getSquareIndex(square: Square, isWhite: boolean): number {
  const file = square.charCodeAt(0) - 97;
  const rank = 8 - parseInt(square[1], 10);
  const idx = rank * 8 + file;
  return isWhite ? idx : 63 - idx;
}

function getPiecePstBonus(pieceType: string, square: Square, isWhite: boolean): number {
  const idx = getSquareIndex(square, isWhite);
  switch (pieceType) {
    case 'p': return PAWN_PST[idx] || 0;
    case 'n': return KNIGHT_PST[idx] || 0;
    case 'b': return BISHOP_PST[idx] || 0;
    case 'r': return ROOK_PST[idx] || 0;
    case 'q': return QUEEN_PST[idx] || 0;
    case 'k': return KING_MIDGAME_PST[idx] || 0;
    default: return 0;
  }
}

/**
 * Returns static board evaluation score from White's perspective in centipawns (+ is White advantage)
 */
export function evaluateBoard(chess: Chess): number {
  if (chess.isGameOver()) {
    if (chess.isCheckmate()) {
      return chess.turn() === 'w' ? -30000 : 30000;
    }
    return 0; // Draw
  }

  let score = 0;
  const board = chess.board();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const squareName = `${String.fromCharCode(97 + c)}${8 - r}` as Square;
      const baseVal = PIECE_VALUES[piece.type] || 0;
      const pstVal = getPiecePstBonus(piece.type, squareName, piece.color === 'w');
      const totalVal = baseVal + pstVal;

      if (piece.color === 'w') {
        score += totalVal;
      } else {
        score -= totalVal;
      }
    }
  }

  // Bishop pair bonus
  let whiteBishops = 0;
  let blackBishops = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece?.type === 'b') {
        if (piece.color === 'w') whiteBishops++;
        else blackBishops++;
      }
    }
  }
  if (whiteBishops >= 2) score += 40;
  if (blackBishops >= 2) score -= 40;

  // Mobility bonus
  const activeColor = chess.turn();
  const currentLegalMoves = chess.moves().length;
  if (activeColor === 'w') score += currentLegalMoves * 3;
  else score -= currentLegalMoves * 3;

  return score;
}

function scoreMoveOrder(move: Move): number {
  let score = 0;
  if (move.captured) {
    const victimVal = PIECE_VALUES[move.captured] || 0;
    const attackerVal = PIECE_VALUES[move.piece] || 0;
    score += victimVal * 10 - attackerVal;
  }
  if (move.promotion) {
    score += 800;
  }
  if (move.san.includes('+')) {
    score += 60;
  }
  return score;
}

/**
 * Quiescence search: resolves all tactical capture sequences to avoid horizon blunders
 */
function quiescence(chess: Chess, alpha: number, beta: number, isMaximizing: boolean, depth = 0): number {
  const standPat = evaluateBoard(chess);
  if (depth >= 3 || chess.isGameOver()) return standPat;

  if (isMaximizing) {
    if (standPat >= beta) return beta;
    if (alpha < standPat) alpha = standPat;

    const captureMoves = chess.moves({ verbose: true }).filter((m) => m.captured);
    captureMoves.sort((a, b) => scoreMoveOrder(b) - scoreMoveOrder(a));

    for (const move of captureMoves) {
      chess.move(move);
      const score = quiescence(chess, alpha, beta, false, depth + 1);
      chess.undo();

      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }
    return alpha;
  } else {
    if (standPat <= alpha) return alpha;
    if (beta > standPat) beta = standPat;

    const captureMoves = chess.moves({ verbose: true }).filter((m) => m.captured);
    captureMoves.sort((a, b) => scoreMoveOrder(b) - scoreMoveOrder(a));

    for (const move of captureMoves) {
      chess.move(move);
      const score = quiescence(chess, alpha, beta, true, depth + 1);
      chess.undo();

      if (score <= alpha) return alpha;
      if (score < beta) beta = score;
    }
    return beta;
  }
}

/**
 * Minimax with Alpha-Beta pruning
 */
function minimax(
  chess: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  useQuiescence: boolean
): { score: number; bestMove?: Move } {
  if (depth === 0) {
    const score = useQuiescence ? quiescence(chess, alpha, beta, isMaximizing) : evaluateBoard(chess);
    return { score };
  }
  if (chess.isGameOver()) {
    return { score: evaluateBoard(chess) };
  }

  const moves = chess.moves({ verbose: true });
  moves.sort((a, b) => scoreMoveOrder(b) - scoreMoveOrder(a));

  let bestMove: Move = moves[0];

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      chess.move(move);
      const evaluation = minimax(chess, depth - 1, alpha, beta, false, useQuiescence).score;
      chess.undo();

      if (evaluation > maxEval) {
        maxEval = evaluation;
        bestMove = move;
      }
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) break;
    }
    return { score: maxEval, bestMove };
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      chess.move(move);
      const evaluation = minimax(chess, depth - 1, alpha, beta, true, useQuiescence).score;
      chess.undo();

      if (evaluation < minEval) {
        minEval = evaluation;
        bestMove = move;
      }
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) break;
    }
    return { score: minEval, bestMove };
  }
}

/**
 * Search opening book for grandmaster repertoire match
 */
function getOpeningBookMove(chess: Chess): Move | null {
  const historyUci = chess.history({ verbose: true }).map((m) => `${m.from}${m.to}`).join(' ');
  const bookCandidates = OPENING_BOOK[historyUci];
  if (!bookCandidates || bookCandidates.length === 0) return null;

  const chosenUci = bookCandidates[Math.floor(Math.random() * bookCandidates.length)];
  const from = chosenUci.slice(0, 2) as Square;
  const to = chosenUci.slice(2, 4) as Square;

  const legalMoves = chess.moves({ verbose: true });
  return legalMoves.find((m) => m.from === from && m.to === to) || null;
}

/**
 * Compute the Engine move according to difficulty level
 */
export function getBotMove(chess: Chess, level: EngineLevel): Move | null {
  const legalMoves = chess.moves({ verbose: true });
  if (legalMoves.length === 0) return null;

  const profile = ENGINE_PROFILES[level] || ENGINE_PROFILES.intermediate;

  // Check opening book first if enabled
  if (profile.useBook && chess.history().length < 8) {
    const bookMove = getOpeningBookMove(chess);
    if (bookMove) return bookMove;
  }

  // Beginner/Casual randomness injection
  if (profile.randomnessChance > 0 && Math.random() < profile.randomnessChance) {
    return legalMoves[Math.floor(Math.random() * legalMoves.length)];
  }

  const isMaximizing = chess.turn() === 'w';
  const result = minimax(
    chess,
    profile.depth,
    -Infinity,
    Infinity,
    isMaximizing,
    profile.quiescence
  );

  return result.bestMove || legalMoves[0];
}

/**
 * Tactical coach hint & explanation
 */
export function getTacticalHint(chess: Chess): { move: Move; explanation: string } | null {
  const legalMoves = chess.moves({ verbose: true });
  if (legalMoves.length === 0) return null;

  const isMaximizing = chess.turn() === 'w';
  const result = minimax(chess, 3, -Infinity, Infinity, isMaximizing, true);
  const move = result.bestMove || legalMoves[0];

  let explanation = `Consider ${move.san}. `;
  if (move.captured) {
    explanation += `Captures the opponent's ${move.captured.toUpperCase()} on ${move.to}, securing a material advantage.`;
  } else if (move.san.includes('+')) {
    explanation += `Delivers a direct check to the enemy king, disrupting defensive coordination.`;
  } else if (move.san.includes('O-O')) {
    explanation += `Safely castles the king into safety and connects your rooks into active central files.`;
  } else if (move.piece === 'p' && (move.to[1] === '4' || move.to[1] === '5')) {
    explanation += `Takes vital central real estate and controls adjoining outpost squares.`;
  } else if (move.piece === 'n' || move.piece === 'b') {
    explanation += `Develops an active minor piece to control open lines and center squares.`;
  } else {
    explanation += `Improves your piece placement and reinforces defensive structure.`;
  }

  return { move, explanation };
}

/**
 * Returns deep engine analysis info including score, best line, and depth
 */
export function getEngineAnalysis(chess: Chess): {
  scoreCentipawns: number;
  bestMove: Move | null;
  depth: number;
} {
  const isMaximizing = chess.turn() === 'w';
  const result = minimax(chess, 3, -Infinity, Infinity, isMaximizing, true);
  return {
    scoreCentipawns: result.score,
    bestMove: result.bestMove || null,
    depth: 3,
  };
}
