export type GameMode = 'ai' | 'multiplayer' | 'tutorials' | 'pass-and-play' | 'puzzles' | 'analysis';

export type PlayerColor = 'w' | 'b';

export type BotDifficulty = 'beginner' | 'casual' | 'intermediate' | 'advanced' | 'master' | 'grandmaster';

export interface BotProfile {
  id: BotDifficulty;
  name: string;
  title: string;
  rating: number;
  avatar: string;
  depth: number;
  description: string;
}

export type BoardThemeId = 'wood' | 'emerald' | 'slate' | 'ocean' | 'obsidian';

export interface BoardTheme {
  id: BoardThemeId;
  name: string;
  lightSquare: string;
  darkSquare: string;
  highlightMove: string;
  highlightSelected: string;
  border: string;
}

export interface TimeControl {
  id: string;
  name: string;
  baseSeconds: number;
  incrementSeconds: number;
}

export interface Puzzle {
  id: string;
  title: string;
  fen: string;
  playerColor: PlayerColor;
  moves: string[]; // UCI or SAN move sequence
  rating: number;
  theme: string;
  description: string;
  hint: string;
}

export interface MoveLogItem {
  moveNumber: number;
  white?: {
    san: string;
    from: string;
    to: string;
    fen: string;
    captured?: string;
  };
  black?: {
    san: string;
    from: string;
    to: string;
    fen: string;
    captured?: string;
  };
}

export interface GameSettings {
  boardTheme: BoardThemeId;
  soundEnabled: boolean;
  showLegalMoves: boolean;
  showCoordinates: boolean;
  autoFlipPassAndPlay: boolean;
  showEvalBar: boolean;
  timeControl: TimeControl;
}
