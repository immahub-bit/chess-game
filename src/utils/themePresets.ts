import { BoardTheme, BoardThemeId, TimeControl } from '../types/chess';

export const BOARD_THEMES: Record<BoardThemeId, BoardTheme> = {
  wood: {
    id: 'wood',
    name: 'Walnut Classic',
    lightSquare: '#f0d9b5',
    darkSquare: '#b58863',
    highlightMove: 'rgba(247, 209, 84, 0.45)',
    highlightSelected: 'rgba(255, 230, 109, 0.65)',
    border: '#8c6239',
  },
  emerald: {
    id: 'emerald',
    name: 'Tournament Emerald',
    lightSquare: '#ebecd0',
    darkSquare: '#779556',
    highlightMove: 'rgba(247, 247, 105, 0.5)',
    highlightSelected: 'rgba(245, 246, 130, 0.7)',
    border: '#516738',
  },
  slate: {
    id: 'slate',
    name: 'Midnight Slate',
    lightSquare: '#e2e8f0',
    darkSquare: '#64748b',
    highlightMove: 'rgba(56, 189, 248, 0.45)',
    highlightSelected: 'rgba(14, 165, 233, 0.6)',
    border: '#334155',
  },
  ocean: {
    id: 'ocean',
    name: 'Royal Sapphire',
    lightSquare: '#e8edf9',
    darkSquare: '#4b7399',
    highlightMove: 'rgba(96, 165, 250, 0.45)',
    highlightSelected: 'rgba(59, 130, 246, 0.65)',
    border: '#2e4963',
  },
  obsidian: {
    id: 'obsidian',
    name: 'Obsidian & Gold',
    lightSquare: '#e2d6b5',
    darkSquare: '#4a3b32',
    highlightMove: 'rgba(245, 158, 11, 0.45)',
    highlightSelected: 'rgba(251, 191, 36, 0.65)',
    border: '#29201a',
  },
};

export const TIME_CONTROLS: TimeControl[] = [
  { id: 'untimed', name: 'Untimed / Casual', baseSeconds: 0, incrementSeconds: 0 },
  { id: 'bullet1', name: 'Bullet 1m', baseSeconds: 60, incrementSeconds: 0 },
  { id: 'blitz3_2', name: 'Blitz 3m + 2s', baseSeconds: 180, incrementSeconds: 2 },
  { id: 'rapid5_3', name: 'Rapid 5m + 3s', baseSeconds: 300, incrementSeconds: 3 },
  { id: 'rapid10', name: 'Rapid 10m', baseSeconds: 600, incrementSeconds: 0 },
  { id: 'classical15_10', name: 'Classical 15m + 10s', baseSeconds: 900, incrementSeconds: 10 },
];
