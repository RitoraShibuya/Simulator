/**
 * BS Simulator - Viewport (1414x1000 Virtual Space Fitting)
 * Responsive aspect-ratio preservation with scale fitting.
 * Removed global rotate(180deg) to ensure independent perspective rendering for both 1P and 2P.
 */

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { BOARD_HEIGHT, BOARD_WIDTH } from '../board';

interface ViewportContextType {
  clientToVirtual: (clientX: number, clientY: number) => { x: number; y: number };
  scale: number;
}

const ViewportContext = createContext<ViewportContextType>({
  clientToVirtual: (x, y) => ({ x, y }),
  scale: 1,
});

export const useViewport = () => useContext(ViewportContext);

interface ViewportProps {
  children: React.ReactNode;
}

export const Viewport: React.FC<ViewportProps> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);

  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      // NaN / 0除算防止: 幅や高さが0のときはスキップ
      if (!clientWidth || !clientHeight) return;
      // 盤面の一辺を常に利用可能な幅・高さの小さい方へ合わせる（object-fit: contain相当）。
      const availableWidth = Math.min(window.innerWidth, clientWidth);
      const availableHeight = Math.min(window.innerHeight, clientHeight);
      const calculatedScale = Math.min(availableWidth / BOARD_WIDTH, availableHeight / BOARD_HEIGHT);
      // isFiniteチェックでNaNとInfinityを確実に遮断
      const safeScale = Number.isFinite(calculatedScale) ? Math.max(0.01, calculatedScale) : 1;
      setScale(safeScale);
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    const observer = new ResizeObserver(updateDimensions);
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      window.removeEventListener('resize', updateDimensions);
      observer.disconnect();
    };
  }, []);

  const clientToVirtual = (clientX: number, clientY: number): { x: number; y: number } => {
    if (!boardRef.current) return { x: BOARD_WIDTH / 2, y: BOARD_HEIGHT / 2 };
    const rect = boardRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return { x: BOARD_WIDTH / 2, y: BOARD_HEIGHT / 2 };

    const vx = Math.max(0, Math.min(BOARD_WIDTH, ((clientX - rect.left) / rect.width) * BOARD_WIDTH));
    const vy = Math.max(0, Math.min(BOARD_HEIGHT, ((clientY - rect.top) / rect.height) * BOARD_HEIGHT));

    return {
      x: Math.round(vx),
      y: Math.round(vy),
    };
  };

  return (
    <ViewportContext.Provider value={{ clientToVirtual, scale }}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '100vw',
          maxHeight: '100vh',
          minWidth: 0,
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0d1117',
          position: 'relative',
        }}
      >
        <div
          ref={boardRef}
          id="virtual-board"
          style={{
            width: `${BOARD_WIDTH}px`,
            height: `${BOARD_HEIGHT}px`,
            flex: `0 0 ${BOARD_WIDTH}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            position: 'relative',
            boxShadow: '0 0 50px rgba(0, 0, 0, 0.8)',
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: '#161b22',
            userSelect: 'none',
            touchAction: 'none',
          }}
        >
          {children}
        </div>
      </div>
    </ViewportContext.Provider>
  );
};
