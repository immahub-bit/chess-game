import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chess, PieceSymbol, Square } from 'chess.js';
import {
  BoardThemeId,
  BotDifficulty,
  GameMode,
  GameSettings,
  PlayerColor,
} from './types/chess';
import {
  ENGINE_PROFILES,
  EngineLevel,
  evaluateBoard,
  getBotMove,
  getEngineAnalysis,
  getTacticalHint,
} from './engine/chessAi';
import { TIME_CONTROLS } from './utils/themePresets';
import { buildMoveLog, getCapturedPiecesAndAdvantage } from './utils/chessStats';
import {
  playCastleSound,
  playCaptureSound,
  playCheckSound,
  playMoveSound,
  playVictorySound,
  playTickSound,
} from './utils/chessAudio';
import { ChessBoard } from './components/ChessBoard';
import { PlayerCard } from './components/PlayerCard';
import { MoveHistory } from './components/MoveHistory';
import { EvaluationBar } from './components/EvaluationBar';
import { GameOverModal, SettingsModal, FenPgnModal } from './components/GameModals';
import { PuzzleTrainer } from './components/PuzzleTrainer';
import { TutorialMode } from './components/TutorialMode';
import { OnlineMultiplayer } from './components/OnlineMultiplayer';
import {
  RotateCcw,
  Volume2,
  VolumeX,
  Settings,
  Lightbulb,
  Flag,
  Handshake,
  Bot,
  Globe,
  GraduationCap,
  Sparkles,
  Search,
  FileCode,
  Gauge,
} from 'lucide-react';

export default function App() {
  // Navigation & Mode
  const [activeMode, setActiveMode] = useState<GameMode>(() => {
    // If URL has ?room= parameter, start in multiplayer mode
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('room')) return 'multiplayer';
    }
    return 'ai';
  });

  // Chess Game State
  const [chess] = useState<Chess>(() => new Chess());
  const [fenState, setFenState] = useState<string>(chess.fen());
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [boardOrientation, setBoardOrientation] = useState<PlayerColor>('w');
  const [userColor, setUserColor] = useState<PlayerColor>('w');
  const [engineLevel, setEngineLevel] = useState<EngineLevel>('intermediate');
  const [isBotThinking, setIsBotThinking] = useState(false);

  // Replay Navigation State (-1 means latest position)
  const [viewPlyIndex, setViewPlyIndex] = useState<number>(-1);
  const [displayFen, setDisplayFen] = useState<string>(chess.fen());

  // Clocks
  const [whiteTime, setWhiteTime] = useState<number>(300); // 5 min default
  const [blackTime, setBlackTime] = useState<number>(300);
  const [isClockRunning, setIsClockRunning] = useState<boolean>(false);
  const [flaggedPlayer, setFlaggedPlayer] = useState<PlayerColor | null>(null);

  // Settings
  const [settings, setSettings] = useState<GameSettings>({
    boardTheme: 'wood',
    soundEnabled: true,
    showLegalMoves: true,
    showCoordinates: true,
    autoFlipPassAndPlay: false,
    showEvalBar: true,
    timeControl: TIME_CONTROLS[3], // Rapid 5m + 3s
  });

  // Hints & Analysis
  const [hintSquare, setHintSquare] = useState<Square | null>(null);
  const [coachAdvice, setCoachAdvice] = useState<string | null>(null);
  const [evalScore, setEvalScore] = useState<number>(0);
  const [engineAnalysis, setEngineAnalysis] = useState<{
    bestMoveSan?: string;
    score: number;
    depth: number;
  } | null>(null);

  // Modals
  const [isGameOverModalOpen, setIsGameOverModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFenModalOpen, setIsFenModalOpen] = useState(false);
  const [gameOverInfo, setGameOverInfo] = useState({
    title: '',
    subtitle: '',
    isWin: false,
  });

  // References
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize board evaluation whenever position updates
  useEffect(() => {
    try {
      const activeEvalChess = viewPlyIndex === -1 ? chess : new Chess(displayFen);
      const score = evaluateBoard(activeEvalChess);
      setEvalScore(score);

      if (activeMode === 'analysis') {
        const analysis = getEngineAnalysis(activeEvalChess);
        setEngineAnalysis({
          bestMoveSan: analysis.bestMove?.san,
          score: analysis.scoreCentipawns,
          depth: analysis.depth,
        });
      }
    } catch {
      // Ignore evaluation parse errors
    }
  }, [fenState, displayFen, viewPlyIndex, chess, activeMode]);

  // Check Game Over Conditions
  const checkGameOver = useCallback(
    (currentChess: Chess) => {
      if (currentChess.isGameOver()) {
        setIsClockRunning(false);

        if (currentChess.isCheckmate()) {
          const winnerColor = currentChess.turn() === 'w' ? 'b' : 'w';
          const isUserWin = activeMode === 'ai' ? winnerColor === userColor : true;
          const winnerName = winnerColor === 'w' ? 'White' : 'Black';

          setGameOverInfo({
            title: `Checkmate! ${winnerName} Wins!`,
            subtitle: `${winnerName} delivered decisive checkmate.`,
            isWin: isUserWin,
          });
          setIsGameOverModalOpen(true);
          playVictorySound(settings.soundEnabled);
          return true;
        }

        if (currentChess.isDraw()) {
          let reason = 'Game drawn';
          if (currentChess.isStalemate()) reason = 'Draw by Stalemate: No legal moves left';
          else if (currentChess.isThreefoldRepetition()) reason = 'Draw by Threefold Repetition';
          else if (currentChess.isInsufficientMaterial()) reason = 'Draw by Insufficient Material';
          else reason = 'Draw by 50-move rule';

          setGameOverInfo({
            title: 'Draw',
            subtitle: reason,
            isWin: false,
          });
          setIsGameOverModalOpen(true);
          return true;
        }
      }
      return false;
    },
    [activeMode, userColor, settings.soundEnabled]
  );

  // Start new game
  const handleNewGame = useCallback(
    (colorPreference: PlayerColor | 'random' = 'w') => {
      chess.reset();
      const chosenColor =
        colorPreference === 'random'
          ? Math.random() > 0.5
            ? 'w'
            : 'b'
          : colorPreference;

      setUserColor(chosenColor);
      setBoardOrientation(chosenColor);
      setFenState(chess.fen());
      setDisplayFen(chess.fen());
      setViewPlyIndex(-1);
      setLastMove(null);
      setHintSquare(null);
      setCoachAdvice(null);
      setFlaggedPlayer(null);
      setIsGameOverModalOpen(false);

      // Reset timers according to selected TimeControl
      const baseSecs = settings.timeControl.baseSeconds;
      setWhiteTime(baseSecs === 0 ? -1 : baseSecs);
      setBlackTime(baseSecs === 0 ? -1 : baseSecs);
      setIsClockRunning(baseSecs > 0);

      // If user plays Black vs AI, trigger bot's opening White move
      if (activeMode === 'ai' && chosenColor === 'b') {
        setIsBotThinking(true);
        setTimeout(() => {
          const botMove = getBotMove(chess, engineLevel);
          if (botMove) {
            chess.move(botMove);
            setFenState(chess.fen());
            setDisplayFen(chess.fen());
            setLastMove({ from: botMove.from, to: botMove.to });
            playMoveSound(settings.soundEnabled);
          }
          setIsBotThinking(false);
        }, 500);
      }
    },
    [chess, activeMode, engineLevel, settings.soundEnabled, settings.timeControl.baseSeconds]
  );

  // Initialize game on initial load or mode switch
  useEffect(() => {
    if (activeMode === 'ai' || activeMode === 'pass-and-play' || activeMode === 'analysis') {
      handleNewGame('w');
    }
  }, [activeMode, handleNewGame]);

  // Dual Chess Clock Timer Effect
  useEffect(() => {
    if (!isClockRunning || settings.timeControl.baseSeconds === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      const turn = chess.turn();

      if (turn === 'w') {
        setWhiteTime((prev) => {
          if (prev <= 1) {
            setIsClockRunning(false);
            setFlaggedPlayer('w');
            setGameOverInfo({
              title: 'Black Wins on Time!',
              subtitle: 'White flagged on the chess clock.',
              isWin: activeMode === 'ai' ? userColor === 'b' : true,
            });
            setIsGameOverModalOpen(true);
            return 0;
          }
          if (prev === 10) playTickSound(settings.soundEnabled);
          return prev - 1;
        });
      } else {
        setBlackTime((prev) => {
          if (prev <= 1) {
            setIsClockRunning(false);
            setFlaggedPlayer('b');
            setGameOverInfo({
              title: 'White Wins on Time!',
              subtitle: 'Black flagged on the chess clock.',
              isWin: activeMode === 'ai' ? userColor === 'w' : true,
            });
            setIsGameOverModalOpen(true);
            return 0;
          }
          if (prev === 10) playTickSound(settings.soundEnabled);
          return prev - 1;
        });
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isClockRunning, chess, settings.timeControl.baseSeconds, settings.soundEnabled, activeMode, userColor]);

  // Execute Move handler
  const handleBoardMove = (
    from: Square,
    to: Square,
    promotion: PieceSymbol = 'q'
  ): boolean => {
    if (viewPlyIndex !== -1) {
      setViewPlyIndex(-1);
      setDisplayFen(chess.fen());
    }

    if (chess.isGameOver() || isBotThinking) return false;

    // In AI mode, restrict moves to user's assigned color
    if (activeMode === 'ai' && chess.turn() !== userColor) {
      return false;
    }

    try {
      const move = chess.move({ from, to, promotion });
      if (!move) return false;

      // Reset hint
      setHintSquare(null);
      setCoachAdvice(null);
      setLastMove({ from, to });
      setFenState(chess.fen());
      setDisplayFen(chess.fen());

      // Add time increment if applicable
      const increment = settings.timeControl.incrementSeconds;
      if (increment > 0 && settings.timeControl.baseSeconds > 0) {
        if (move.color === 'w') {
          setWhiteTime((t) => t + increment);
        } else {
          setBlackTime((t) => t + increment);
        }
      }

      // Audio feedback
      if (move.san.includes('O-O')) {
        playCastleSound(settings.soundEnabled);
      } else if (move.captured) {
        playCaptureSound(settings.soundEnabled);
      } else if (move.san.includes('+') || move.san.includes('#')) {
        playCheckSound(settings.soundEnabled);
      } else {
        playMoveSound(settings.soundEnabled);
      }

      // Check game over
      const isOver = checkGameOver(chess);
      if (isOver) return true;

      // Auto flip in Pass and Play if enabled
      if (activeMode === 'pass-and-play' && settings.autoFlipPassAndPlay) {
        setBoardOrientation(chess.turn());
      }

      // If playing vs AI, schedule bot response move
      if (activeMode === 'ai' && chess.turn() !== userColor) {
        setIsBotThinking(true);
        const botDelay = Math.floor(Math.random() * 300) + 350;

        setTimeout(() => {
          const aiMove = getBotMove(chess, engineLevel);
          if (aiMove) {
            chess.move(aiMove);
            setFenState(chess.fen());
            setDisplayFen(chess.fen());
            setLastMove({ from: aiMove.from, to: aiMove.to });

            if (aiMove.san.includes('O-O')) {
              playCastleSound(settings.soundEnabled);
            } else if (aiMove.captured) {
              playCaptureSound(settings.soundEnabled);
            } else if (aiMove.san.includes('+') || aiMove.san.includes('#')) {
              playCheckSound(settings.soundEnabled);
            } else {
              playMoveSound(settings.soundEnabled);
            }

            checkGameOver(chess);
          }
          setIsBotThinking(false);
        }, botDelay);
      }

      return true;
    } catch {
      return false;
    }
  };

  // Replay Navigation: Jump to specific ply
  const handleNavigateMove = (plyIndex: number) => {
    const historyMoves = chess.history({ verbose: true });
    if (historyMoves.length === 0) return;

    if (plyIndex < 0) {
      const startChess = new Chess();
      setDisplayFen(startChess.fen());
      setViewPlyIndex(-1);
      setLastMove(null);
    } else if (plyIndex >= historyMoves.length - 1) {
      setDisplayFen(chess.fen());
      setViewPlyIndex(-1);
      const last = historyMoves[historyMoves.length - 1];
      setLastMove({ from: last.from, to: last.to });
    } else {
      const targetMove = historyMoves[plyIndex];
      setDisplayFen(targetMove.after);
      setViewPlyIndex(plyIndex);
      setLastMove({ from: targetMove.from, to: targetMove.to });
    }
  };

  // Coach Hint Request
  const handleRequestCoachHint = () => {
    const activeChess = viewPlyIndex === -1 ? chess : new Chess(displayFen);
    const hint = getTacticalHint(activeChess);
    if (hint) {
      setHintSquare(hint.move.from);
      setCoachAdvice(hint.explanation);
    }
  };

  // Resign current game
  const handleResign = () => {
    if (chess.isGameOver()) return;
    setIsClockRunning(false);
    const resigner = chess.turn();
    const winnerName = resigner === 'w' ? 'Black' : 'White';
    setGameOverInfo({
      title: `${winnerName} Wins by Resignation`,
      subtitle: `${resigner === 'w' ? 'White' : 'Black'} has conceded the game.`,
      isWin: activeMode === 'ai' ? userColor !== resigner : false,
    });
    setIsGameOverModalOpen(true);
  };

  // Offer Draw
  const handleOfferDraw = () => {
    if (chess.isGameOver()) return;
    if (activeMode === 'ai') {
      const score = Math.abs(evaluateBoard(chess));
      if (score < 120 && chess.history().length > 15) {
        setIsClockRunning(false);
        setGameOverInfo({
          title: 'Draw Agreed',
          subtitle: `${ENGINE_PROFILES[engineLevel].name} accepted your draw offer.`,
          isWin: false,
        });
        setIsGameOverModalOpen(true);
      } else {
        setCoachAdvice(`${ENGINE_PROFILES[engineLevel].name} declines: "The position is still sharp and full of fight!"`);
      }
    } else {
      setIsClockRunning(false);
      setGameOverInfo({
        title: 'Draw Agreed',
        subtitle: 'Both players agreed to end in a draw.',
        isWin: false,
      });
      setIsGameOverModalOpen(true);
    }
  };

  // Undo Move (Takeback)
  const handleTakeback = () => {
    if (chess.history().length === 0) return;
    if (activeMode === 'ai') {
      chess.undo();
      if (chess.turn() !== userColor && chess.history().length > 0) {
        chess.undo();
      }
    } else {
      chess.undo();
    }

    const history = chess.history({ verbose: true });
    setFenState(chess.fen());
    setDisplayFen(chess.fen());
    setViewPlyIndex(-1);
    setHintSquare(null);
    setCoachAdvice(null);

    if (history.length > 0) {
      const last = history[history.length - 1];
      setLastMove({ from: last.from, to: last.to });
    } else {
      setLastMove(null);
    }
  };

  // Load custom FEN position
  const handleLoadCustomFen = (newFen: string): boolean => {
    try {
      new Chess(newFen);
      chess.load(newFen);
      setFenState(newFen);
      setDisplayFen(newFen);
      setViewPlyIndex(-1);
      setLastMove(null);
      setHintSquare(null);
      setCoachAdvice(null);
      return true;
    } catch {
      return false;
    }
  };

  // Calculate stats & history
  const activeChessForBoard = viewPlyIndex === -1 ? chess : new Chess(displayFen);
  const historyMoves = chess.history({ verbose: true });
  const moveHistoryItems = buildMoveLog(historyMoves);
  const { whiteCaptured, blackCaptured, whiteAdvantage, blackAdvantage } =
    getCapturedPiecesAndAdvantage(activeChessForBoard);

  const topColor: PlayerColor = boardOrientation === 'w' ? 'b' : 'w';
  const bottomColor: PlayerColor = boardOrientation === 'w' ? 'w' : 'b';

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* 
        TOP BAR CONTRACT:
        [Brand title, one line] — [4–5 nav links, 1–2 word labels, single-line] — [1 primary action]
      */}
      <header className="flex items-center justify-between gap-8 px-4 sm:px-8 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
        {/* Zone 1: Brand Wordmark (one line, display font) */}
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white shadow-xs font-bold text-lg">
            ♞
          </div>
          <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            Grandmaster Chess
          </span>
        </div>

        {/* Zone 2: 5 single-line nav links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">
          <button
            onClick={() => setActiveMode('ai')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              activeMode === 'ai'
                ? 'text-amber-600 dark:text-amber-400 font-semibold'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Play Engine
          </button>
          <button
            onClick={() => setActiveMode('multiplayer')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              activeMode === 'multiplayer'
                ? 'text-amber-600 dark:text-amber-400 font-semibold'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Online Play
          </button>
          <button
            onClick={() => setActiveMode('tutorials')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              activeMode === 'tutorials'
                ? 'text-amber-600 dark:text-amber-400 font-semibold'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Tutorials
          </button>
          <button
            onClick={() => setActiveMode('puzzles')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              activeMode === 'puzzles'
                ? 'text-amber-600 dark:text-amber-400 font-semibold'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Tactics
          </button>
          <button
            onClick={() => setActiveMode('analysis')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              activeMode === 'analysis'
                ? 'text-amber-600 dark:text-amber-400 font-semibold'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Analysis Board
          </button>
        </nav>

        {/* Zone 3: 1 primary action button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleNewGame('w')}
            className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm cursor-pointer"
          >
            New Game
          </button>
        </div>
      </header>

      {/* Mobile Mode Switcher Bar */}
      <div className="lg:hidden flex items-center justify-around px-2 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs font-medium overflow-x-auto">
        <button
          onClick={() => setActiveMode('ai')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap shrink-0 ${activeMode === 'ai' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold' : 'text-slate-600 dark:text-slate-400'}`}
        >
          Engine
        </button>
        <button
          onClick={() => setActiveMode('multiplayer')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap shrink-0 ${activeMode === 'multiplayer' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold' : 'text-slate-600 dark:text-slate-400'}`}
        >
          Online
        </button>
        <button
          onClick={() => setActiveMode('tutorials')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap shrink-0 ${activeMode === 'tutorials' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold' : 'text-slate-600 dark:text-slate-400'}`}
        >
          Tutorials
        </button>
        <button
          onClick={() => setActiveMode('puzzles')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap shrink-0 ${activeMode === 'puzzles' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold' : 'text-slate-600 dark:text-slate-400'}`}
        >
          Tactics
        </button>
        <button
          onClick={() => setActiveMode('analysis')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap shrink-0 ${activeMode === 'analysis' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold' : 'text-slate-600 dark:text-slate-400'}`}
        >
          Analysis
        </button>
      </div>

      {/* Main Body */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {activeMode === 'tutorials' ? (
          <TutorialMode settings={settings} />
        ) : activeMode === 'multiplayer' ? (
          <OnlineMultiplayer settings={settings} />
        ) : activeMode === 'puzzles' ? (
          <PuzzleTrainer settings={settings} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Board + Player Cards + Evaluation Bar */}
            <div className="lg:col-span-8 flex flex-col gap-3 max-w-[660px] mx-auto w-full">
              {/* Top Player Card */}
              <PlayerCard
                name={
                  activeMode === 'ai'
                    ? userColor === topColor
                      ? 'You'
                      : ENGINE_PROFILES[engineLevel].name
                    : topColor === 'b'
                    ? 'Black Player'
                    : 'White Player'
                }
                ratingText={
                  activeMode === 'ai' && userColor !== topColor
                    ? `${ENGINE_PROFILES[engineLevel].rating} ELO`
                    : undefined
                }
                avatar={
                  activeMode === 'ai' && userColor !== topColor
                    ? ENGINE_PROFILES[engineLevel].avatar
                    : topColor === 'w'
                    ? '♔'
                    : '♚'
                }
                color={topColor}
                isTurn={chess.turn() === topColor && !chess.isGameOver()}
                timeSeconds={topColor === 'w' ? whiteTime : blackTime}
                isFlagged={flaggedPlayer === topColor}
                capturedPieces={topColor === 'w' ? whiteCaptured : blackCaptured}
                materialAdvantage={topColor === 'w' ? whiteAdvantage : blackAdvantage}
              />

              {/* Board and Evaluation Bar Row */}
              <div className="flex items-stretch justify-center gap-3">
                {/* Live Evaluation Bar */}
                {settings.showEvalBar && (
                  <div className="py-1">
                    <EvaluationBar
                      scoreCentipawns={evalScore}
                      orientation={boardOrientation}
                    />
                  </div>
                )}

                {/* The Chessboard */}
                <div className="flex-1">
                  <ChessBoard
                    chess={activeChessForBoard}
                    orientation={boardOrientation}
                    themeId={settings.boardTheme}
                    showLegalMoves={settings.showLegalMoves}
                    showCoordinates={settings.showCoordinates}
                    lastMove={lastMove}
                    hintSquare={hintSquare}
                    onMove={handleBoardMove}
                    isInteractive={viewPlyIndex === -1 && !isBotThinking}
                  />
                </div>
              </div>

              {/* Bottom Player Card */}
              <PlayerCard
                name={
                  activeMode === 'ai'
                    ? userColor === bottomColor
                      ? 'You'
                      : ENGINE_PROFILES[engineLevel].name
                    : bottomColor === 'w'
                    ? 'White Player'
                    : 'Black Player'
                }
                ratingText={
                  activeMode === 'ai' && userColor !== bottomColor
                    ? `${ENGINE_PROFILES[engineLevel].rating} ELO`
                    : undefined
                }
                avatar={
                  activeMode === 'ai' && userColor !== bottomColor
                    ? ENGINE_PROFILES[engineLevel].avatar
                    : bottomColor === 'w'
                    ? '♔'
                    : '♚'
                }
                color={bottomColor}
                isTurn={chess.turn() === bottomColor && !chess.isGameOver()}
                timeSeconds={bottomColor === 'w' ? whiteTime : blackTime}
                isFlagged={flaggedPlayer === bottomColor}
                capturedPieces={bottomColor === 'w' ? whiteCaptured : blackCaptured}
                materialAdvantage={bottomColor === 'w' ? whiteAdvantage : blackAdvantage}
              />

              {/* Action Toolbar Below Board */}
              <div className="flex items-center justify-between gap-1 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setBoardOrientation((prev) => (prev === 'w' ? 'b' : 'w'))}
                    className="p-2 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                    title="Flip Board Orientation"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Flip</span>
                  </button>

                  <button
                    onClick={() =>
                      setSettings((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }))
                    }
                    className="p-2 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                    title="Toggle Audio"
                  >
                    {settings.soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{settings.soundEnabled ? 'Mute' : 'Unmute'}</span>
                  </button>

                  <button
                    onClick={handleRequestCoachHint}
                    className="p-2 text-xs font-medium rounded-lg text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors flex items-center gap-1 cursor-pointer"
                    title="Ask Coach for Hint"
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Hint</span>
                  </button>

                  {activeMode === 'analysis' && (
                    <button
                      onClick={() => setIsFenModalOpen(true)}
                      className="p-2 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Load Custom FEN Position"
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Custom FEN</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handleTakeback}
                    disabled={historyMoves.length === 0 || chess.isGameOver()}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    Takeback
                  </button>

                  <button
                    onClick={handleOfferDraw}
                    disabled={chess.isGameOver()}
                    className="p-2 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
                    title="Offer Draw"
                  >
                    <Handshake className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Draw</span>
                  </button>

                  <button
                    onClick={handleResign}
                    disabled={chess.isGameOver()}
                    className="p-2 text-xs font-medium rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
                    title="Resign"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Resign</span>
                  </button>
                </div>
              </div>

              {/* Coach Advice Banner */}
              {coachAdvice && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 text-xs text-amber-900 dark:text-amber-200 flex items-start justify-between gap-3 animate-in fade-in duration-150">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Coach Analysis: </span>
                      {coachAdvice}
                    </div>
                  </div>
                  <button
                    onClick={() => setCoachAdvice(null)}
                    className="text-amber-700 hover:text-amber-900 text-xs shrink-0 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>

            {/* Right Column: Move History + Engine / Analysis Controls */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              {/* Engine Difficulty Selector (in AI mode) */}
              {activeMode === 'ai' && (
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-amber-500" />
                      Engine Opponents
                    </span>
                    <span className="text-xs font-mono-numbers text-amber-600 dark:text-amber-400 font-semibold">
                      {ENGINE_PROFILES[engineLevel].rating} ELO
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {(Object.keys(ENGINE_PROFILES) as EngineLevel[]).map((level) => {
                      const bot = ENGINE_PROFILES[level];
                      const isSelected = engineLevel === level;
                      return (
                        <button
                          key={level}
                          onClick={() => {
                            setEngineLevel(level);
                            handleNewGame(userColor);
                          }}
                          className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-sm">{bot.avatar}</span>
                            <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                              {bot.name}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            {bot.rating} ELO · {bot.title}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Play As:</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleNewGame('w')}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer ${
                          userColor === 'w'
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        White
                      </button>
                      <button
                        onClick={() => handleNewGame('b')}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer ${
                          userColor === 'b'
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        Black
                      </button>
                      <button
                        onClick={() => handleNewGame('random')}
                        className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                      >
                        Random
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Analysis Mode Engine Evaluation Box */}
              {activeMode === 'analysis' && engineAnalysis && (
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-blue-500" />
                      Engine Analysis
                    </span>
                    <span className="text-[11px] font-mono-numbers text-slate-400">
                      Depth {engineAnalysis.depth} ply
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 mb-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Best Continuation:</span>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono-numbers">
                      {engineAnalysis.bestMoveSan || 'None'}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Eval: <strong className="font-mono-numbers text-slate-800 dark:text-slate-200">{evalScore > 0 ? `+${(evalScore / 100).toFixed(2)}` : (evalScore / 100).toFixed(2)}</strong> (centipawns)
                  </div>
                </div>
              )}

              {/* Move Notation History Component */}
              <div className="h-[340px]">
                <MoveHistory
                  history={moveHistoryItems}
                  currentMoveIndex={viewPlyIndex}
                  onNavigateMove={handleNavigateMove}
                  fen={fenState}
                  pgn={chess.pgn()}
                />
              </div>

              {/* Game Status Card */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-500 dark:text-slate-400">Turn</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {chess.turn() === 'w' ? 'White to move' : 'Black to move'}
                    {chess.inCheck() && (
                      <span className="ml-1.5 text-rose-600 dark:text-rose-400 font-bold">
                        (Check!)
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-500 dark:text-slate-400">Time Preset</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {settings.timeControl.name}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Engine Status</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {chess.isGameOver()
                      ? 'Game Concluded'
                      : isBotThinking
                      ? 'Engine is thinking...'
                      : 'Active'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Game Modals */}
      <GameOverModal
        isOpen={isGameOverModalOpen}
        onClose={() => setIsGameOverModalOpen(false)}
        resultTitle={gameOverInfo.title}
        resultSubtitle={gameOverInfo.subtitle}
        isWin={gameOverInfo.isWin}
        totalMoves={Math.ceil(historyMoves.length / 2)}
        onRematch={() => handleNewGame(userColor)}
        onAnalyze={() => {
          setActiveMode('analysis');
          setIsGameOverModalOpen(false);
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={(newSettings) => setSettings((prev) => ({ ...prev, ...newSettings }))}
      />

      <FenPgnModal
        isOpen={isFenModalOpen}
        onClose={() => setIsFenModalOpen(false)}
        currentFen={fenState}
        onLoadFen={handleLoadCustomFen}
      />
    </div>
  );
}
