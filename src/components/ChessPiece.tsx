import React from 'react';
import { PlayerColor } from '../types/chess';

interface ChessPieceProps {
  type: 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
  color: PlayerColor;
  className?: string;
}

export const ChessPiece: React.FC<ChessPieceProps> = ({ type, color, className = 'w-full h-full' }) => {
  const isWhite = color === 'w';

  // Crisp Staunton piece vectors with detailed shading & highlights
  const pieceColorClass = isWhite ? 'fill-white stroke-slate-900' : 'fill-slate-900 stroke-slate-900';
  const detailColorClass = isWhite ? 'fill-slate-200 stroke-slate-900' : 'fill-slate-800 stroke-white/40';
  const strokeColor = isWhite ? '#1e293b' : '#0f172a';
  const highlightStroke = isWhite ? 'none' : '#94a3b8';

  return (
    <div className={`flex items-center justify-center select-none pointer-events-none transition-transform duration-100 ${className}`}>
      {renderPieceSvg(type, isWhite, pieceColorClass, detailColorClass, strokeColor, highlightStroke)}
    </div>
  );
};

function renderPieceSvg(
  type: string,
  isWhite: boolean,
  _pieceClass: string,
  _detailClass: string,
  _stroke: string,
  _highlight: string
) {
  const filterId = isWhite ? 'whitePieceShadow' : 'blackPieceShadow';

  return (
    <svg
      viewBox="0 0 45 45"
      className="w-full h-full drop-shadow-sm transition-transform active:scale-95"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id={filterId} x="-10%" y="-10%" width="125%" height="125%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1" floodColor="#000" floodOpacity={isWhite ? '0.25' : '0.4'} />
        </filter>
        <linearGradient id="whitePieceGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f1f5f9" />
        </linearGradient>
        <linearGradient id="blackPieceGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>

      <g filter={`url(#${filterId})`}>
        {type === 'p' && (
          isWhite ? (
            <path
              d="m 22.5,9 c -2.21,0 -4,1.79 -4,4 0,0.89 0.29,1.71 0.78,2.38 C 17.33,16.5 16,18.59 16,21 c 0,2.03 0.94,3.84 2.41,5.03 C 15.41,27.09 11,31.58 11,39.5 l 23,0 c 0,-7.92 -4.41,-12.41 -7.41,-13.47 C 28.06,24.84 29,23.03 29,21 29,18.59 27.67,16.5 25.72,15.38 26.21,14.71 26.5,13.89 26.5,13 c 0,-2.21 -1.79,-4 -4,-4 z"
              fill="url(#whitePieceGrad)"
              stroke="#0f172a"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="m 22.5,9 c -2.21,0 -4,1.79 -4,4 0,0.89 0.29,1.71 0.78,2.38 C 17.33,16.5 16,18.59 16,21 c 0,2.03 0.94,3.84 2.41,5.03 C 15.41,27.09 11,31.58 11,39.5 l 23,0 c 0,-7.92 -4.41,-12.41 -7.41,-13.47 C 28.06,24.84 29,23.03 29,21 29,18.59 27.67,16.5 25.72,15.38 26.21,14.71 26.5,13.89 26.5,13 c 0,-2.21 -1.79,-4 -4,-4 z"
              fill="url(#blackPieceGrad)"
              stroke="#000000"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          )
        )}

        {type === 'r' && (
          isWhite ? (
            <g fill="url(#whitePieceGrad)" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M 9,39 L 36,39 L 36,36 L 9,36 L 9,39 z" />
              <path d="M 12,36 L 12,32 L 33,32 L 33,36 L 12,36 z" />
              <path d="M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14" />
              <path d="M 34,14 L 31,17 L 14,17 L 11,14" />
              <path d="M 31,17 L 31,29.5 L 14,29.5 L 14,17" />
              <path d="M 31,29.5 L 32.5,32 L 12.5,32 L 14,29.5" />
              <path d="M 11,14 L 34,14" strokeWidth="1" />
            </g>
          ) : (
            <g fill="url(#blackPieceGrad)" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M 9,39 L 36,39 L 36,36 L 9,36 L 9,39 z" />
              <path d="M 12,36 L 12,32 L 33,32 L 33,36 L 12,36 z" />
              <path d="M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14" />
              <path d="M 34,14 L 31,17 L 14,17 L 11,14" />
              <path d="M 31,17 L 31,29.5 L 14,29.5 L 14,17" />
              <path d="M 31,29.5 L 32.5,32 L 12.5,32 L 14,29.5" />
              <path d="M 12,35.5 L 33,35.5" stroke="#94a3b8" strokeWidth="1" />
              <path d="M 13,31.5 L 32,31.5" stroke="#94a3b8" strokeWidth="1" />
              <path d="M 14,16.5 L 31,16.5" stroke="#94a3b8" strokeWidth="1" />
            </g>
          )
        )}

        {type === 'n' && (
          isWhite ? (
            <g fill="url(#whitePieceGrad)" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18" />
              <path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,7.4 17.5,6.5 17.5,6.5 C 17.5,6.5 19.5,8.5 22,10 z" />
              <circle cx="15" cy="14" r="1.5" fill="#0f172a" stroke="none" />
              <path d="M 9.5 25.5 A 0.5 0.5 0 1 1 8.5 25.5 A 0.5 0.5 0 1 1 9.5 25.5 z" fill="#0f172a" stroke="none" />
            </g>
          ) : (
            <g fill="url(#blackPieceGrad)" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18" />
              <path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,7.4 17.5,6.5 17.5,6.5 C 17.5,6.5 19.5,8.5 22,10 z" />
              <circle cx="15" cy="14" r="1.5" fill="#ffffff" stroke="none" />
              <path d="M 9.5 25.5 A 0.5 0.5 0 1 1 8.5 25.5 A 0.5 0.5 0 1 1 9.5 25.5 z" fill="#ffffff" stroke="none" />
            </g>
          )
        )}

        {type === 'b' && (
          isWhite ? (
            <g fill="url(#whitePieceGrad)" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M 9,36 C 12.39,35.03 19.11,36.43 22.5,34 C 25.89,36.43 32.61,35.03 36,36 C 36,36 37.65,36.54 39,38 C 38.32,38.97 37.35,38.99 36,38.5 C 32.61,37.53 25.89,38.96 22.5,37.5 C 19.11,38.96 12.39,37.53 9,38.5 C 7.646,38.99 6.677,38.97 6,38 C 7.354,36.54 9,36 9,36 z" />
              <path d="M 12,36 C 11.27,34.8 11.08,31.78 12.5,29.5 C 14.5,26.5 16.5,23.5 17.5,19 C 15.5,15.5 17,9.5 22.5,9 C 28,9.5 29.5,15.5 27.5,19 C 28.5,23.5 30.5,26.5 32.5,29.5 C 33.92,31.78 33.73,34.8 33,36 L 12,36 z" />
              <path d="M 17.5,26 L 27.5,26 M 15,30 L 30,30 M 22.5,15.5 L 22.5,20.5 M 20,18 L 25,18" strokeWidth="1" />
              <circle cx="22.5" cy="8" r="1.5" fill="#0f172a" stroke="none" />
            </g>
          ) : (
            <g fill="url(#blackPieceGrad)" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M 9,36 C 12.39,35.03 19.11,36.43 22.5,34 C 25.89,36.43 32.61,35.03 36,36 C 36,36 37.65,36.54 39,38 C 38.32,38.97 37.35,38.99 36,38.5 C 32.61,37.53 25.89,38.96 22.5,37.5 C 19.11,38.96 12.39,37.53 9,38.5 C 7.646,38.99 6.677,38.97 6,38 C 7.354,36.54 9,36 9,36 z" />
              <path d="M 12,36 C 11.27,34.8 11.08,31.78 12.5,29.5 C 14.5,26.5 16.5,23.5 17.5,19 C 15.5,15.5 17,9.5 22.5,9 C 28,9.5 29.5,15.5 27.5,19 C 28.5,23.5 30.5,26.5 32.5,29.5 C 33.92,31.78 33.73,34.8 33,36 L 12,36 z" />
              <path d="M 17.5,26 L 27.5,26 M 15,30 L 30,30 M 22.5,15.5 L 22.5,20.5 M 20,18 L 25,18" stroke="#94a3b8" strokeWidth="1" />
              <circle cx="22.5" cy="8" r="1.5" fill="#ffffff" stroke="none" />
            </g>
          )
        )}

        {type === 'q' && (
          isWhite ? (
            <g fill="url(#whitePieceGrad)" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M 8 12 A 2 2 0 1 1 4 12 A 2 2 0 1 1 8 12 z M 17.25 9 A 2 2 0 1 1 13.25 9 A 2 2 0 1 1 17.25 9 z M 24.5 7.5 A 2 2 0 1 1 20.5 7.5 A 2 2 0 1 1 24.5 7.5 z M 31.75 9 A 2 2 0 1 1 27.75 9 A 2 2 0 1 1 31.75 9 z M 41 12 A 2 2 0 1 1 37 12 A 2 2 0 1 1 41 12 z" />
              <path d="M 9 26 C 17.5 24.5 30 24.5 36 26 L 38 14 L 31 25 L 22.5 12 L 14 25 L 7 14 L 9 26 z" />
              <path d="M 9 26 C 9 28 10.5 28 11.5 30 C 12.5 31.5 12.5 31 12 33.5 C 10.5 34.5 10.5 36 10 39 L 35 39 C 34.5 36 34.5 34.5 33 33.5 C 32.5 31 32.5 31.5 33.5 30 C 34.5 28 36 28 36 26 C 27.5 24.5 17.5 24.5 9 26 z" />
              <path d="M 11 38.5 A 35 35 1 0 0 34 38.5" fill="none" strokeWidth="1" />
              <path d="M 11 29 A 35 35 1 0 1 34 29" fill="none" strokeWidth="1" />
              <path d="M 12.5 31.5 A 35 35 1 0 1 32.5 31.5" fill="none" strokeWidth="1" />
              <path d="M 11.5 34.5 A 35 35 1 0 1 33.5 34.5" fill="none" strokeWidth="1" />
            </g>
          ) : (
            <g fill="url(#blackPieceGrad)" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M 8 12 A 2 2 0 1 1 4 12 A 2 2 0 1 1 8 12 z M 17.25 9 A 2 2 0 1 1 13.25 9 A 2 2 0 1 1 17.25 9 z M 24.5 7.5 A 2 2 0 1 1 20.5 7.5 A 2 2 0 1 1 24.5 7.5 z M 31.75 9 A 2 2 0 1 1 27.75 9 A 2 2 0 1 1 31.75 9 z M 41 12 A 2 2 0 1 1 37 12 A 2 2 0 1 1 41 12 z" />
              <path d="M 9 26 C 17.5 24.5 30 24.5 36 26 L 38 14 L 31 25 L 22.5 12 L 14 25 L 7 14 L 9 26 z" />
              <path d="M 9 26 C 9 28 10.5 28 11.5 30 C 12.5 31.5 12.5 31 12 33.5 C 10.5 34.5 10.5 36 10 39 L 35 39 C 34.5 36 34.5 34.5 33 33.5 C 32.5 31 32.5 31.5 33.5 30 C 34.5 28 36 28 36 26 C 27.5 24.5 17.5 24.5 9 26 z" />
              <path d="M 11 38.5 A 35 35 1 0 0 34 38.5" fill="none" stroke="#94a3b8" strokeWidth="1" />
              <path d="M 11 29 A 35 35 1 0 1 34 29" fill="none" stroke="#94a3b8" strokeWidth="1" />
              <path d="M 12.5 31.5 A 35 35 1 0 1 32.5 31.5" fill="none" stroke="#94a3b8" strokeWidth="1" />
              <path d="M 11.5 34.5 A 35 35 1 0 1 33.5 34.5" fill="none" stroke="#94a3b8" strokeWidth="1" />
            </g>
          )
        )}

        {type === 'k' && (
          isWhite ? (
            <g fill="url(#whitePieceGrad)" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              {/* Crown cross */}
              <path d="M 22.5,11.63 L 22.5,6" strokeWidth="1.5" />
              <path d="M 20,8 L 25,8" strokeWidth="1.5" />
              <path d="M 22.5,25 C 22.5,25 27,17.5 25.5,14.5 C 24,11.5 21,11.5 22.5,11.5 C 24,11.5 21,11.5 19.5,14.5 C 18,17.5 22.5,25 22.5,25" />
              <path d="M 11.5,37 C 17,40.5 28,40.5 33.5,37 C 36.5,31 36.5,24.5 31.5,23 C 27.5,21.5 25.5,24.5 22.5,24.5 C 19.5,24.5 17.5,21.5 13.5,23 C 8.5,24.5 8.5,31 11.5,37 z" />
              <path d="M 11.5,30 C 17,27 28,27 33.5,30" strokeWidth="1" />
              <path d="M 11.5,33.5 C 17,30.5 28,30.5 33.5,33.5" strokeWidth="1" />
              <path d="M 11.5,37 C 17,34 28,34 33.5,37" strokeWidth="1" />
            </g>
          ) : (
            <g fill="url(#blackPieceGrad)" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              {/* Crown cross */}
              <path d="M 22.5,11.63 L 22.5,6" stroke="#94a3b8" strokeWidth="1.5" />
              <path d="M 20,8 L 25,8" stroke="#94a3b8" strokeWidth="1.5" />
              <path d="M 22.5,25 C 22.5,25 27,17.5 25.5,14.5 C 24,11.5 21,11.5 22.5,11.5 C 24,11.5 21,11.5 19.5,14.5 C 18,17.5 22.5,25 22.5,25" />
              <path d="M 11.5,37 C 17,40.5 28,40.5 33.5,37 C 36.5,31 36.5,24.5 31.5,23 C 27.5,21.5 25.5,24.5 22.5,24.5 C 19.5,24.5 17.5,21.5 13.5,23 C 8.5,24.5 8.5,31 11.5,37 z" />
              <path d="M 11.5,30 C 17,27 28,27 33.5,30" stroke="#94a3b8" strokeWidth="1" />
              <path d="M 11.5,33.5 C 17,30.5 28,30.5 33.5,33.5" stroke="#94a3b8" strokeWidth="1" />
              <path d="M 11.5,37 C 17,34 28,34 33.5,37" stroke="#94a3b8" strokeWidth="1" />
            </g>
          )
        )}
      </g>
    </svg>
  );
}
