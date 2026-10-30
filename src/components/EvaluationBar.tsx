import React from 'react';
import { PlayerColor } from '../types/chess';

interface EvaluationBarProps {
  scoreCentipawns: number; // positive = White advantage, negative = Black advantage
  orientation: PlayerColor;
  className?: string;
}

export const EvaluationBar: React.FC<EvaluationBarProps> = ({
  scoreCentipawns,
  orientation,
  className = '',
}) => {
  // Clamp score between -1500 and +1500 for bar scaling
  const clamped = Math.max(-1500, Math.min(1500, scoreCentipawns));
  // Sigmoid formula to map centipawns to percentage (0% to 100% white)
  // 0 centipawns -> 50%
  const whitePercent = 50 + (2 / (1 + Math.exp(-0.0035 * clamped)) - 1) * 50;
  const blackPercent = 100 - whitePercent;

  // Formatted display text (e.g. +1.5, -0.8, 0.0)
  const isMate = Math.abs(scoreCentipawns) > 25000;
  let label = '0.0';
  if (isMate) {
    label = scoreCentipawns > 0 ? '+M' : '-M';
  } else {
    const pawns = (scoreCentipawns / 100).toFixed(1);
    label = scoreCentipawns > 0 ? `+${pawns}` : pawns === '-0.0' ? '0.0' : pawns;
  }

  // If orientation is Black ('b'), invert height percentages
  const isWhiteOriented = orientation === 'w';
  const topPercent = isWhiteOriented ? blackPercent : whitePercent;
  const bottomPercent = isWhiteOriented ? whitePercent : blackPercent;

  return (
    <div
      className={`relative flex flex-col w-5 sm:w-6 h-full max-h-[620px] rounded-lg overflow-hidden bg-slate-900 border border-slate-700/80 shadow-md ${className}`}
      title={`Engine Evaluation: ${label}`}
    >
      {/* Black's portion (or top side) */}
      <div
        className="w-full bg-slate-900 transition-all duration-300 ease-out flex items-start justify-center pt-1"
        style={{ height: `${topPercent}%` }}
      >
        {!isWhiteOriented && (
          <span className="text-[10px] font-mono-numbers font-semibold text-white/90 select-none">
            {label}
          </span>
        )}
      </div>

      {/* White's portion (or bottom side) */}
      <div
        className="w-full bg-slate-100 transition-all duration-300 ease-out flex items-end justify-center pb-1"
        style={{ height: `${bottomPercent}%` }}
      >
        {isWhiteOriented && (
          <span className="text-[10px] font-mono-numbers font-semibold text-slate-900 select-none">
            {label}
          </span>
        )}
      </div>
    </div>
  );
};
