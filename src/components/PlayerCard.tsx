import React from 'react';
import { PlayerColor } from '../types/chess';
import { ChessPiece } from './ChessPiece';
import { ChessClock } from './ChessClock';

interface PlayerCardProps {
  name: string;
  ratingText?: string;
  avatar: string;
  color: PlayerColor;
  isTurn: boolean;
  timeSeconds: number;
  isFlagged: boolean;
  capturedPieces: string[]; // piece letters e.g. ['p', 'p', 'n'] captured by this player
  materialAdvantage: number; // e.g. +3
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  name,
  ratingText,
  avatar,
  color,
  isTurn,
  timeSeconds,
  isFlagged,
  capturedPieces,
  materialAdvantage,
}) => {
  // Group captured pieces for tidy display (p: 3, n: 1, etc.)
  const counts: Record<string, number> = {};
  capturedPieces.forEach((p) => {
    counts[p] = (counts[p] || 0) + 1;
  });

  const oppositeColor: PlayerColor = color === 'w' ? 'b' : 'w';
  const pieceOrder = ['p', 'n', 'b', 'r', 'q'];

  return (
    <div
      className={`flex items-center justify-between gap-3 p-3 rounded-xl transition-all duration-200 border ${
        isTurn
          ? 'bg-white dark:bg-slate-900 border-amber-500/60 shadow-md ring-1 ring-amber-500/20'
          : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
      }`}
    >
      {/* Player info & captured pieces */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-inner">
            {avatar}
          </div>
          <div
            className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
              color === 'w' ? 'bg-white' : 'bg-slate-950'
            }`}
            title={color === 'w' ? 'Playing White' : 'Playing Black'}
          />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              {name}
            </span>
            {ratingText && (
              <span className="text-xs font-mono-numbers text-slate-600 dark:text-slate-300">
                · {ratingText}
              </span>
            )}
          </div>

          {/* Captured pieces tray */}
          <div className="flex items-center gap-1 mt-0.5 min-h-[18px]">
            {pieceOrder.map((type) => {
              const count = counts[type] || 0;
              if (count === 0) return null;
              return (
                <div key={type} className="flex items-center">
                  <div className="w-4 h-4">
                    <ChessPiece type={type as 'p' | 'n' | 'b' | 'r' | 'q'} color={oppositeColor} />
                  </div>
                  {count > 1 && (
                    <span className="text-[10px] font-mono-numbers text-slate-500 dark:text-slate-400 -ml-0.5">
                      {count}
                    </span>
                  )}
                </div>
              );
            })}
            {materialAdvantage > 0 && (
              <span className="text-xs font-mono-numbers font-semibold text-emerald-600 dark:text-emerald-400 ml-1">
                +{materialAdvantage}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Clock */}
      <ChessClock
        timeSeconds={timeSeconds}
        isActive={isTurn}
        playerName=""
        isFlagged={isFlagged}
        className="w-24 sm:w-28 shrink-0"
      />
    </div>
  );
};
