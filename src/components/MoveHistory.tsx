import React, { useEffect, useRef } from 'react';
import { MoveLogItem } from '../types/chess';
import { ChevronFirst, ChevronLeft, ChevronRight, ChevronLast, Copy, Check } from 'lucide-react';

interface MoveHistoryProps {
  history: MoveLogItem[];
  currentMoveIndex: number; // -1 for starting position, or ply number
  onNavigateMove: (plyIndex: number) => void;
  fen: string;
  pgn: string;
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({
  history,
  currentMoveIndex,
  onNavigateMove,
  fen,
  pgn,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copiedPgn, setCopiedPgn] = React.useState(false);
  const [copiedFen, setCopiedFen] = React.useState(false);

  // Auto-scroll to bottom on new moves
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [history.length]);

  const totalPlies = history.reduce((acc, item) => acc + (item.white ? 1 : 0) + (item.black ? 1 : 0), 0);

  const handleCopyPgn = () => {
    navigator.clipboard.writeText(pgn || 'No moves yet');
    setCopiedPgn(true);
    setTimeout(() => setCopiedPgn(false), 2000);
  };

  const handleCopyFen = () => {
    navigator.clipboard.writeText(fen);
    setCopiedFen(true);
    setTimeout(() => setCopiedFen(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Notation Log
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopyFen}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            title="Copy FEN to clipboard"
          >
            {copiedFen ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            FEN
          </button>
          <button
            onClick={handleCopyPgn}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            title="Copy PGN to clipboard"
          >
            {copiedPgn ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            PGN
          </button>
        </div>
      </div>

      {/* Move list table */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-2 space-y-0.5 text-xs font-mono-numbers divide-y divide-slate-100 dark:divide-slate-800/40 min-h-[140px]"
      >
        {history.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs py-8">
            White to play first move
          </div>
        ) : (
          history.map((row) => {
            const whitePly = (row.moveNumber - 1) * 2;
            const blackPly = whitePly + 1;

            const isWhiteActive = currentMoveIndex === whitePly;
            const isBlackActive = currentMoveIndex === blackPly;

            return (
              <div
                key={row.moveNumber}
                className="grid grid-cols-[38px_1fr_1fr] items-center py-1 px-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded transition-colors"
              >
                <span className="text-slate-400 dark:text-slate-500 select-none">
                  {row.moveNumber}.
                </span>

                {row.white ? (
                  <button
                    onClick={() => onNavigateMove(whitePly)}
                    className={`text-left px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                      isWhiteActive
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {row.white.san}
                  </button>
                ) : (
                  <span />
                )}

                {row.black ? (
                  <button
                    onClick={() => onNavigateMove(blackPly)}
                    className={`text-left px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                      isBlackActive
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {row.black.san}
                  </button>
                ) : (
                  <span />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Navigation footer buttons */}
      <div className="flex items-center justify-center gap-1 p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
        <button
          onClick={() => onNavigateMove(-1)}
          disabled={currentMoveIndex === -1 || totalPlies === 0}
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title="Start of game"
        >
          <ChevronFirst className="w-4 h-4" />
        </button>
        <button
          onClick={() => onNavigateMove(Math.max(-1, currentMoveIndex - 1))}
          disabled={currentMoveIndex === -1 || totalPlies === 0}
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title="Previous move"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onNavigateMove(Math.min(totalPlies - 1, currentMoveIndex + 1))}
          disabled={currentMoveIndex >= totalPlies - 1 || totalPlies === 0}
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title="Next move"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onNavigateMove(totalPlies - 1)}
          disabled={currentMoveIndex >= totalPlies - 1 || totalPlies === 0}
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title="Current position"
        >
          <ChevronLast className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
