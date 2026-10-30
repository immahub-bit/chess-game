import React, { useState, useEffect } from 'react';
import { Chess, PieceSymbol, Square } from 'chess.js';
import { GameSettings } from '../types/chess';
import { TUTORIAL_LESSONS, TutorialLesson } from '../data/tutorials';
import { ChessBoard } from './ChessBoard';
import {
  playMoveSound,
  playCaptureSound,
  playCheckSound,
  playVictorySound,
  playTickSound,
} from '../utils/chessAudio';
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Award,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TutorialModeProps {
  settings: GameSettings;
}

export const TutorialMode: React.FC<TutorialModeProps> = ({ settings }) => {
  const [activeLessonId, setActiveLessonId] = useState<string>(TUTORIAL_LESSONS[0].id);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('grandmaster_chess_tutorials_completed');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [chessInstance, setChessInstance] = useState<Chess>(() => new Chess());
  const [status, setStatus] = useState<'pending' | 'success' | 'incorrect'>('pending');
  const [showHint, setShowHint] = useState<boolean>(false);
  const [hintSquare, setHintSquare] = useState<Square | null>(null);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);

  const currentLesson: TutorialLesson =
    TUTORIAL_LESSONS.find((l) => l.id === activeLessonId) || TUTORIAL_LESSONS[0];

  // Initialize board on lesson change
  useEffect(() => {
    try {
      const c = new Chess(currentLesson.fen);
      setChessInstance(c);
      setStatus('pending');
      setShowHint(false);
      setHintSquare(null);
      setLastMove(null);
    } catch {
      // Fallback
    }
  }, [currentLesson]);

  const handleLessonMove = (
    from: Square,
    to: Square,
    promotion: PieceSymbol = 'q'
  ): boolean => {
    if (status === 'success') return false;

    const expected = currentLesson.expectedMove;
    const isFromMatch = from === expected.from;
    const isToMatch = to === expected.to;
    const isPromotionMatch = expected.promotion ? promotion === expected.promotion : true;

    if (isFromMatch && isToMatch && isPromotionMatch) {
      try {
        const move = chessInstance.move({ from, to, promotion });
        if (move) {
          setLastMove({ from, to });
          setStatus('success');

          // Mark completed
          const updated = new Set(completedLessonIds);
          updated.add(currentLesson.id);
          setCompletedLessonIds(updated);
          try {
            localStorage.setItem(
              'grandmaster_chess_tutorials_completed',
              JSON.stringify(Array.from(updated))
            );
          } catch {
            // Ignore
          }

          if (move.captured) playCaptureSound(settings.soundEnabled);
          else if (move.san.includes('#') || move.san.includes('+')) playCheckSound(settings.soundEnabled);
          else playVictorySound(settings.soundEnabled);

          confetti({
            particleCount: 50,
            spread: 50,
            origin: { y: 0.7 },
          });

          return true;
        }
      } catch {
        return false;
      }
    }

    // Move was not the intended tutorial move
    setStatus('incorrect');
    playTickSound(settings.soundEnabled);
    return false;
  };

  const handleResetLesson = () => {
    try {
      const c = new Chess(currentLesson.fen);
      setChessInstance(c);
      setStatus('pending');
      setShowHint(false);
      setHintSquare(null);
      setLastMove(null);
    } catch {
      //
    }
  };

  const handleNextLesson = () => {
    const currentIndex = TUTORIAL_LESSONS.findIndex((l) => l.id === activeLessonId);
    if (currentIndex < TUTORIAL_LESSONS.length - 1) {
      setActiveLessonId(TUTORIAL_LESSONS[currentIndex + 1].id);
    }
  };

  const handleShowHint = () => {
    setShowHint(true);
    setHintSquare(currentLesson.expectedMove.from as Square);
  };

  // Group lessons by module
  const moduleGroups = TUTORIAL_LESSONS.reduce<Record<string, { title: string; lessons: TutorialLesson[] }>>(
    (acc, lesson) => {
      if (!acc[lesson.moduleId]) {
        acc[lesson.moduleId] = { title: lesson.moduleTitle, lessons: [] };
      }
      acc[lesson.moduleId].lessons.push(lesson);
      return acc;
    },
    {}
  );

  const progressPercent = Math.round((completedLessonIds.size / TUTORIAL_LESSONS.length) * 100);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start max-w-7xl mx-auto w-full">
      {/* Left Column: Lesson Curriculum Syllabus */}
      <div className="lg:col-span-4 flex flex-col gap-3">
        {/* Progress Card */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              Tutorial Curriculum
            </span>
            <span className="font-mono-numbers text-slate-500 dark:text-slate-400">
              {completedLessonIds.size} / {TUTORIAL_LESSONS.length} Complete
            </span>
          </div>

          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-amber-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Modules Accordion / List */}
        <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-1">
          {Object.entries(moduleGroups).map(([modId, group]) => (
            <div
              key={modId}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs"
            >
              <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200">
                {group.title}
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {group.lessons.map((lesson) => {
                  const isActive = lesson.id === activeLessonId;
                  const isDone = completedLessonIds.has(lesson.id);

                  return (
                    <button
                      key={lesson.id}
                      onClick={() => setActiveLessonId(lesson.id)}
                      className={`w-full flex items-center justify-between p-2.5 text-left text-xs transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 font-semibold border-l-2 border-amber-600'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 shrink-0" />
                        )}
                        <span className="truncate">{lesson.title}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Center & Right Column: Interactive ChessBoard and Explanatory Guide */}
      <div className="lg:col-span-8 flex flex-col lg:flex-row gap-6 items-start">
        {/* Interactive Board */}
        <div className="w-full max-w-[500px] mx-auto shrink-0">
          <ChessBoard
            chess={chessInstance}
            orientation={currentLesson.orientation}
            themeId={settings.boardTheme}
            showLegalMoves={settings.showLegalMoves}
            showCoordinates={settings.showCoordinates}
            lastMove={lastMove}
            hintSquare={hintSquare}
            onMove={handleLessonMove}
            isInteractive={status !== 'success'}
          />

          <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
            <span className="font-semibold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-600" />
              Task: {currentLesson.interactiveGoal}
            </span>
          </div>
        </div>

        {/* Lesson Theory & Interactive Controls */}
        <div className="flex-1 flex flex-col gap-4 w-full">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">
              {currentLesson.moduleTitle}
            </div>

            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
              {currentLesson.title}
            </h2>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
              {currentLesson.concept}
            </p>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 mb-3 text-xs">
              <div className="font-bold text-slate-900 dark:text-white mb-1">Fundamental Rule</div>
              <div className="text-slate-600 dark:text-slate-400">{currentLesson.keyRule}</div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              {currentLesson.explanation}
            </p>

            {/* Status alerts */}
            {status === 'success' && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-150 mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-bold">Exercise Completed!</div>
                    <div className="text-[11px] opacity-90">{currentLesson.followUpText}</div>
                  </div>
                </div>
                <button
                  onClick={handleNextLesson}
                  className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shrink-0 cursor-pointer shadow-xs"
                >
                  Next Lesson
                </button>
              </div>
            )}

            {status === 'incorrect' && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between gap-2 mb-3 animate-in fade-in duration-150">
                <span>Not quite the requested continuation. Try again or check the hint.</span>
                <button
                  onClick={handleResetLesson}
                  className="px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shrink-0 cursor-pointer"
                >
                  Reset
                </button>
              </div>
            )}

            {showHint && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Teacher Hint:</strong>
                  {currentLesson.hint}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleShowHint}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
              >
                <HelpCircle className="w-4 h-4" />
                Clue
              </button>
              <button
                onClick={handleResetLesson}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
              <button
                onClick={handleNextLesson}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Skip
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
