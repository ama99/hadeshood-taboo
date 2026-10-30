import React, { useEffect, useRef } from 'react';

export interface SplashCursorConfig {
  SIM_RESOLUTION?: number;
  DYE_RESOLUTION?: number;
  DENSITY_DISSIPATION?: number;
  VELOCITY_DISSIPATION?: number;
  PRESSURE?: number;
  PRESSURE_ITERATIONS?: number;
  CURL?: number;
  SPLAT_RADIUS?: number;
  SPLAT_FORCE?: number;
  SHADING?: boolean;
  COLOR_UPDATE_SPEED?: number;
  PAUSED?: boolean;
  BACK_COLOR?: { r: number; g: number; b: number };
  TRANSPARENT?: boolean;
  BLOOM?: boolean;
  BLOOM_ITERATIONS?: number;
  BLOOM_RESOLUTION?: number;
  BLOOM_INTENSITY?: number;
  BLOOM_THRESHOLD?: number;
  BLOOM_SOFT_KNEE?: number;
  CUSTOM_COLOR?: string;
  COLOR_MODE?: string;
  SECONDARY_COLOR?: string;
  COLOR_PALETTE?: string[];
  AUTO_SPLATS?: boolean;
  AUTO_SPLAT_INTERVAL?: number;
  POINTER_HOVER_SPLATS?: boolean;
  GLOBAL_POINTER_TRACKING?: boolean;
  VELOCITY_COLOR_SENSITIVITY?: number;
  DENSITY_COLOR_SENSITIVITY?: number;
  FLOW_BACKGROUND_ENABLED?: boolean;
  FLOW_BACKGROUND_SPEED?: number;
  FLOW_BACKGROUND_FORCE?: number;
  FLOW_BACKGROUND_FAINTNESS?: number;
}

export interface SplashCursorEngineInstance {
  init: (canvas: HTMLCanvasElement, config?: SplashCursorConfig) => boolean;
  updateConfig: (newParams?: Partial<SplashCursorConfig>) => SplashCursorConfig;
  getConfig: () => SplashCursorConfig;
  triggerSplats: (count?: number) => void;
  reset: () => void;
  destroy: () => void;
}

declare global {
  interface Window {
    SplashCursorEngine?: SplashCursorEngineInstance;
  }
}

export const SMOKY_PRESET_CONFIG: SplashCursorConfig = {
  SIM_RESOLUTION: 128,
  DYE_RESOLUTION: 1024,
  DENSITY_DISSIPATION: 2.7,
  VELOCITY_DISSIPATION: 0.25,
  PRESSURE: 0.25,
  PRESSURE_ITERATIONS: 20,
  CURL: 5,
  SPLAT_RADIUS: 0.05,
  SPLAT_FORCE: 9000,
  SHADING: true,
  COLOR_UPDATE_SPEED: 5,
  PAUSED: false,
  BACK_COLOR: {
    r: 5,
    g: 5,
    b: 12,
  },
  TRANSPARENT: true,
  BLOOM: true,
  BLOOM_ITERATIONS: 8,
  BLOOM_RESOLUTION: 256,
  BLOOM_INTENSITY: 2,
  BLOOM_THRESHOLD: 0.5,
  BLOOM_SOFT_KNEE: 0.7,
  CUSTOM_COLOR: '#00f0ff',
  COLOR_MODE: 'density-palette',
  SECONDARY_COLOR: '#ff007f',
  COLOR_PALETTE: ['#ff0000', '#00d4ff', '#00f0ff'],
  AUTO_SPLATS: false,
  AUTO_SPLAT_INTERVAL: 1500,
  POINTER_HOVER_SPLATS: true,
  GLOBAL_POINTER_TRACKING: true,
  VELOCITY_COLOR_SENSITIVITY: 500,
  DENSITY_COLOR_SENSITIVITY: 9,
  FLOW_BACKGROUND_ENABLED: true,
  FLOW_BACKGROUND_SPEED: 0.1,
  FLOW_BACKGROUND_FORCE: 60,
  FLOW_BACKGROUND_FAINTNESS: 0.5,
};

export default function SplashCursorBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let initialized = false;
    let engine: SplashCursorEngineInstance | undefined;

    // @ts-expect-error plain JS WebGL engine module attaching window.SplashCursorEngine
    import('./splash-cursor.js')
      .then(() => {
        engine = window.SplashCursorEngine;
        if (cancelled || !canvasRef.current || !engine) return;
        initialized = engine.init(canvasRef.current, SMOKY_PRESET_CONFIG);
      })
      .catch((error) => {
        console.error('Unable to load SplashCursor:', error);
      });

    return () => {
      cancelled = true;
      if (initialized && engine) {
        engine.destroy();
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    />
  );
}
