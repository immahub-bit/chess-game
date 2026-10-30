import React from 'react';

interface ChessClockProps {
  timeSeconds: number;
  isActive: boolean;
  playerName: string;
  isFlagged: boolean;
  className?: string;
}

export const ChessClock: React.FC<ChessClockProps> = ({
  timeSeconds,
  isActive,
  playerName,
  isFlagged,
  className = '',
}) => {
  const isUntimed = timeSeconds === -1;

  const minutes = Math.floor(Math.max(0, timeSeconds) / 60);
  const seconds = Math.floor(Math.max(0, timeSeconds) % 60);
  const isLowTime = !isUntimed && timeSeconds <= 30 && timeSeconds > 0;

  const formattedTime = isUntimed
    ? '∞'
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div
      className={`relative flex items-center justify-between px-3.5 py-2 rounded-xl transition-all duration-200 border ${
        isFlagged
          ? 'bg-rose-950/40 border-rose-600 text-rose-400'
          : isActive
          ? 'bg-amber-500/10 dark:bg-amber-400/10 border-amber-500/60 shadow-sm'
          : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400'
      } ${className}`}
    >
      <div className="flex items-center gap-2 truncate pr-2">
        {isActive && (
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
        )}
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
          {playerName}
        </span>
      </div>

      <div
        className={`font-mono-numbers text-base sm:text-lg font-bold tracking-tight shrink-0 ${
          isFlagged
            ? 'text-rose-500'
            : isLowTime
            ? 'text-rose-600 dark:text-rose-400 animate-pulse'
            : isActive
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-slate-800 dark:text-slate-200'
        }`}
      >
        {isFlagged ? '00:00 (Time)' : formattedTime}
      </div>
    </div>
  );
};
