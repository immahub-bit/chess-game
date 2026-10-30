import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { BoardThemeId, GameSettings, TimeControl } from '../types/chess';
import { BOARD_THEMES, TIME_CONTROLS } from '../utils/themePresets';
import { Trophy, RotateCcw, X, Volume2, VolumeX, Eye, Sparkles } from 'lucide-react';

interface GameOverModalProps {
  isOpen: boolean;
  onClose: () => void;
  resultTitle: string;
  resultSubtitle: string;
  isWin: boolean;
  totalMoves: number;
  onRematch: () => void;
  onAnalyze: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  onClose,
  resultTitle,
  resultSubtitle,
  isWin,
  totalMoves,
  onRematch,
  onAnalyze,
}) => {
  useEffect(() => {
    if (isOpen && isWin) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#10b981', '#3b82f6', '#ec4899'],
      });
    }
  }, [isOpen, isWin]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center bg-amber-500/10 text-amber-500 mb-4 border border-amber-500/20">
          <Trophy className="w-7 h-7" />
        </div>

        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {resultTitle}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">
          {resultSubtitle}
        </p>

        <div className="flex items-center justify-center gap-6 py-3 px-4 mb-6 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Moves</div>
            <div className="text-base font-bold font-mono-numbers text-slate-800 dark:text-slate-200">
              {totalMoves}
            </div>
          </div>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Outcome</div>
            <div className="text-base font-bold text-slate-800 dark:text-slate-200">
              {isWin ? 'Victory' : 'Finished'}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              onClose();
              onRematch();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-xs text-white bg-amber-600 hover:bg-amber-500 transition-colors shadow-sm cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Play Rematch
          </button>
          <button
            onClick={() => {
              onClose();
              onAnalyze();
            }}
            className="w-full py-2.5 px-4 rounded-xl font-medium text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-800 cursor-pointer"
          >
            Review & Analyze Game
          </button>
        </div>
      </div>
    </div>
  );
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Game Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-5 text-xs">
          {/* Board Theme */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-2">
              Board Theme
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(BOARD_THEMES) as BoardThemeId[]).map((themeKey) => {
                const item = BOARD_THEMES[themeKey];
                const isSelected = settings.boardTheme === themeKey;
                return (
                  <button
                    key={themeKey}
                    onClick={() => onUpdateSettings({ boardTheme: themeKey })}
                    className={`flex items-center gap-2 p-2 rounded-xl border transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-md overflow-hidden grid grid-cols-2 grid-rows-2 shrink-0 border border-slate-300 dark:border-slate-700">
                      <div style={{ backgroundColor: item.lightSquare }} />
                      <div style={{ backgroundColor: item.darkSquare }} />
                      <div style={{ backgroundColor: item.darkSquare }} />
                      <div style={{ backgroundColor: item.lightSquare }} />
                    </div>
                    <span className="text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate">
                      {item.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Control */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-2">
              Time Control (New Games)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {TIME_CONTROLS.map((tc) => {
                const isSelected = settings.timeControl.id === tc.id;
                return (
                  <button
                    key={tc.id}
                    onClick={() => onUpdateSettings({ timeControl: tc })}
                    className={`py-2 px-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-600 text-white border-amber-600 font-semibold shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                    }`}
                  >
                    {tc.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gameplay Toggles */}
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-slate-600 dark:text-slate-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                <span className="text-slate-700 dark:text-slate-300">Sound Effects</span>
              </div>
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => onUpdateSettings({ soundEnabled: e.target.checked })}
                className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span className="text-slate-700 dark:text-slate-300">Show Legal Move Dots</span>
              </div>
              <input
                type="checkbox"
                checked={settings.showLegalMoves}
                onChange={(e) => onUpdateSettings({ showLegalMoves: e.target.checked })}
                className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span className="text-slate-700 dark:text-slate-300">Board Coordinates</span>
              </div>
              <input
                type="checkbox"
                checked={settings.showCoordinates}
                onChange={(e) => onUpdateSettings({ showCoordinates: e.target.checked })}
                className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-slate-700 flex items-center justify-center text-[10px] text-white">±</div>
                <span className="text-slate-700 dark:text-slate-300">Live Evaluation Bar</span>
              </div>
              <input
                type="checkbox"
                checked={settings.showEvalBar}
                onChange={(e) => onUpdateSettings({ showEvalBar: e.target.checked })}
                className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};

interface FenPgnModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFen: string;
  onLoadFen: (fen: string) => boolean;
}

export const FenPgnModal: React.FC<FenPgnModalProps> = ({
  isOpen,
  onClose,
  currentFen,
  onLoadFen,
}) => {
  const [fenInput, setFenInput] = React.useState(currentFen);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setFenInput(currentFen);
    setError(null);
  }, [currentFen, isOpen]);

  if (!isOpen) return null;

  const handleApply = () => {
    setError(null);
    const success = onLoadFen(fenInput.trim());
    if (success) {
      onClose();
    } else {
      setError('Invalid FEN position string. Please verify standard notation.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Custom Position (FEN Setup)
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Paste any standard FEN string to instantly load a position for analysis or practice:
        </p>

        <textarea
          value={fenInput}
          onChange={(e) => setFenInput(e.target.value)}
          rows={3}
          className="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
        />

        {error && (
          <p className="text-xs text-rose-500 mt-2 font-medium">{error}</p>
        )}

        <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition-colors cursor-pointer shadow-sm"
          >
            Load Position
          </button>
        </div>
      </div>
    </div>
  );
};
