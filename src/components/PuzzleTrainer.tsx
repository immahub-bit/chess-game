import React, { useState, useEffect } from 'react';
import { Chess, PieceSymbol, Square } from 'chess.js';
import { BoardThemeId, GameSettings, Puzzle } from '../types/chess';
import { CHESS_PUZZLES } from '../data/puzzles';
import { ChessBoard } from './ChessBoard';
import {
  playMoveSound,
  playCaptureSound,
  playCheckSound,
  playVictorySound,
  playTickSound,
} from '../utils/chessAudio';
import { CheckCircle2, HelpCircle, ArrowRight, RotateCcw, Lightbulb, Flame, Award } from 'lucide-react';
import confetti from 'canvas-confetti';

interface PuzzleTrainerProps {
  settings: GameSettings;
}

export const PuzzleTrainer: React.FC<PuzzleTrainerProps> = ({ settings }) => {
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [chessInstance, setChessInstance] = useState<Chess>(() => new Chess());
  const [moveStep, setMoveStep] = useState(0);
  const [status, setStatus] = useState<'solving' | 'correct' | 'failed'>('solving');
  const [streak, setStreak] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [hintSquare, setHintSquare] = useState<Square | null>(null);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);

  const currentPuzzle: Puzzle = CHESS_PUZZLES[puzzleIndex % CHESS_PUZZLES.length];

  // Initialize board whenever current puzzle changes
  useEffect(() => {
    try {
      const c = new Chess(currentPuzzle.fen);
      setChessInstance(c);
      setMoveStep(0);
      setStatus('solving');
      setShowHint(false);
      setHintSquare(null);
      setLastMove(null);
    } catch {
      // Fallback
    }
  }, [puzzleIndex, currentPuzzle.fen]);

  const handleMove = (from: Square, to: Square, promotion: PieceSymbol = 'q'): boolean => {
    if (status === 'correct') return false;

    const uciMove = `${from}${to}${promotion !== 'q' ? promotion : ''}`;
    const expectedMove = currentPuzzle.moves[moveStep];

    // Check if the move is legal in chess.js first
    try {
      const testChess = new Chess(chessInstance.fen());
      const executed = testChess.move({ from, to, promotion });
      if (!executed) return false;

      // Check if move matches expected solution (compare either UCI or from-to)
      const expectedFromTo = expectedMove.slice(0, 4);
      const isExpected = `${from}${to}` === expectedFromTo;

      if (!isExpected) {
        // Wrong tactical move
        setStatus('failed');
        playTickSound(settings.soundEnabled);
        return false;
      }

      // Valid correct step
      chessInstance.move({ from, to, promotion });
      setLastMove({ from, to });

      if (executed.captured) {
        playCaptureSound(settings.soundEnabled);
      } else if (executed.san.includes('+') || executed.san.includes('#')) {
        playCheckSound(settings.soundEnabled);
      } else {
        playMoveSound(settings.soundEnabled);
      }

      const nextStep = moveStep + 1;
      setMoveStep(nextStep);

      // Check if puzzle is fully solved
      if (nextStep >= currentPuzzle.moves.length) {
        setStatus('correct');
        setStreak((prev) => prev + 1);
        playVictorySound(settings.soundEnabled);
        confetti({
          particleCount: 60,
          spread: 50,
          origin: { y: 0.7 },
        });
        return true;
      }

      // If there is an opponent reply move in the script
      const opponentUci = currentPuzzle.moves[nextStep];
      if (opponentUci) {
        setTimeout(() => {
          const oppFrom = opponentUci.slice(0, 2) as Square;
          const oppTo = opponentUci.slice(2, 4) as Square;
          const oppProm = (opponentUci[4] as PieceSymbol) || undefined;
          const oppMove = chessInstance.move({ from: oppFrom, to: oppTo, promotion: oppProm });

          if (oppMove) {
            setLastMove({ from: oppFrom, to: oppTo });
            if (oppMove.captured) playCaptureSound(settings.soundEnabled);
            else playMoveSound(settings.soundEnabled);
            setMoveStep(nextStep + 1);
          }
        }, 400);
      }

      return true;
    } catch {
      return false;
    }
  };

  const handleNextPuzzle = () => {
    setPuzzleIndex((prev) => (prev + 1) % CHESS_PUZZLES.length);
  };

  const handleRetry = () => {
    const c = new Chess(currentPuzzle.fen);
    setChessInstance(c);
    setMoveStep(0);
    setStatus('solving');
    setLastMove(null);
    setHintSquare(null);
  };

  const handleRequestHint = () => {
    setShowHint(true);
    const expected = currentPuzzle.moves[moveStep];
    if (expected) {
      setHintSquare(expected.slice(0, 2) as Square);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start max-w-6xl mx-auto w-full">
      {/* Board Column */}
      <div className="lg:col-span-7 flex flex-col items-center">
        <div className="w-full max-w-[560px]">
          <ChessBoard
            chess={chessInstance}
            orientation={currentPuzzle.playerColor}
            themeId={settings.boardTheme}
            showLegalMoves={settings.showLegalMoves}
            showCoordinates={settings.showCoordinates}
            lastMove={lastMove}
            hintSquare={hintSquare}
            onMove={handleMove}
            isInteractive={status !== 'correct'}
          />
        </div>
      </div>

      {/* Puzzle Information & Controls Panel */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        {/* Header card with streak */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              Puzzle {puzzleIndex + 1} of {CHESS_PUZZLES.length}
            </span>
            <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
              <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
              <span>Streak: <strong className="font-mono-numbers">{streak}</strong></span>
            </div>
          </div>

          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {currentPuzzle.title}
          </h2>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
            <span>{currentPuzzle.theme}</span>
            <span aria-hidden="true">·</span>
            <span>Rating {currentPuzzle.rating}</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {currentPuzzle.playerColor === 'w' ? 'White to move' : 'Black to move'}
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
            {currentPuzzle.description}
          </p>

          {/* Status feedback box */}
          {status === 'correct' && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold">Puzzle Solved!</div>
                  <div className="text-[11px] opacity-90">+15 Tactics Rating</div>
                </div>
              </div>
              <button
                onClick={handleNextPuzzle}
                className="flex items-center gap-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shrink-0 cursor-pointer shadow-xs"
              >
                Next
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {status === 'failed' && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-150">
              <div>
                <div className="font-bold">Not the best move</div>
                <div className="text-[11px] opacity-90">There is a sharper tactical continuation.</div>
              </div>
              <button
                onClick={handleRetry}
                className="flex items-center gap-1 py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors shrink-0 cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          )}

          {/* Hint card */}
          {showHint && (
            <div className="p-3 mt-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold mb-0.5">Coach Clue:</div>
                <div>{currentPuzzle.hint}</div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleRequestHint}
              disabled={showHint || status === 'correct'}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
              Hint
            </button>
            <button
              onClick={handleRetry}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            <button
              onClick={handleNextPuzzle}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Skip
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tactical advice / study tip */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 mb-1">
            <Award className="w-4 h-4 text-amber-500" />
            Tactical Principle
          </div>
          <p className="leading-relaxed">
            Always calculate checks, captures, and threats (CCT) first. In decisive puzzle positions, forcing candidate moves limit the defender&apos;s available responses.
          </p>
        </div>
      </div>
    </div>
  );
};
