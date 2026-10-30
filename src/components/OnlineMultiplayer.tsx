import React, { useState, useEffect, useRef } from 'react';
import { Chess, PieceSymbol, Square } from 'chess.js';
import { GameSettings, PlayerColor } from '../types/chess';
import { TIME_CONTROLS } from '../utils/themePresets';
import { ChessBoard } from './ChessBoard';
import { PlayerCard } from './PlayerCard';
import { MoveHistory } from './MoveHistory';
import { buildMoveLog, getCapturedPiecesAndAdvantage } from '../utils/chessStats';
import {
  playCastleSound,
  playCaptureSound,
  playCheckSound,
  playMoveSound,
  playVictorySound,
} from '../utils/chessAudio';
import {
  Users,
  Copy,
  Check,
  Send,
  Flag,
  Handshake,
  RotateCcw,
  Globe,
  Share2,
  Clock,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface OnlineMultiplayerProps {
  settings: GameSettings;
}

interface RoomData {
  code: string;
  fen: string;
  pgn: string;
  turn: 'w' | 'b';
  whitePlayer: { id: string; name: string } | null;
  blackPlayer: { id: string; name: string } | null;
  spectatorCount: number;
  timeControl: { baseSeconds: number; incrementSeconds: number };
  whiteTime: number;
  blackTime: number;
  status: 'waiting' | 'in_progress' | 'finished';
  result?: { winner: 'w' | 'b' | 'draw' | null; reason: string };
  drawOfferedBy: 'w' | 'b' | null;
  lastMove: { from: string; to: string } | null;
  chatMessages: { sender: string; text: string; time: string }[];
}

export const OnlineMultiplayer: React.FC<OnlineMultiplayerProps> = ({ settings }) => {
  // Connection and Session
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [playerId] = useState<string>(() => {
    const saved = sessionStorage.getItem('chess_player_id');
    if (saved) return saved;
    const generated = `player_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem('chess_player_id', generated);
    return generated;
  });

  // Lobby State
  const [playerName, setPlayerName] = useState<string>('Grandmaster');
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [selectedTimeControl, setSelectedTimeControl] = useState(TIME_CONTROLS[3]); // Rapid 5+3
  const [preferredColor, setPreferredColor] = useState<'w' | 'b' | 'random'>('w');
  const [lobbyError, setLobbyError] = useState<string | null>(null);

  // Active Room State
  const [room, setRoom] = useState<RoomData | null>(null);
  const [myColor, setMyColor] = useState<'w' | 'b' | 'spectator'>('w');
  const [chatInput, setChatInput] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Chess instance for local rendering & legality check
  const [chess] = useState<Chess>(() => new Chess());
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const socket = new WebSocket(`${protocol}//${host}`);

    socket.onopen = () => {
      setIsConnected(true);
      setLobbyError(null);

      // Check if URL has a room parameter
      const params = new URLSearchParams(window.location.search);
      const urlRoomCode = params.get('room');
      if (urlRoomCode) {
        socket.send(
          JSON.stringify({
            type: 'join_room',
            roomCode: urlRoomCode,
            playerName,
            playerId,
          })
        );
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
    };

    socket.onerror = () => {
      setLobbyError('Failed to connect to the chess multiplayer server.');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'room_created' || data.type === 'room_joined') {
          setRoom(data.room);
          setMyColor(data.yourColor);
          chess.load(data.room.fen);
          setLobbyError(null);
        }

        if (data.type === 'room_update') {
          setRoom(data.room);
          chess.load(data.room.fen);

          if (data.room.status === 'finished' && data.room.result) {
            if (
              (data.room.result.winner === 'w' && data.room.whitePlayer?.id === playerId) ||
              (data.room.result.winner === 'b' && data.room.blackPlayer?.id === playerId)
            ) {
              playVictorySound(settings.soundEnabled);
              confetti({ particleCount: 80, spread: 60 });
            }
          }
        }

        if (data.type === 'move_made') {
          const move = data.move;
          chess.load(data.room.fen);
          setRoom(data.room);

          if (move.san.includes('O-O')) playCastleSound(settings.soundEnabled);
          else if (move.captured) playCaptureSound(settings.soundEnabled);
          else if (move.san.includes('+') || move.san.includes('#')) playCheckSound(settings.soundEnabled);
          else playMoveSound(settings.soundEnabled);
        }

        if (data.type === 'chat_message') {
          setRoom((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              chatMessages: [...prev.chatMessages, data.message],
            };
          });
        }

        if (data.type === 'error') {
          setLobbyError(data.message);
        }
      } catch (e) {
        console.error('Error handling WebSocket message', e);
      }
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [room?.chatMessages.length]);

  const handleCreateRoom = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setLobbyError('Multiplayer server is not connected.');
      return;
    }

    ws.send(
      JSON.stringify({
        type: 'create_room',
        playerName: playerName.trim() || 'Player 1',
        playerId,
        preferredColor,
        baseSeconds: selectedTimeControl.baseSeconds,
        incrementSeconds: selectedTimeControl.incrementSeconds,
      })
    );
  };

  const handleJoinRoom = (codeToJoin?: string) => {
    const code = (codeToJoin || joinCodeInput).trim().toUpperCase();
    if (!code) {
      setLobbyError('Please enter a 6-letter room code.');
      return;
    }

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setLobbyError('Multiplayer server is not connected.');
      return;
    }

    ws.send(
      JSON.stringify({
        type: 'join_room',
        roomCode: code,
        playerName: playerName.trim() || 'Player 2',
        playerId,
      })
    );
  };

  const handleMove = (from: Square, to: Square, promotion: PieceSymbol = 'q'): boolean => {
    if (!room || room.status !== 'in_progress') return false;
    if (myColor !== room.turn) return false;

    if (!ws || ws.readyState !== WebSocket.OPEN) return false;

    // Send move to server (server is source of truth and validates)
    ws.send(
      JSON.stringify({
        type: 'make_move',
        roomCode: room.code,
        from,
        to,
        promotion,
      })
    );
    return true;
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !ws || !room) return;

    ws.send(
      JSON.stringify({
        type: 'send_chat',
        roomCode: room.code,
        text: chatInput,
      })
    );
    setChatInput('');
  };

  const handleResign = () => {
    if (!ws || !room || room.status !== 'in_progress') return;
    ws.send(JSON.stringify({ type: 'resign', roomCode: room.code }));
  };

  const handleOfferDraw = () => {
    if (!ws || !room || room.status !== 'in_progress') return;
    ws.send(JSON.stringify({ type: 'offer_draw', roomCode: room.code }));
  };

  const handleRespondDraw = (accept: boolean) => {
    if (!ws || !room) return;
    ws.send(JSON.stringify({ type: 'respond_draw', roomCode: room.code, accept }));
  };

  const handleRematch = () => {
    if (!ws || !room) return;
    ws.send(JSON.stringify({ type: 'rematch', roomCode: room.code }));
  };

  const handleCopyCode = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyInviteLink = () => {
    if (!room) return;
    const url = `${window.location.origin}?room=${room.code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // If NOT in a room, render Create or Join Lobby
  if (!room) {
    return (
      <div className="max-w-4xl mx-auto w-full py-4">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl mx-auto bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center mb-3">
            <Globe className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Online Multiplayer Chess
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Challenge friends worldwide in real-time matches over high-speed WebSockets.
          </p>
        </div>

        {lobbyError && (
          <div className="max-w-md mx-auto mb-6 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{lobbyError}</span>
          </div>
        )}

        <div className="max-w-md mx-auto mb-6">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Your Display Name
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={24}
            className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            placeholder="e.g. Kasparov"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Card 1: Create Game */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base mb-1">
                <Share2 className="w-4 h-4 text-amber-500" />
                Create a Match
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Generate a unique game code and invite link to send to a friend.
              </p>

              {/* Time Control selection */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Time Control
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {TIME_CONTROLS.slice(1).map((tc) => (
                    <button
                      key={tc.id}
                      onClick={() => setSelectedTimeControl(tc)}
                      className={`py-1.5 px-2.5 rounded-lg text-xs font-medium border text-center transition-colors cursor-pointer ${
                        selectedTimeControl.id === tc.id
                          ? 'bg-amber-600 text-white border-amber-600 font-semibold'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {tc.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color preference */}
              <div className="mb-6">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Preferred Color
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['w', 'b', 'random'] as const).map((col) => (
                    <button
                      key={col}
                      onClick={() => setPreferredColor(col)}
                      className={`py-1.5 rounded-lg text-xs font-medium border capitalize transition-colors cursor-pointer ${
                        preferredColor === col
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold border-transparent'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {col === 'w' ? 'White' : col === 'b' ? 'Black' : 'Random'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleCreateRoom}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
            >
              Create Game Room
            </button>
          </div>

          {/* Card 2: Join Game */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base mb-1">
                <Users className="w-4 h-4 text-emerald-500" />
                Join Existing Match
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Enter the 6-character room code shared by your opponent.
              </p>

              <div className="mb-6">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Room Code
                </label>
                <input
                  type="text"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  maxLength={6}
                  placeholder="e.g. 7X8K2M"
                  className="w-full px-3.5 py-2.5 text-center text-lg font-mono font-bold tracking-widest uppercase rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <button
              onClick={() => handleJoinRoom()}
              className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 font-semibold text-xs transition-colors shadow-sm cursor-pointer"
            >
              Join Game Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active Online Game Room View
  const orientation = myColor === 'b' ? 'b' : 'w';
  const topColor: PlayerColor = orientation === 'w' ? 'b' : 'w';
  const bottomColor: PlayerColor = orientation === 'w' ? 'w' : 'b';

  const opponentPlayer = orientation === 'w' ? room.blackPlayer : room.whitePlayer;
  const selfPlayer = orientation === 'w' ? room.whitePlayer : room.blackPlayer;

  const historyMoves = chess.history({ verbose: true });
  const moveHistoryItems = buildMoveLog(historyMoves);
  const { whiteCaptured, blackCaptured, whiteAdvantage, blackAdvantage } =
    getCapturedPiecesAndAdvantage(chess);

  const isMyTurn = room.status === 'in_progress' && room.turn === myColor;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start max-w-7xl mx-auto w-full">
      {/* Board & Player Area */}
      <div className="lg:col-span-8 flex flex-col gap-3 max-w-[660px] mx-auto w-full">
        {/* Waiting Room Banner */}
        {room.status === 'waiting' && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="font-bold text-sm block mb-0.5">Waiting for opponent to connect...</span>
                <span>Share this room code with your friend to begin:</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 font-mono font-bold text-sm bg-white dark:bg-slate-900 rounded-lg border border-amber-300 dark:border-amber-700 tracking-wider">
                  {room.code}
                </span>
                <button
                  onClick={handleCopyInviteLink}
                  className="flex items-center gap-1 py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs cursor-pointer shadow-xs"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedLink ? 'Copied' : 'Invite Link'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Draw Offer Notification */}
        {room.drawOfferedBy && room.drawOfferedBy !== myColor && (
          <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <Handshake className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Opponent has offered a draw. Do you accept?</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleRespondDraw(true)}
                className="py-1 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-md cursor-pointer text-xs"
              >
                Accept
              </button>
              <button
                onClick={() => handleRespondDraw(false)}
                className="py-1 px-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-medium rounded-md cursor-pointer text-xs"
              >
                Decline
              </button>
            </div>
          </div>
        )}

        {/* Top Player Card (Opponent) */}
        <PlayerCard
          name={opponentPlayer ? opponentPlayer.name : 'Waiting for Player...'}
          avatar={topColor === 'w' ? '♔' : '♚'}
          color={topColor}
          isTurn={room.status === 'in_progress' && room.turn === topColor}
          timeSeconds={topColor === 'w' ? room.whiteTime : room.blackTime}
          isFlagged={false}
          capturedPieces={topColor === 'w' ? whiteCaptured : blackCaptured}
          materialAdvantage={topColor === 'w' ? whiteAdvantage : blackAdvantage}
        />

        {/* The Board */}
        <ChessBoard
          chess={chess}
          orientation={orientation}
          themeId={settings.boardTheme}
          showLegalMoves={settings.showLegalMoves}
          showCoordinates={settings.showCoordinates}
          lastMove={room.lastMove as { from: Square; to: Square } | null}
          onMove={handleMove}
          isInteractive={isMyTurn}
        />

        {/* Bottom Player Card (Self) */}
        <PlayerCard
          name={selfPlayer ? `${selfPlayer.name} (You)` : 'You'}
          avatar={bottomColor === 'w' ? '♔' : '♚'}
          color={bottomColor}
          isTurn={room.status === 'in_progress' && room.turn === bottomColor}
          timeSeconds={bottomColor === 'w' ? room.whiteTime : room.blackTime}
          isFlagged={false}
          capturedPieces={bottomColor === 'w' ? whiteCaptured : blackCaptured}
          materialAdvantage={bottomColor === 'w' ? whiteAdvantage : blackAdvantage}
        />

        {/* In-Game Action Bar */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Room: <strong className="font-mono text-slate-900 dark:text-white">{room.code}</strong>
            </span>
            <button
              onClick={handleCopyCode}
              className="p-1 rounded text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              title="Copy Room Code"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {room.status === 'finished' ? (
              <button
                onClick={handleRematch}
                className="py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Rematch
              </button>
            ) : (
              <>
                <button
                  onClick={handleOfferDraw}
                  disabled={room.status !== 'in_progress'}
                  className="py-1.5 px-2.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Handshake className="w-3.5 h-3.5" />
                  Offer Draw
                </button>
                <button
                  onClick={handleResign}
                  disabled={room.status !== 'in_progress'}
                  className="py-1.5 px-2.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5" />
                  Resign
                </button>
              </>
            )}
            <button
              onClick={() => setRoom(null)}
              className="py-1.5 px-2.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Leave Room
            </button>
          </div>
        </div>

        {/* Finished Outcome Alert */}
        {room.status === 'finished' && room.result && (
          <div className="p-4 rounded-xl bg-slate-900 text-white text-center animate-in fade-in">
            <h3 className="text-sm font-bold text-amber-400 mb-0.5">Game Concluded</h3>
            <p className="text-xs text-slate-300">{room.result.reason}</p>
          </div>
        )}
      </div>

      {/* Right Column: Move Notation & Live In-Room Chat */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        {/* Moves notation */}
        <div className="h-[260px]">
          <MoveHistory
            history={moveHistoryItems}
            currentMoveIndex={-1}
            onNavigateMove={() => {}}
            fen={room.fen}
            pgn={room.pgn}
          />
        </div>

        {/* Live In-Room Chat */}
        <div className="flex flex-col h-[300px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
              Match Chat
            </span>
            <span className="text-[10px] text-slate-400">
              {room.spectatorCount > 0 ? `${room.spectatorCount} Spectators` : 'Direct Match'}
            </span>
          </div>

          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto p-3 space-y-2 text-xs"
          >
            {room.chatMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-[11px]">
                Say hello or good luck!
              </div>
            ) : (
              room.chatMessages.map((msg, i) => (
                <div key={i} className="flex flex-col">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                      {msg.sender}
                    </span>
                    <span>{msg.time}</span>
                  </div>
                  <div className="text-slate-800 dark:text-slate-200 mt-0.5 break-words">
                    {msg.text}
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSendChat} className="p-2 border-t border-slate-200 dark:border-slate-800 flex gap-1.5 bg-slate-50 dark:bg-slate-900/60">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Send message..."
              maxLength={120}
              className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="p-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
