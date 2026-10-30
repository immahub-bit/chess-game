import React, { useState } from 'react';
import { Chess, Move, PieceSymbol, Square } from 'chess.js';
import { BoardThemeId, PlayerColor } from '../types/chess';
import { BOARD_THEMES } from '../utils/themePresets';
import { ChessPiece } from './ChessPiece';

interface ChessBoardProps {
  chess: Chess;
  orientation: PlayerColor; // 'w' or 'b'
  themeId: BoardThemeId;
  showLegalMoves: boolean;
  showCoordinates: boolean;
  lastMove: { from: Square; to: Square } | null;
  hintSquare?: Square | null;
  onMove: (from: Square, to: Square, promotion?: PieceSymbol) => boolean;
  isInteractive?: boolean;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  chess,
  orientation,
  themeId,
  showLegalMoves,
  showCoordinates,
  lastMove,
  hintSquare,
  onMove,
  isInteractive = true,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);

  const theme = BOARD_THEMES[themeId] || BOARD_THEMES.wood;
  const isWhiteView = orientation === 'w';

  // Ranks and Files based on orientation
  const ranks = isWhiteView ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  const files = isWhiteView ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];

  // Calculate legal destination moves for the selected square
  const legalMovesForSelected: Move[] = selectedSquare
    ? chess.moves({ square: selectedSquare, verbose: true })
    : [];
  const legalTargetSquares = new Set(legalMovesForSelected.map((m) => m.to));

  // Find King in check position
  let checkedKingSquare: Square | null = null;
  if (chess.inCheck()) {
    const turn = chess.turn();
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'k' && piece.color === turn) {
          checkedKingSquare = `${String.fromCharCode(97 + c)}${8 - r}` as Square;
          break;
        }
      }
    }
  }

  const handleSquareClick = (square: Square) => {
    if (!isInteractive) return;

    // If a square is already selected and clicked again, deselect
    if (selectedSquare === square) {
      setSelectedSquare(null);
      return;
    }

    const clickedPiece = chess.get(square);

    // If a piece is selected and we click a legal target square
    if (selectedSquare && legalTargetSquares.has(square)) {
      const movingPiece = chess.get(selectedSquare);
      const isPawnPromotion =
        movingPiece?.type === 'p' &&
        ((movingPiece.color === 'w' && square[1] === '8') ||
          (movingPiece.color === 'b' && square[1] === '1'));

      if (isPawnPromotion) {
        setPendingPromotion({ from: selectedSquare, to: square });
        return;
      }

      onMove(selectedSquare, square);
      setSelectedSquare(null);
      return;
    }

    // Otherwise select the piece if it belongs to current player's turn
    if (clickedPiece && clickedPiece.color === chess.turn()) {
      setSelectedSquare(square);
    } else {
      setSelectedSquare(null);
    }
  };

  const handlePromotionChoice = (pieceType: PieceSymbol) => {
    if (pendingPromotion) {
      onMove(pendingPromotion.from, pendingPromotion.to, pieceType);
      setPendingPromotion(null);
      setSelectedSquare(null);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, square: Square) => {
    if (!isInteractive) return;
    const piece = chess.get(square);
    if (!piece || piece.color !== chess.turn()) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', square);
    setSelectedSquare(square);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetSquare: Square) => {
    e.preventDefault();
    if (!isInteractive) return;
    const fromSquare = e.dataTransfer.getData('text/plain') as Square;
    if (!fromSquare || fromSquare === targetSquare) return;

    const movingPiece = chess.get(fromSquare);
    const validMoves = chess.moves({ square: fromSquare, verbose: true });
    const isValid = validMoves.some((m) => m.to === targetSquare);

    if (isValid) {
      const isPawnPromotion =
        movingPiece?.type === 'p' &&
        ((movingPiece.color === 'w' && targetSquare[1] === '8') ||
          (movingPiece.color === 'b' && targetSquare[1] === '1'));

      if (isPawnPromotion) {
        setPendingPromotion({ from: fromSquare, to: targetSquare });
      } else {
        onMove(fromSquare, targetSquare);
        setSelectedSquare(null);
      }
    }
  };

  return (
    <div className="relative w-full aspect-square max-w-[620px] mx-auto select-none rounded-xl overflow-hidden shadow-2xl border-4 border-slate-800/80 dark:border-slate-700/80 bg-slate-900">
      {/* 8x8 Board Grid */}
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
        {ranks.map((rank, rankIdx) =>
          files.map((file, fileIdx) => {
            const square = `${file}${rank}` as Square;
            const piece = chess.get(square);
            const isDarkSquare = (rankIdx + fileIdx) % 2 === 1;

            const isSelected = selectedSquare === square;
            const isLegalTarget = legalTargetSquares.has(square);
            const isLastMoveSquare = lastMove && (lastMove.from === square || lastMove.to === square);
            const isCheckedKing = checkedKingSquare === square;
            const isHint = hintSquare === square;

            // Background color logic
            const baseBgColor = isDarkSquare ? theme.darkSquare : theme.lightSquare;

            return (
              <div
                key={square}
                onClick={() => handleSquareClick(square)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, square)}
                style={{ backgroundColor: baseBgColor }}
                className={`relative flex items-center justify-center cursor-pointer transition-colors duration-100 ${
                  isInteractive ? 'hover:brightness-95 active:brightness-90' : ''
                }`}
              >
                {/* Last move highlight */}
                {isLastMoveSquare && (
                  <div
                    className="absolute inset-0 pointer-events-none transition-opacity"
                    style={{ backgroundColor: theme.highlightMove }}
                  />
                )}

                {/* Selected square highlight */}
                {isSelected && (
                  <div
                    className="absolute inset-0 pointer-events-none ring-2 ring-inset ring-amber-400"
                    style={{ backgroundColor: theme.highlightSelected }}
                  />
                )}

                {/* Checked king warning highlight */}
                {isCheckedKing && (
                  <div className="absolute inset-0 pointer-events-none bg-radial from-rose-500/80 via-rose-600/40 to-transparent animate-pulse" />
                )}

                {/* Coach Hint highlight */}
                {isHint && (
                  <div className="absolute inset-0 pointer-events-none ring-4 ring-inset ring-emerald-400/80 bg-emerald-400/20 animate-pulse" />
                )}

                {/* Coordinates */}
                {showCoordinates && (
                  <>
                    {fileIdx === 0 && (
                      <span
                        className={`absolute top-0.5 left-1 text-[10px] md:text-xs font-semibold leading-none pointer-events-none font-mono-numbers ${
                          isDarkSquare ? 'text-white/60' : 'text-slate-800/60'
                        }`}
                      >
                        {rank}
                      </span>
                    )}
                    {rankIdx === 7 && (
                      <span
                        className={`absolute bottom-0.5 right-1 text-[10px] md:text-xs font-semibold leading-none pointer-events-none ${
                          isDarkSquare ? 'text-white/60' : 'text-slate-800/60'
                        }`}
                      >
                        {file}
                      </span>
                    )}
                  </>
                )}

                {/* Chess piece */}
                {piece && (
                  <div
                    draggable={isInteractive && piece.color === chess.turn()}
                    onDragStart={(e) => handleDragStart(e, square)}
                    className="w-[82%] h-[82%] z-10 flex items-center justify-center cursor-grab active:cursor-grabbing"
                  >
                    <ChessPiece type={piece.type} color={piece.color} />
                  </div>
                )}

                {/* Legal move indicators */}
                {showLegalMoves && isLegalTarget && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    {piece ? (
                      // Capture ring
                      <div className="w-[84%] h-[84%] rounded-full border-4 border-slate-900/35 dark:border-white/40" />
                    ) : (
                      // Dot for empty destination square
                      <div className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-slate-900/30 dark:bg-black/35 shadow-sm" />
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pawn Promotion Dialog Overlay */}
      {pendingPromotion && (
        <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xs w-full text-center animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
              Promote Your Pawn
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {(['q', 'r', 'b', 'n'] as PieceSymbol[]).map((pieceType) => (
                <button
                  key={pieceType}
                  onClick={() => handlePromotionChoice(pieceType)}
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-amber-100 dark:hover:bg-amber-950/40 border border-slate-200 dark:border-slate-700 transition-all hover:scale-105 active:scale-95"
                >
                  <div className="w-10 h-10">
                    <ChessPiece type={pieceType} color={chess.turn()} />
                  </div>
                  <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 mt-1 uppercase">
                    {pieceType === 'q' ? 'Queen' : pieceType === 'r' ? 'Rook' : pieceType === 'b' ? 'Bishop' : 'Knight'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
