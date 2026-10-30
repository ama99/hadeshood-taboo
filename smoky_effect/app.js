/**
 * SplashCursor Studio Application UI Controller
 */
(function () {
  'use strict';

  // Built-in presets collection
  const BUILTIN_PRESETS = {
    'neon-aurora': {
      name: '🌈 Neon Aurora',
      SIM_RESOLUTION: 128,
      DYE_RESOLUTION: 1024,
      DENSITY_DISSIPATION: 1.0,
      VELOCITY_DISSIPATION: 0.2,
      PRESSURE: 0.8,
      CURL: 30,
      SPLAT_RADIUS: 0.25,
      SPLAT_FORCE: 6000,
      SHADING: true,
      COLOR_MODE: 'rainbow',
      CUSTOM_COLOR: '#00f0ff',
      SECONDARY_COLOR: '#ff007f',
      COLOR_UPDATE_SPEED: 10,
      BLOOM: true,
      BLOOM_INTENSITY: 0.8,
      BLOOM_THRESHOLD: 0.6,
      BACK_COLOR: { r: 5, g: 5, b: 12 },
      TRANSPARENT: false,
      AUTO_SPLATS: false,
    },
    'cyber-punk': {
      name: '⚡ Cyber Fire',
      SIM_RESOLUTION: 128,
      DYE_RESOLUTION: 1024,
      DENSITY_DISSIPATION: 0.8,
      VELOCITY_DISSIPATION: 0.3,
      PRESSURE: 0.9,
      CURL: 45,
      SPLAT_RADIUS: 0.35,
      SPLAT_FORCE: 9000,
      SHADING: true,
      COLOR_MODE: 'dual',
      CUSTOM_COLOR: '#00f0ff',
      SECONDARY_COLOR: '#ff0055',
      COLOR_UPDATE_SPEED: 20,
      BLOOM: true,
      BLOOM_INTENSITY: 1.2,
      BLOOM_THRESHOLD: 0.4,
      BACK_COLOR: { r: 3, g: 3, b: 10 },
      TRANSPARENT: false,
      AUTO_SPLATS: false,
    },
    'ink-smoke': {
      name: '🖤 Ink & Smoke',
      SIM_RESOLUTION: 128,
      DYE_RESOLUTION: 1024,
      DENSITY_DISSIPATION: 0.5,
      VELOCITY_DISSIPATION: 0.15,
      PRESSURE: 0.7,
      CURL: 25,
      SPLAT_RADIUS: 0.2,
      SPLAT_FORCE: 4000,
      SHADING: false,
      COLOR_MODE: 'single',
      CUSTOM_COLOR: '#ffffff',
      SECONDARY_COLOR: '#888888',
      COLOR_UPDATE_SPEED: 5,
      BLOOM: true,
      BLOOM_INTENSITY: 0.4,
      BLOOM_THRESHOLD: 0.7,
      BACK_COLOR: { r: 10, g: 12, b: 16 },
      TRANSPARENT: false,
      AUTO_SPLATS: false,
    },
    'golden-sun': {
      name: '🔥 Liquid Gold',
      SIM_RESOLUTION: 128,
      DYE_RESOLUTION: 1024,
      DENSITY_DISSIPATION: 1.2,
      VELOCITY_DISSIPATION: 0.2,
      PRESSURE: 0.85,
      CURL: 30,
      SPLAT_RADIUS: 0.3,
      SPLAT_FORCE: 7000,
      SHADING: true,
      COLOR_MODE: 'dual',
      CUSTOM_COLOR: '#ffaa00',
      SECONDARY_COLOR: '#ff3300',
      COLOR_UPDATE_SPEED: 8,
      BLOOM: true,
      BLOOM_INTENSITY: 1.0,
      BLOOM_THRESHOLD: 0.5,
      BACK_COLOR: { r: 12, g: 6, b: 4 },
      TRANSPARENT: false,
      AUTO_SPLATS: false,
    },
    'deep-ocean': {
      name: '💧 Deep Ocean',
      SIM_RESOLUTION: 128,
      DYE_RESOLUTION: 1024,
      DENSITY_DISSIPATION: 0.6,
      VELOCITY_DISSIPATION: 0.15,
      PRESSURE: 0.75,
      CURL: 20,
      SPLAT_RADIUS: 0.28,
      SPLAT_FORCE: 5000,
      SHADING: true,
      COLOR_MODE: 'dual',
      CUSTOM_COLOR: '#00d2ff',
      SECONDARY_COLOR: '#0033aa',
      COLOR_UPDATE_SPEED: 6,
      BLOOM: true,
      BLOOM_INTENSITY: 0.6,
      BLOOM_THRESHOLD: 0.6,
      BACK_COLOR: { r: 2, g: 10, b: 24 },
      TRANSPARENT: false,
      AUTO_SPLATS: false,
    }
  };

  const PRESET_STORAGE_KEY = 'splash_cursor_presets';
  let savedPresets = {};

  // Load saved user presets from LocalStorage
  function loadUserPresets() {
    try {
      const data = localStorage.getItem(PRESET_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        savedPresets = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
          ? parsed
          : {};
      }
    } catch (e) {
      savedPresets = {};
      console.warn('LocalStorage unavailable for saved presets');
    }
  }

  function saveUserPresets() {
    try {
      localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(savedPresets));
    } catch (e) {
      console.warn('Failed to save to LocalStorage');
    }
  }

  // DOM Elements
  let canvasElement;
  let initialStudioConfig;

  document.addEventListener('DOMContentLoaded', () => {
    canvasElement = document.getElementById('fluid-canvas');
    loadUserPresets();

    // Initialize Splash Cursor with default settings
    if (!window.SplashCursorEngine || !SplashCursorEngine.init(canvasElement, BUILTIN_PRESETS['neon-aurora'])) {
      document.body.classList.add('webgl-unavailable');
      showToast('WebGL could not start. Try enabling hardware acceleration.');
      return;
    }
    initialStudioConfig = SplashCursorEngine.getConfig();

    setupUIEvents();
    renderPresetCards();
    document.querySelector('.preset-card[data-id="neon-aurora"]')?.classList.add('active');
    syncUIWithEngine();
  });

  function setupUIEvents() {
    // Tab Switching (only sidebar panel tabs, not code export tabs)
    document.querySelectorAll('.panel-tabs .tab-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.panel-tabs .tab-btn').forEach((tabButton) => {
          tabButton.classList.remove('active');
          tabButton.setAttribute('aria-selected', 'false');
        });
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        const targetTab = btn.getAttribute('data-tab');
        document.getElementById(`tab-${targetTab}`).classList.add('active');
      });
    });

    // Control Sliders and Inputs Binding
    bindSlider('curl-slider', 'curl-val', 'CURL', (v) => parseFloat(v));
    bindSlider('dissipation-slider', 'dissipation-val', 'DENSITY_DISSIPATION', (v) => parseFloat(v));
    bindSlider('velocity-diss-slider', 'velocity-diss-val', 'VELOCITY_DISSIPATION', (v) => parseFloat(v));
    bindSlider('radius-slider', 'radius-val', 'SPLAT_RADIUS', (v) => parseFloat(v));
    bindSlider('force-slider', 'force-val', 'SPLAT_FORCE', (v) => parseFloat(v));
    bindSlider('pressure-slider', 'pressure-val', 'PRESSURE', (v) => parseFloat(v));
    bindSlider('color-speed-slider', 'color-speed-val', 'COLOR_UPDATE_SPEED', (v) => parseFloat(v));
    bindSlider('bloom-intensity-slider', 'bloom-intensity-val', 'BLOOM_INTENSITY', parseFloat);
    bindSlider('bloom-threshold-slider', 'bloom-threshold-val', 'BLOOM_THRESHOLD', parseFloat);
    bindSlider('velocity-sens-slider', 'velocity-sens-val', 'VELOCITY_COLOR_SENSITIVITY', parseInt);
    bindSlider('density-sens-slider', 'density-sens-val', 'DENSITY_COLOR_SENSITIVITY', parseInt);
    bindSlider('flow-speed-slider', 'flow-speed-val', 'FLOW_BACKGROUND_SPEED', parseFloat);
    bindSlider('flow-force-slider', 'flow-force-val', 'FLOW_BACKGROUND_FORCE', parseInt);
    bindSlider('flow-faintness-slider', 'flow-faintness-val', 'FLOW_BACKGROUND_FAINTNESS', parseFloat);

    // Color Pickers & Mode
    const colorModeSelect = document.getElementById('color-mode-select');
    if (colorModeSelect) {
      colorModeSelect.addEventListener('change', (e) => {
        const mode = e.target.value;
        SplashCursorEngine.updateConfig({ COLOR_MODE: mode });
        clearActivePreset();
        updateColorVisibility(mode);
      });
    }

    bindColorPicker('primary-color-picker', 'CUSTOM_COLOR');
    bindColorPicker('secondary-color-picker', 'SECONDARY_COLOR');
    bindColorPicker('back-color-picker', 'BACK_COLOR_HEX', (hex) => {
      const rgb = hexToRgb(hex);
      SplashCursorEngine.updateConfig({ BACK_COLOR: rgb });
    });

    // Toggles
    bindToggle('shading-toggle', 'SHADING');
    bindToggle('bloom-toggle', 'BLOOM');
    bindToggle('transparent-toggle', 'TRANSPARENT');
    bindToggle('auto-splat-toggle', 'AUTO_SPLATS');
    bindToggle('hover-splat-toggle', 'POINTER_HOVER_SPLATS');
    bindToggle('global-tracking-toggle', 'GLOBAL_POINTER_TRACKING');
    bindToggle('flow-background-toggle', 'FLOW_BACKGROUND_ENABLED');

    // Performance resolution control
    const simResSelect = document.getElementById('sim-res-select');
    if (simResSelect) {
      simResSelect.addEventListener('change', (e) => {
        SplashCursorEngine.updateConfig({ SIM_RESOLUTION: parseInt(e.target.value, 10) });
        clearActivePreset();
      });
    }

    // Sidebar Collapse
    const sidebar = document.getElementById('sidebar-panel');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    const openSidebarBtn = document.getElementById('open-sidebar-btn');

    if (toggleSidebarBtn) {
      toggleSidebarBtn.addEventListener('click', () => {
        setSidebarCollapsed(sidebar, !sidebar.classList.contains('collapsed'));
      });
    }
    if (openSidebarBtn) {
      openSidebarBtn.addEventListener('click', () => {
        setSidebarCollapsed(sidebar, false);
      });
    }

    // Header Actions
    document.getElementById('randomize-btn')?.addEventListener('click', randomizeConfig);
    document.getElementById('trigger-splat-btn')?.addEventListener('click', () => SplashCursorEngine.triggerSplats(6));
    document.getElementById('sandbox-splat-btn')?.addEventListener('click', () => SplashCursorEngine.triggerSplats(8));
    document.getElementById('sandbox-settings-btn')?.addEventListener('click', () => {
      setSidebarCollapsed(document.getElementById('sidebar-panel'), false);
    });
    document.getElementById('reset-btn')?.addEventListener('click', () => {
      SplashCursorEngine.reset();
      clearActivePreset();
      syncUIWithEngine();
      showToast('Settings reset to default!');
    });

    // Sandbox Toggle
    const sandboxOverlay = document.getElementById('sandbox-overlay');
    document.getElementById('toggle-sandbox-btn')?.addEventListener('click', () => {
      sandboxOverlay.classList.toggle('hidden');
      const isHidden = sandboxOverlay.classList.contains('hidden');
      showToast(isHidden ? 'Sandbox overlay hidden' : 'Sandbox overlay active');
    });

    // Save Preset Button
    document.getElementById('save-preset-btn')?.addEventListener('click', promptSavePreset);

    // Export Code Button
    document.getElementById('export-code-btn')?.addEventListener('click', openExportModal);
    document.getElementById('close-modal-btn')?.addEventListener('click', closeModal);
    document.getElementById('export-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'export-modal') closeModal();
    });
    document.getElementById('close-input-modal-btn')?.addEventListener('click', closeInputModal);
    document.getElementById('cancel-input-modal-btn')?.addEventListener('click', closeInputModal);
    document.getElementById('confirm-input-modal-btn')?.addEventListener('click', submitInputModal);
    document.getElementById('settings-input-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'settings-input-modal') closeInputModal();
    });
    document.getElementById('preset-name-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitInputModal();
    });
    document.getElementById('preset-json-input')?.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') submitInputModal();
    });
    document.addEventListener('keydown', (e) => {
      const modal = document.querySelector('.modal-backdrop.open');
      if (!modal) return;
      if (e.key === 'Escape') {
        if (modal.id === 'export-modal') closeModal();
        else closeInputModal();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = [...modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
        .filter(element => !element.disabled && element.getClientRects().length > 0);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    // Modal Export Code Tabs
    document.querySelectorAll('.code-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.code-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updateCodeBlockContent(btn.getAttribute('data-format'));
      });
    });

    document.getElementById('copy-code-btn')?.addEventListener('click', copyCodeToClipboard);
    document.getElementById('import-json-btn')?.addEventListener('click', promptImportJSON);
    
    document.getElementById('add-palette-color-btn')?.addEventListener('click', () => {
      const config = SplashCursorEngine.getConfig();
      const palette = [...(config.COLOR_PALETTE || [])];
      if (palette.length >= 10) {
        showToast('Maximum 10 colors allowed');
        return;
      }
      palette.push('#ffffff'); // Default new color
      SplashCursorEngine.updateConfig({ COLOR_PALETTE: palette });
      clearActivePreset();
      renderPaletteColors(palette);
    });
  }

  function updateColorVisibility(mode) {
    const primaryGroup = document.getElementById('primary-color-group');
    const secondaryGroup = document.getElementById('secondary-color-group');
    const paletteGroup = document.getElementById('palette-color-group');
    const colorSpeedRow = document.getElementById('color-speed-row');

    if (primaryGroup) primaryGroup.style.display = 'none';
    if (secondaryGroup) secondaryGroup.style.display = 'none';
    if (paletteGroup) paletteGroup.style.display = 'none';

    const vSens = document.getElementById('velocity-sensitivity-row');
    const dSens = document.getElementById('density-sensitivity-row');
    if (vSens) vSens.style.display = mode === 'velocity-palette' ? 'flex' : 'none';
    if (dSens) dSens.style.display = mode === 'density-palette' ? 'flex' : 'none';
    if (colorSpeedRow) {
      colorSpeedRow.style.display = ['rainbow', 'dual', 'palette'].includes(mode) ? 'flex' : 'none';
    }

    if (mode === 'single') {
      if (primaryGroup) primaryGroup.style.display = 'flex';
    } else if (mode === 'dual') {
      if (primaryGroup) primaryGroup.style.display = 'flex';
      if (secondaryGroup) secondaryGroup.style.display = 'flex';
    } else if (mode === 'palette' || mode === 'velocity-palette' || mode === 'density-palette') {
      if (paletteGroup) paletteGroup.style.display = 'flex';
    }
  }

  function bindSlider(sliderId, valId, configKey, formatFn) {
    const slider = document.getElementById(sliderId);
    const valDisplay = document.getElementById(valId);
    if (!slider) return;

    slider.addEventListener('input', (e) => {
      const val = formatFn(e.target.value);
      if (!Number.isFinite(val)) return;
      if (valDisplay) valDisplay.textContent = val;
      SplashCursorEngine.updateConfig({ [configKey]: val });
      clearActivePreset();
    });
  }

  function setSidebarCollapsed(sidebar, collapsed) {
    if (!sidebar) return;
    sidebar.classList.toggle('collapsed', collapsed);
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    document.getElementById('open-sidebar-btn')?.setAttribute('aria-expanded', String(!collapsed));
  }

  function bindToggle(toggleId, configKey) {
    const toggle = document.getElementById(toggleId);
    if (!toggle) return;

    toggle.addEventListener('change', (e) => {
      const nextConfig = SplashCursorEngine.updateConfig({ [configKey]: e.target.checked });
      e.target.checked = !!nextConfig[configKey];
      clearActivePreset();
    });
  }

  function bindColorPicker(pickerId, configKey, customHandler) {
    const picker = document.getElementById(pickerId);
    if (!picker) return;

    picker.addEventListener('input', (e) => {
      if (customHandler) {
        customHandler(e.target.value);
      } else {
        SplashCursorEngine.updateConfig({ [configKey]: e.target.value });
      }
      clearActivePreset();
    });
  }

  function clearActivePreset() {
    document.querySelectorAll('.preset-card.active').forEach(card => card.classList.remove('active'));
  }

  function syncUIWithEngine() {
    const config = SplashCursorEngine.getConfig();

    setSliderVal('curl-slider', 'curl-val', config.CURL);
    setSliderVal('dissipation-slider', 'dissipation-val', config.DENSITY_DISSIPATION);
    setSliderVal('velocity-diss-slider', 'velocity-diss-val', config.VELOCITY_DISSIPATION);
    setSliderVal('radius-slider', 'radius-val', config.SPLAT_RADIUS);
    setSliderVal('force-slider', 'force-val', config.SPLAT_FORCE);
    setSliderVal('pressure-slider', 'pressure-val', config.PRESSURE);
    setSliderVal('color-speed-slider', 'color-speed-val', config.COLOR_UPDATE_SPEED);
    setSliderVal('bloom-intensity-slider', 'bloom-intensity-val', config.BLOOM_INTENSITY);
    setSliderVal('bloom-threshold-slider', 'bloom-threshold-val', config.BLOOM_THRESHOLD);
    setSliderVal('velocity-sens-slider', 'velocity-sens-val', config.VELOCITY_COLOR_SENSITIVITY);
    setSliderVal('density-sens-slider', 'density-sens-val', config.DENSITY_COLOR_SENSITIVITY);
    setSliderVal('flow-speed-slider', 'flow-speed-val', config.FLOW_BACKGROUND_SPEED ?? 1.0);
    setSliderVal('flow-force-slider', 'flow-force-val', config.FLOW_BACKGROUND_FORCE ?? 2000);
    setSliderVal('flow-faintness-slider', 'flow-faintness-val', config.FLOW_BACKGROUND_FAINTNESS ?? 8.0);

    setToggleState('shading-toggle', config.SHADING);
    setToggleState('bloom-toggle', config.BLOOM);
    setToggleState('transparent-toggle', config.TRANSPARENT);
    setToggleState('auto-splat-toggle', config.AUTO_SPLATS);
    setToggleState('hover-splat-toggle', config.POINTER_HOVER_SPLATS);
    setToggleState('global-tracking-toggle', config.GLOBAL_POINTER_TRACKING);
    setToggleState('flow-background-toggle', config.FLOW_BACKGROUND_ENABLED ?? false);

    const simResSelect = document.getElementById('sim-res-select');
    if (simResSelect) simResSelect.value = String(config.SIM_RESOLUTION);

    const modeSelect = document.getElementById('color-mode-select');
    if (modeSelect) modeSelect.value = config.COLOR_MODE || 'rainbow';
    updateColorVisibility(config.COLOR_MODE || 'rainbow');

    if (config.CUSTOM_COLOR) {
      const p = document.getElementById('primary-color-picker');
      if (p) p.value = config.CUSTOM_COLOR;
    }
    if (config.SECONDARY_COLOR) {
      const s = document.getElementById('secondary-color-picker');
      if (s) s.value = config.SECONDARY_COLOR;
    }

    if (config.BACK_COLOR) {
      const b = document.getElementById('back-color-picker');
      if (b) b.value = rgbToHex(config.BACK_COLOR.r, config.BACK_COLOR.g, config.BACK_COLOR.b);
    }
    
    renderPaletteColors(config.COLOR_PALETTE || []);
  }

  function renderPaletteColors(palette) {
    const container = document.getElementById('palette-colors-container');
    if (!container) return;
    container.innerHTML = '';
    
    palette.forEach((color, index) => {
      const wrapper = document.createElement('div');
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.gap = '4px';
      
      const input = document.createElement('input');
      input.type = 'color';
      input.value = normalizeHex(color, '#ffffff');
      input.setAttribute('aria-label', `Palette color ${index + 1}`);
      input.style.width = '30px';
      input.style.height = '30px';
      input.style.padding = '0';
      input.style.border = 'none';
      input.style.borderRadius = '4px';
      input.style.cursor = 'pointer';
      
      input.addEventListener('input', (e) => {
        const config = SplashCursorEngine.getConfig();
        const newPalette = [...(config.COLOR_PALETTE || [])];
        newPalette[index] = e.target.value;
        SplashCursorEngine.updateConfig({ COLOR_PALETTE: newPalette });
        clearActivePreset();
      });
      
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.textContent = '✕';
      removeBtn.className = 'btn btn-icon';
      removeBtn.style.padding = '2px 6px';
      removeBtn.style.fontSize = '0.7rem';
      removeBtn.style.background = 'rgba(255, 0, 0, 0.2)';
      removeBtn.title = 'Remove color';
      removeBtn.setAttribute('aria-label', `Remove palette color ${index + 1}`);
      
      removeBtn.addEventListener('click', () => {
        const config = SplashCursorEngine.getConfig();
        const newPalette = [...(config.COLOR_PALETTE || [])];
        if (newPalette.length <= 1) {
          showToast('Need at least one color in palette');
          return;
        }
        newPalette.splice(index, 1);
        SplashCursorEngine.updateConfig({ COLOR_PALETTE: newPalette });
        clearActivePreset();
        renderPaletteColors(newPalette);
      });
      
      wrapper.appendChild(input);
      wrapper.appendChild(removeBtn);
      container.appendChild(wrapper);
    });
  }

  function setSliderVal(sliderId, displayId, val) {
    const slider = document.getElementById(sliderId);
    const display = document.getElementById(displayId);
    if (slider) slider.value = val;
    if (display) display.textContent = val;
  }

  function setToggleState(toggleId, state) {
    const toggle = document.getElementById(toggleId);
    if (toggle) toggle.checked = !!state;
  }

  function renderPresetCards() {
    const container = document.getElementById('presets-grid');
    if (!container) return;
    container.innerHTML = '';

    // Render Built-in
    Object.keys(BUILTIN_PRESETS).forEach((key) => {
      const preset = BUILTIN_PRESETS[key];
      const card = createPresetCard(key, preset.name, preset, false);
      container.appendChild(card);
    });

    // Render User Saved
    Object.keys(savedPresets).forEach((key) => {
      const preset = savedPresets[key];
      if (!preset || typeof preset !== 'object' || Array.isArray(preset)) return;
      const card = createPresetCard(key, preset.name, preset, true);
      container.appendChild(card);
    });
  }

  function createPresetCard(id, name, presetConfig, isUserPreset) {
    const safeConfig = presetConfig && typeof presetConfig === 'object' && !Array.isArray(presetConfig)
      ? presetConfig
      : {};
    const card = document.createElement('div');
    card.className = 'preset-card';
    card.setAttribute('data-id', id);
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Load ${String(name || 'preset')}`);

    const title = document.createElement('div');
    title.className = 'preset-title';
    title.textContent = String(name || 'Untitled preset');

    const dots = document.createElement('div');
    dots.className = 'preset-preview-dots';
    const background = safeConfig.BACK_COLOR || { r: 5, g: 5, b: 12 };
    [
      normalizeHex(safeConfig.CUSTOM_COLOR, '#00f0ff'),
      normalizeHex(safeConfig.SECONDARY_COLOR, '#ff007f'),
      rgbToHex(background.r, background.g, background.b),
    ].forEach((color) => {
      const dot = document.createElement('div');
      dot.className = 'preset-dot';
      dot.style.backgroundColor = color;
      dots.appendChild(dot);
    });

    card.appendChild(title);
    card.appendChild(dots);

    const loadPreset = () => {
      document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      const configToApply = isUserPreset
        ? safeConfig
        : { ...initialStudioConfig, ...safeConfig };
      SplashCursorEngine.updateConfig(configToApply);
      syncUIWithEngine();
      SplashCursorEngine.triggerSplats(5);
      showToast(`Loaded "${name}" preset`);
    };

    card.addEventListener('click', (e) => {
      if (e.target.closest('.delete-preset-btn')) return;
      loadPreset();
    });
    card.addEventListener('keydown', (e) => {
      if (e.target !== card) return;
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      loadPreset();
    });

    if (isUserPreset) {
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'delete-preset-btn';
      deleteButton.title = 'Delete preset';
      deleteButton.setAttribute('aria-label', `Delete ${String(name || 'preset')}`);
      deleteButton.textContent = '✕';
      deleteButton.addEventListener('click', (e) => {
        e.stopPropagation();
        delete savedPresets[id];
        saveUserPresets();
        renderPresetCards();
        showToast('Preset deleted');
      });
      card.appendChild(deleteButton);
    }

    return card;
  }

  function promptSavePreset() {
    openInputModal('save');
  }

  function randomizeConfig() {
    const randomHex = () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    const randomStep = (min, max, step) => {
      const stepCount = Math.floor((max - min) / step);
      const value = min + Math.floor(Math.random() * (stepCount + 1)) * step;
      const decimals = (String(step).split('.')[1] || '').length;
      return Number(value.toFixed(decimals));
    };

    const randConfig = {
      CURL: randomStep(5, 50, 1),
      DENSITY_DISSIPATION: randomStep(0.3, 2.3, 0.05),
      VELOCITY_DISSIPATION: randomStep(0.05, 0.55, 0.05),
      PRESSURE: randomStep(0.5, 0.95, 0.05),
      SPLAT_RADIUS: randomStep(0.15, 0.4, 0.01),
      SPLAT_FORCE: randomStep(3000, 9000, 250),
      COLOR_MODE: ['rainbow', 'single', 'dual', 'palette', 'velocity-palette', 'density-palette'][Math.floor(Math.random() * 6)],
      CUSTOM_COLOR: randomHex(),
      SECONDARY_COLOR: randomHex(),
      COLOR_PALETTE: Array.from({ length: Math.floor(Math.random() * 4) + 2 }, randomHex),
      BLOOM: true,
      BLOOM_INTENSITY: randomStep(0.4, 1.2, 0.05),
      SHADING: Math.random() > 0.3,
    };

    SplashCursorEngine.updateConfig(randConfig);
    clearActivePreset();
    syncUIWithEngine();
    SplashCursorEngine.triggerSplats(6);
    showToast('Randomized parameters!');
  }

  // Export Code Modal logic
  let activeExportFormat = 'html';
  let modalReturnFocus = null;
  let activeInputMode = null;
  let inputModalReturnFocus = null;

  function openExportModal() {
    const modal = document.getElementById('export-modal');
    if (modal) {
      modalReturnFocus = document.activeElement;
      modal.removeAttribute('inert');
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      updateCodeBlockContent(activeExportFormat);
      document.getElementById('close-modal-btn')?.focus();
    }
  }

  function closeModal() {
    const modal = document.getElementById('export-modal');
    if (!modal?.classList.contains('open')) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('inert', '');
    if (modalReturnFocus instanceof HTMLElement) modalReturnFocus.focus();
    modalReturnFocus = null;
  }

  function openInputModal(mode) {
    const modal = document.getElementById('settings-input-modal');
    const title = document.getElementById('settings-input-title');
    const nameField = document.getElementById('preset-name-field');
    const jsonField = document.getElementById('preset-json-field');
    const nameInput = document.getElementById('preset-name-input');
    const jsonInput = document.getElementById('preset-json-input');
    const confirmButton = document.getElementById('confirm-input-modal-btn');
    if (!modal || !title || !nameField || !jsonField || !confirmButton) return;

    activeInputMode = mode;
    inputModalReturnFocus = document.activeElement;
    const isSave = mode === 'save';
    title.textContent = isSave ? '⭐ Save Current Preset' : '📥 Import JSON Preset';
    confirmButton.textContent = isSave ? 'Save Preset' : 'Import Settings';
    nameField.hidden = !isSave;
    jsonField.hidden = isSave;

    if (nameInput) nameInput.value = isSave ? 'My Liquid Glow' : '';
    if (jsonInput) jsonInput.value = '';

    modal.removeAttribute('inert');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    (isSave ? nameInput : jsonInput)?.focus();
    if (isSave) nameInput?.select();
  }

  function closeInputModal() {
    const modal = document.getElementById('settings-input-modal');
    if (!modal?.classList.contains('open')) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('inert', '');
    activeInputMode = null;
    if (inputModalReturnFocus instanceof HTMLElement) inputModalReturnFocus.focus();
    inputModalReturnFocus = null;
  }

  function submitInputModal() {
    if (activeInputMode === 'save') {
      const nameInput = document.getElementById('preset-name-input');
      const name = nameInput?.value.trim().slice(0, 80);
      if (!name) {
        showToast('Enter a name for the preset.');
        nameInput?.focus();
        return;
      }

      const uniquePart = globalThis.crypto?.randomUUID?.()
        || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const id = `user-${uniquePart}`;
      const currentConfig = SplashCursorEngine.getConfig();
      currentConfig.name = '⭐ ' + name;
      savedPresets[id] = currentConfig;
      saveUserPresets();
      renderPresetCards();
      document.querySelector(`.preset-card[data-id="${id}"]`)?.classList.add('active');
      closeInputModal();
      showToast(`Preset "${name}" saved!`);
      return;
    }

    if (activeInputMode === 'import') {
      const jsonInput = document.getElementById('preset-json-input');
      const jsonString = jsonInput?.value.trim();
      if (!jsonString) {
        showToast('Paste a JSON configuration first.');
        jsonInput?.focus();
        return;
      }

      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new TypeError('Configuration must be a JSON object');
        }
        SplashCursorEngine.updateConfig(parsed);
        clearActivePreset();
        syncUIWithEngine();
        closeInputModal();
        showToast('Imported JSON configuration!');
      } catch (error) {
        showToast('Invalid JSON configuration. Check the format and try again.');
        jsonInput?.focus();
      }
    }
  }

  function updateCodeBlockContent(format) {
    activeExportFormat = format;
    const codeElement = document.getElementById('code-output');
    if (!codeElement) return;
    const config = SplashCursorEngine.getConfig();

    // Clean config object for export
    const cleanConfig = { ...config };
    delete cleanConfig.name;

    if (format === 'html') {
      codeElement.textContent = generateStandaloneHTMLSnippet(cleanConfig);
    } else if (format === 'react') {
      codeElement.textContent = generateReactComponentSnippet(cleanConfig);
    } else if (format === 'json') {
      codeElement.textContent = JSON.stringify(cleanConfig, null, 2);
    }
  }

  function generateStandaloneHTMLSnippet(config) {
    const exportConfig = { ...config, GLOBAL_POINTER_TRACKING: true };
    return `<!-- Drop-in SplashCursor Interactive Background -->
<canvas id="splash-canvas" aria-hidden="true" style="position:fixed; inset:0; width:100vw; height:100vh; z-index:-1; pointer-events:none;"></canvas>

<script src="splash-cursor.js" defer></script>
<script>
  window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('splash-canvas');
    SplashCursorEngine.init(canvas, ${JSON.stringify(exportConfig, null, 4)});
  });
</script>`;
  }

  function generateReactComponentSnippet(config) {
    const exportConfig = { ...config, GLOBAL_POINTER_TRACKING: true };
    return `'use client';

import React, { useEffect, useRef } from 'react';

export default function SplashCursorBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let initialized = false;
    let engine;

    import('./splash-cursor').then(() => {
      engine = window.SplashCursorEngine;
      if (cancelled || !canvasRef.current || !engine) return;
      initialized = engine.init(canvasRef.current, ${JSON.stringify(exportConfig, null, 6)});
    }).catch((error) => {
      console.error('Unable to load SplashCursor:', error);
    });

    return () => {
      cancelled = true;
      if (initialized) engine.destroy();
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
        zIndex: -1,
        pointerEvents: 'none'
      }}
      aria-hidden="true"
    />
  );
}`;
  }

  async function copyCodeToClipboard() {
    const codeElement = document.getElementById('code-output');
    if (!codeElement) return;

    try {
      await navigator.clipboard.writeText(codeElement.textContent);
      showToast('Code copied to clipboard!');
    } catch (error) {
      console.warn('Clipboard write failed', error);
      showToast('Copy failed. Select the code and copy it manually.');
    }
  }

  function promptImportJSON() {
    openInputModal('import');
  }

  // Toast Notification helper
  function showToast(msg) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      container.setAttribute('role', 'status');
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    const icon = document.createElement('span');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '✨';
    const message = document.createElement('span');
    message.textContent = String(msg);
    toast.append(icon, message);
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // Helper functions
  function normalizeHex(value, fallback = '#000000') {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed.toLowerCase();
    if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
      return '#' + trimmed.slice(1).split('').map(char => char + char).join('').toLowerCase();
    }
    return fallback;
  }

  function hexToRgb(hex) {
    const normalized = normalizeHex(hex, '#000000');
    const c = normalized.slice(1);
    const num = parseInt(c, 16);
    return { r: num >> 16 & 255, g: num >> 8 & 255, b: num & 255 };
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const value = Number.isFinite(Number(x)) ? Math.min(255, Math.max(0, Number(x))) : 0;
      const hex = Math.round(value).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

})();
