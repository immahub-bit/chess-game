import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { Chess } from 'chess.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

interface PlayerSlot {
  id: string;
  name: string;
  ws?: WebSocket;
}

interface RoomState {
  code: string;
  chess: Chess;
  whitePlayer: PlayerSlot | null;
  blackPlayer: PlayerSlot | null;
  spectators: PlayerSlot[];
  timeControl: { baseSeconds: number; incrementSeconds: number };
  whiteTime: number;
  blackTime: number;
  lastMoveTimestamp: number | null;
  status: 'waiting' | 'in_progress' | 'finished';
  result?: {
    winner: 'w' | 'b' | 'draw' | null;
    reason: string;
  };
  drawOfferedBy: 'w' | 'b' | null;
  lastMove: { from: string; to: string } | null;
  chatMessages: { sender: string; text: string; time: string }[];
}

const rooms = new Map<string, RoomState>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function serializeRoom(room: RoomState) {
  return {
    code: room.code,
    fen: room.chess.fen(),
    pgn: room.chess.pgn(),
    turn: room.chess.turn(),
    history: room.chess.history({ verbose: true }),
    isCheck: room.chess.inCheck(),
    isGameOver: room.chess.isGameOver(),
    whitePlayer: room.whitePlayer ? { id: room.whitePlayer.id, name: room.whitePlayer.name } : null,
    blackPlayer: room.blackPlayer ? { id: room.blackPlayer.id, name: room.blackPlayer.name } : null,
    spectatorCount: room.spectators.length,
    timeControl: room.timeControl,
    whiteTime: room.whiteTime,
    blackTime: room.blackTime,
    status: room.status,
    result: room.result,
    drawOfferedBy: room.drawOfferedBy,
    lastMove: room.lastMove,
    chatMessages: room.chatMessages.slice(-30),
  };
}

function broadcastToRoom(room: RoomState, message: object) {
  const data = JSON.stringify(message);
  const clients = [
    room.whitePlayer?.ws,
    room.blackPlayer?.ws,
    ...room.spectators.map((s) => s.ws),
  ];

  clients.forEach((ws) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

// Periodic timer ticker for active games
setInterval(() => {
  const now = Date.now();
  rooms.forEach((room) => {
    if (room.status === 'in_progress' && room.timeControl.baseSeconds > 0 && room.lastMoveTimestamp) {
      const elapsed = Math.floor((now - room.lastMoveTimestamp) / 1000);
      const turn = room.chess.turn();

      if (turn === 'w') {
        const remaining = Math.max(0, room.whiteTime - elapsed);
        if (remaining <= 0) {
          room.status = 'finished';
          room.result = { winner: 'b', reason: 'Black won on time (White flagged)' };
          broadcastToRoom(room, { type: 'room_update', room: serializeRoom(room) });
        }
      } else {
        const remaining = Math.max(0, room.blackTime - elapsed);
        if (remaining <= 0) {
          room.status = 'finished';
          room.result = { winner: 'w', reason: 'White won on time (Black flagged)' };
          broadcastToRoom(room, { type: 'room_update', room: serializeRoom(room) });
        }
      }
    }
  });
}, 1000);

// WebSocket event handling
wss.on('connection', (ws: WebSocket) => {
  let currentRoomCode: string | null = null;
  let playerId: string | null = null;

  ws.on('message', (messageData: string) => {
    try {
      const data = JSON.parse(messageData.toString());

      if (data.type === 'create_room') {
        const code = generateRoomCode();
        const baseSeconds = data.baseSeconds ?? 300;
        const incrementSeconds = data.incrementSeconds ?? 3;
        const playerName = data.playerName || 'Guest Player';
        const assignedPlayerId: string = data.playerId || `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        playerId = assignedPlayerId;
        currentRoomCode = code;

        const newRoom: RoomState = {
          code,
          chess: new Chess(),
          whitePlayer: null,
          blackPlayer: null,
          spectators: [],
          timeControl: { baseSeconds, incrementSeconds },
          whiteTime: baseSeconds,
          blackTime: baseSeconds,
          lastMoveTimestamp: null,
          status: 'waiting',
          drawOfferedBy: null,
          lastMove: null,
          chatMessages: [],
        };

        const preferredColor = data.preferredColor || 'w';
        const playerSlot: PlayerSlot = { id: assignedPlayerId, name: playerName, ws };

        if (preferredColor === 'b') {
          newRoom.blackPlayer = playerSlot;
        } else if (preferredColor === 'random') {
          if (Math.random() > 0.5) newRoom.whitePlayer = playerSlot;
          else newRoom.blackPlayer = playerSlot;
        } else {
          newRoom.whitePlayer = playerSlot;
        }

        rooms.set(code, newRoom);

        ws.send(
          JSON.stringify({
            type: 'room_created',
            roomCode: code,
            yourPlayerId: assignedPlayerId,
            yourColor: newRoom.whitePlayer?.id === assignedPlayerId ? 'w' : 'b',
            room: serializeRoom(newRoom),
          })
        );
      }

      if (data.type === 'join_room') {
        const code = (data.roomCode || '').toUpperCase().trim();
        const room = rooms.get(code);

        if (!room) {
          ws.send(JSON.stringify({ type: 'error', message: 'Room not found. Check the code.' }));
          return;
        }

        const playerName = data.playerName || 'Guest Challenger';
        const assignedPlayerId: string = data.playerId || `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        playerId = assignedPlayerId;
        currentRoomCode = code;

        let assignedColor: 'w' | 'b' | 'spectator' = 'spectator';
        const playerSlot: PlayerSlot = { id: assignedPlayerId, name: playerName, ws };

        // Reconnection check: if player was already in room
        if (room.whitePlayer && room.whitePlayer.id === playerId) {
          room.whitePlayer.ws = ws;
          assignedColor = 'w';
        } else if (room.blackPlayer && room.blackPlayer.id === playerId) {
          room.blackPlayer.ws = ws;
          assignedColor = 'b';
        } else if (!room.whitePlayer) {
          room.whitePlayer = playerSlot;
          assignedColor = 'w';
        } else if (!room.blackPlayer) {
          room.blackPlayer = playerSlot;
          assignedColor = 'b';
        } else {
          room.spectators.push(playerSlot);
          assignedColor = 'spectator';
        }

        // Start game if both players are present
        if (room.whitePlayer && room.blackPlayer && room.status === 'waiting') {
          room.status = 'in_progress';
          room.lastMoveTimestamp = Date.now();
        }

        ws.send(
          JSON.stringify({
            type: 'room_joined',
            roomCode: code,
            yourPlayerId: playerId,
            yourColor: assignedColor,
            room: serializeRoom(room),
          })
        );

        broadcastToRoom(room, { type: 'room_update', room: serializeRoom(room) });
      }

      if (data.type === 'make_move') {
        const code = currentRoomCode || data.roomCode;
        const room = rooms.get(code);
        if (!room || room.status !== 'in_progress') return;

        const turn = room.chess.turn();
        const isWhite = room.whitePlayer?.id === playerId;
        const isBlack = room.blackPlayer?.id === playerId;

        if ((turn === 'w' && !isWhite) || (turn === 'b' && !isBlack)) {
          ws.send(JSON.stringify({ type: 'error', message: "It is not your turn!" }));
          return;
        }

        try {
          const move = room.chess.move({
            from: data.from,
            to: data.to,
            promotion: data.promotion || 'q',
          });

          if (!move) {
            ws.send(JSON.stringify({ type: 'error', message: 'Illegal move.' }));
            return;
          }

          // Deduct elapsed time and add increment
          const now = Date.now();
          if (room.lastMoveTimestamp && room.timeControl.baseSeconds > 0) {
            const elapsed = Math.floor((now - room.lastMoveTimestamp) / 1000);
            if (turn === 'w') {
              room.whiteTime = Math.max(0, room.whiteTime - elapsed) + room.timeControl.incrementSeconds;
            } else {
              room.blackTime = Math.max(0, room.blackTime - elapsed) + room.timeControl.incrementSeconds;
            }
          }
          room.lastMoveTimestamp = now;
          room.lastMove = { from: data.from, to: data.to };
          room.drawOfferedBy = null; // Clear active draw offer on move

          // Check game over
          if (room.chess.isGameOver()) {
            room.status = 'finished';
            if (room.chess.isCheckmate()) {
              const winner = turn; // player who just moved delivered mate
              room.result = {
                winner,
                reason: `Checkmate! ${winner === 'w' ? 'White' : 'Black'} wins!`,
              };
            } else if (room.chess.isDraw()) {
              let reason = 'Draw';
              if (room.chess.isStalemate()) reason = 'Draw by Stalemate';
              else if (room.chess.isThreefoldRepetition()) reason = 'Draw by Threefold Repetition';
              else if (room.chess.isInsufficientMaterial()) reason = 'Draw by Insufficient Material';
              else reason = 'Draw by 50-move rule';
              room.result = { winner: 'draw', reason };
            }
          }

          broadcastToRoom(room, {
            type: 'move_made',
            move,
            room: serializeRoom(room),
          });
        } catch {
          ws.send(JSON.stringify({ type: 'error', message: 'Move failed.' }));
        }
      }

      if (data.type === 'offer_draw') {
        const code = currentRoomCode || data.roomCode;
        const room = rooms.get(code);
        if (!room || room.status !== 'in_progress') return;

        const playerColor = room.whitePlayer?.id === playerId ? 'w' : room.blackPlayer?.id === playerId ? 'b' : null;
        if (!playerColor) return;

        room.drawOfferedBy = playerColor;
        broadcastToRoom(room, {
          type: 'draw_offered',
          byColor: playerColor,
          room: serializeRoom(room),
        });
      }

      if (data.type === 'respond_draw') {
        const code = currentRoomCode || data.roomCode;
        const room = rooms.get(code);
        if (!room || room.status !== 'in_progress') return;

        if (data.accept) {
          room.status = 'finished';
          room.result = { winner: 'draw', reason: 'Draw agreed by mutual agreement' };
          room.drawOfferedBy = null;
        } else {
          room.drawOfferedBy = null;
        }
        broadcastToRoom(room, { type: 'room_update', room: serializeRoom(room) });
      }

      if (data.type === 'resign') {
        const code = currentRoomCode || data.roomCode;
        const room = rooms.get(code);
        if (!room || room.status !== 'in_progress') return;

        const isWhite = room.whitePlayer?.id === playerId;
        const isBlack = room.blackPlayer?.id === playerId;
        if (!isWhite && !isBlack) return;

        room.status = 'finished';
        const winner = isWhite ? 'b' : 'w';
        room.result = {
          winner,
          reason: `${isWhite ? 'White' : 'Black'} resigned. ${winner === 'w' ? 'White' : 'Black'} wins!`,
        };
        broadcastToRoom(room, { type: 'room_update', room: serializeRoom(room) });
      }

      if (data.type === 'send_chat') {
        const code = currentRoomCode || data.roomCode;
        const room = rooms.get(code);
        if (!room) return;

        const senderName =
          room.whitePlayer?.id === playerId
            ? `${room.whitePlayer.name} (White)`
            : room.blackPlayer?.id === playerId
            ? `${room.blackPlayer.name} (Black)`
            : 'Spectator';

        const text = String(data.text || '').slice(0, 160).trim();
        if (text) {
          const msg = {
            sender: senderName,
            text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          room.chatMessages.push(msg);
          broadcastToRoom(room, { type: 'chat_message', message: msg });
        }
      }

      if (data.type === 'rematch') {
        const code = currentRoomCode || data.roomCode;
        const room = rooms.get(code);
        if (!room || room.status !== 'finished') return;

        // Swap colors for rematch
        const prevWhite = room.whitePlayer;
        const prevBlack = room.blackPlayer;
        room.whitePlayer = prevBlack;
        room.blackPlayer = prevWhite;

        room.chess = new Chess();
        room.status = 'in_progress';
        room.whiteTime = room.timeControl.baseSeconds;
        room.blackTime = room.timeControl.baseSeconds;
        room.lastMoveTimestamp = Date.now();
        room.lastMove = null;
        room.result = undefined;
        room.drawOfferedBy = null;

        broadcastToRoom(room, { type: 'room_update', room: serializeRoom(room) });
      }
    } catch (err) {
      console.error('WebSocket message parsing error:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoomCode) {
      const room = rooms.get(currentRoomCode);
      if (room) {
        broadcastToRoom(room, { type: 'player_disconnected', playerId });
      }
    }
  });
});

// REST API
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', activeRooms: rooms.size });
});

// Vite Middleware mounting in development, or static in production
const isProduction = process.env.NODE_ENV === 'production';

async function setupServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Grandmaster Chess server running on http://0.0.0.0:${PORT}`);
  });
}

setupServer();
