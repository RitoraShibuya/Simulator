/**
 * BS Simulator - Viewport (1000x1000 Virtual Space Fitting)
 * Responsive aspect-ratio preservation with scale fitting.
 * Removed global rotate(180deg) to ensure independent perspective rendering for both 1P and 2P.
 */

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

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
      const calculatedScale = Math.min(clientWidth / 1000, clientHeight / 1000);
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
    if (!boardRef.current) return { x: 500, y: 500 };
    const rect = boardRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return { x: 500, y: 500 };

    const vx = Math.max(0, Math.min(1000, ((clientX - rect.left) / rect.width) * 1000));
    const vy = Math.max(0, Math.min(1000, ((clientY - rect.top) / rect.height) * 1000));

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
            width: '1000px',
            height: '1000px',
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
