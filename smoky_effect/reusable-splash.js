/**
 * Reusable SplashCursor bootstrapper.
 * Load splash-cursor.js first, then include this file to create and start the canvas.
 * 
 * Usage:
 * <script src="reusable-splash.js"></script>
 */

(function () {
  'use strict';

  function startSplashCursor() {
    if (!window.SplashCursorEngine) {
      console.warn('SplashCursorEngine core script missing. Load splash-cursor.js before reusable-splash.js.');
      return;
    }

    let canvas = document.getElementById('splash-cursor-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'splash-cursor-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.cssText = 'position:fixed; inset:0; width:100vw; height:100vh; z-index:-1; pointer-events:none; display:block;';
      document.body.appendChild(canvas);
    }

    const suppliedConfig = window.SPLASH_CURSOR_CONFIG;
    const config = suppliedConfig && typeof suppliedConfig === 'object' && !Array.isArray(suppliedConfig)
      ? suppliedConfig
      : {};
    window.SplashCursorEngine.init(canvas, {
      GLOBAL_POINTER_TRACKING: true,
      ...config,
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startSplashCursor, { once: true });
  } else {
    startSplashCursor();
  }
})();
