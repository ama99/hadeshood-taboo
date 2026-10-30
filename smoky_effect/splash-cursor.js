/**
 * SplashCursor WebGL Fluid Simulation Engine
 * GPU-accelerated Navier-Stokes fluid dynamics with Bloom & Specular Shading.
 * Based on Pavel Dobryakov's WebGL fluid simulation.
 */

window.SplashCursorEngine = (function () {
  'use strict';

  const defaultConfig = {
    SIM_RESOLUTION: 128,
    DYE_RESOLUTION: 1024,
    DENSITY_DISSIPATION: 1.0,
    VELOCITY_DISSIPATION: 0.2,
    PRESSURE: 0.8,
    PRESSURE_ITERATIONS: 20,
    CURL: 30,
    SPLAT_RADIUS: 0.25,
    SPLAT_FORCE: 6000,
    SHADING: true,
    COLOR_UPDATE_SPEED: 10,
    PAUSED: false,
    BACK_COLOR: { r: 5, g: 5, b: 12 },
    TRANSPARENT: false,
    BLOOM: true,
    BLOOM_ITERATIONS: 4,
    BLOOM_RESOLUTION: 256,
    BLOOM_INTENSITY: 0.8,
    BLOOM_THRESHOLD: 0.6,
    BLOOM_SOFT_KNEE: 0.7,
    CUSTOM_COLOR: '#00f0ff',
    COLOR_MODE: 'rainbow',
    SECONDARY_COLOR: '#ff007f',
    COLOR_PALETTE: ['#ff0000', '#00ff00', '#0000ff'],
    AUTO_SPLATS: false,
    AUTO_SPLAT_INTERVAL: 1500,
    POINTER_HOVER_SPLATS: true,
    GLOBAL_POINTER_TRACKING: false,
    VELOCITY_COLOR_SENSITIVITY: 4000,
    DENSITY_COLOR_SENSITIVITY: 50,
    FLOW_BACKGROUND_ENABLED: false,
    FLOW_BACKGROUND_SPEED: 1.0,
    FLOW_BACKGROUND_FORCE: 2000,
    FLOW_BACKGROUND_FAINTNESS: 8.0,
  };

  const COLOR_MODES = new Set([
    'rainbow',
    'single',
    'dual',
    'palette',
    'velocity-palette',
    'density-palette',
  ]);

  const NUMERIC_CONFIG_LIMITS = {
    SIM_RESOLUTION: [64, 256, true],
    DYE_RESOLUTION: [64, 2048, true],
    DENSITY_DISSIPATION: [0, 4],
    VELOCITY_DISSIPATION: [0, 2],
    PRESSURE: [0, 1],
    PRESSURE_ITERATIONS: [1, 50, true],
    CURL: [0, 60],
    SPLAT_RADIUS: [0.05, 0.8],
    SPLAT_FORCE: [1000, 12000],
    COLOR_UPDATE_SPEED: [1, 30],
    BLOOM_ITERATIONS: [1, 8, true],
    BLOOM_RESOLUTION: [32, 1024, true],
    BLOOM_INTENSITY: [0.1, 2],
    BLOOM_THRESHOLD: [0.1, 1],
    BLOOM_SOFT_KNEE: [0, 1],
    AUTO_SPLAT_INTERVAL: [100, 60000, true],
    VELOCITY_COLOR_SENSITIVITY: [1, 100000],
    DENSITY_COLOR_SENSITIVITY: [1, 200],
    FLOW_BACKGROUND_SPEED: [0.1, 5],
    FLOW_BACKGROUND_FORCE: [0, 10000],
    FLOW_BACKGROUND_FAINTNESS: [0, 20],
  };

  const BOOLEAN_CONFIG_KEYS = [
    'SHADING',
    'PAUSED',
    'TRANSPARENT',
    'BLOOM',
    'AUTO_SPLATS',
    'POINTER_HOVER_SPLATS',
    'GLOBAL_POINTER_TRACKING',
    'FLOW_BACKGROUND_ENABLED',
  ];

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function normalizeHexColor(value, fallback) {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed.toLowerCase();
    if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
      return '#' + trimmed.slice(1).split('').map(char => char + char).join('').toLowerCase();
    }
    return fallback;
  }

  function cloneConfig(source) {
    const safeSource = source && source.BACK_COLOR && Array.isArray(source.COLOR_PALETTE)
      ? source
      : defaultConfig;
    return {
      ...safeSource,
      BACK_COLOR: { ...safeSource.BACK_COLOR },
      COLOR_PALETTE: [...safeSource.COLOR_PALETTE],
    };
  }

  function normalizeConfig(source, base = defaultConfig) {
    const result = cloneConfig(base);
    if (!source || typeof source !== 'object' || Array.isArray(source)) return result;

    Object.entries(NUMERIC_CONFIG_LIMITS).forEach(([key, limits]) => {
      if (!(key in source)) return;
      const value = Number(source[key]);
      if (!Number.isFinite(value)) return;
      const normalized = clamp(value, limits[0], limits[1]);
      result[key] = limits[2] ? Math.round(normalized) : normalized;
    });

    if ('SIM_RESOLUTION' in source) {
      result.SIM_RESOLUTION = [64, 128, 256].reduce((closest, candidate) => (
        Math.abs(candidate - result.SIM_RESOLUTION) < Math.abs(closest - result.SIM_RESOLUTION)
          ? candidate
          : closest
      ), 64);
    }

    BOOLEAN_CONFIG_KEYS.forEach((key) => {
      if (typeof source[key] === 'boolean') result[key] = source[key];
    });

    if (COLOR_MODES.has(source.COLOR_MODE)) result.COLOR_MODE = source.COLOR_MODE;
    result.CUSTOM_COLOR = normalizeHexColor(source.CUSTOM_COLOR, result.CUSTOM_COLOR);
    result.SECONDARY_COLOR = normalizeHexColor(source.SECONDARY_COLOR, result.SECONDARY_COLOR);

    if (Array.isArray(source.COLOR_PALETTE)) {
      const palette = source.COLOR_PALETTE
        .slice(0, 10)
        .map(color => normalizeHexColor(color, null))
        .filter(Boolean);
      if (palette.length > 0) result.COLOR_PALETTE = palette;
    }

    if (source.BACK_COLOR && typeof source.BACK_COLOR === 'object' && !Array.isArray(source.BACK_COLOR)) {
      const fallback = result.BACK_COLOR;
      result.BACK_COLOR = {
        r: Number.isFinite(Number(source.BACK_COLOR.r)) ? clamp(Number(source.BACK_COLOR.r), 0, 255) : fallback.r,
        g: Number.isFinite(Number(source.BACK_COLOR.g)) ? clamp(Number(source.BACK_COLOR.g), 0, 255) : fallback.g,
        b: Number.isFinite(Number(source.BACK_COLOR.b)) ? clamp(Number(source.BACK_COLOR.b), 0, 255) : fallback.b,
      };
    }

    return result;
  }

  let config = {};
  let canvas, gl, ext;
  let pointers = [];
  let isRunning = false;
  let autoSplatTimer = null;
  let animationFrameId = null;
  let colorUpdateTimer = 0;
  let lastUpdateTime = 0;
  let eventCleanups = [];
  let resizePending = true;
  let lastPixelRatio = 1;
  let quadVertexBuffer = null;
  let quadIndexBuffer = null;

  let dye, velocity, divergence, curl, pressure;
  let bloom;
  let bloomFramebuffers = [];
  let paletteTexture = null;

  let copyProgram, clearProgram,
    bloomPrefilterProgram, bloomBlurProgram, bloomFinalProgram,
    advectionProgram, divergenceProgram, curlProgram,
    vorticityProgram, pressureProgram, gradientSubtractProgram, flowFieldProgram;
  let displayMaterial;

  // ========== WebGL Helpers ==========

  function getWebGLContext(canvas) {
    const params = {
      alpha: true,
      depth: false,
      stencil: false,
      antialias: false,
      preserveDrawingBuffer: false,
    };

    let gl2 = canvas.getContext('webgl2', params);
    const isWebGL2 = !!gl2;
    if (!isWebGL2) {
      gl2 = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);
    }
    if (!gl2) return null;

    let halfFloat, supportLinearFiltering;
    if (isWebGL2) {
      gl2.getExtension('EXT_color_buffer_float');
      supportLinearFiltering = gl2.getExtension('OES_texture_float_linear');
    } else {
      halfFloat = gl2.getExtension('OES_texture_half_float');
      supportLinearFiltering = gl2.getExtension('OES_texture_half_float_linear');
    }

    gl2.clearColor(0.0, 0.0, 0.0, 1.0);

    const halfFloatTexType = isWebGL2
      ? gl2.HALF_FLOAT
      : halfFloat
        ? halfFloat.HALF_FLOAT_OES
        : gl2.UNSIGNED_BYTE;

    let formatRGBA, formatRG, formatR;

    if (isWebGL2) {
      formatRGBA = getSupportedFormat(gl2, gl2.RGBA16F, gl2.RGBA, halfFloatTexType);
      formatRG = getSupportedFormat(gl2, gl2.RG16F, gl2.RG, halfFloatTexType);
      formatR = getSupportedFormat(gl2, gl2.R16F, gl2.RED, halfFloatTexType);
    } else {
      formatRGBA = getSupportedFormat(gl2, gl2.RGBA, gl2.RGBA, halfFloatTexType);
      formatRG = getSupportedFormat(gl2, gl2.RGBA, gl2.RGBA, halfFloatTexType);
      formatR = getSupportedFormat(gl2, gl2.RGBA, gl2.RGBA, halfFloatTexType);
    }

    return {
      gl: gl2,
      ext: {
        formatRGBA,
        formatRG,
        formatR,
        halfFloatTexType,
        supportLinearFiltering,
      },
      isWebGL2,
    };
  }

  function getSupportedFormat(gl, internalFormat, format, type) {
    if (!supportRenderTextureFormat(gl, internalFormat, format, type)) {
      switch (internalFormat) {
        case gl.R16F: return getSupportedFormat(gl, gl.RG16F, gl.RG, type);
        case gl.RG16F: return getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type);
        case gl.RGBA16F: return getSupportedFormat(gl, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);
        default:
          // Ultimate fallback — RGBA/UNSIGNED_BYTE should always work
          if (type !== gl.UNSIGNED_BYTE) {
            return getSupportedFormat(gl, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);
          }
          return null;
      }
    }
    return { internalFormat, format };
  }

  function supportRenderTextureFormat(gl, internalFormat, format, type) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);

    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.deleteTexture(texture);
    gl.deleteFramebuffer(fbo);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return status === gl.FRAMEBUFFER_COMPLETE;
  }

  // ========== Shader compilation ==========

  class GLProgram {
    constructor(vertexShaderSource, fragmentShaderSource) {
      this.uniforms = {};
      this.program = gl.createProgram();

      const vs = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
      let fs;
      try {
        fs = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
      } catch (error) {
        gl.deleteShader(vs);
        gl.deleteProgram(this.program);
        this.program = null;
        throw error;
      }

      gl.attachShader(this.program, vs);
      gl.attachShader(this.program, fs);
      gl.bindAttribLocation(this.program, 0, 'aPosition');
      gl.linkProgram(this.program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);

      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
        const message = gl.getProgramInfoLog(this.program) || 'Unknown WebGL program link error';
        gl.deleteProgram(this.program);
        this.program = null;
        throw new Error(message.replace(/\0/g, '').trim());
      }

      const uniformCount = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < uniformCount; i++) {
        const uniformName = gl.getActiveUniform(this.program, i).name;
        this.uniforms[uniformName] = gl.getUniformLocation(this.program, uniformName);
      }
    }

    bind() {
      gl.useProgram(this.program);
    }

    destroy() {
      if (this.program && gl) gl.deleteProgram(this.program);
      this.program = null;
      this.uniforms = {};
    }
  }

  function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) || 'Unknown WebGL shader compile error';
      gl.deleteShader(shader);
      throw new Error(message.replace(/\0/g, '').trim());
    }
    return shader;
  }

  // ========== Shader Sources ==========

  const baseVertexShader = `
    precision highp float;
    attribute vec2 aPosition;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform vec2 texelSize;

    void main () {
      vUv = aPosition * 0.5 + 0.5;
      vL = vUv - vec2(texelSize.x, 0.0);
      vR = vUv + vec2(texelSize.x, 0.0);
      vT = vUv + vec2(0.0, texelSize.y);
      vB = vUv - vec2(0.0, texelSize.y);
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  const copyShader = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    uniform sampler2D uTexture;

    void main () {
      gl_FragColor = texture2D(uTexture, vUv);
    }
  `;

  const clearShader = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    uniform sampler2D uTexture;
    uniform float value;

    void main () {
      gl_FragColor = value * texture2D(uTexture, vUv);
    }
  `;

  const displayShader = `
    precision highp float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uTexture;
    uniform sampler2D uBloom;
    uniform sampler2D uPaletteTexture;
    uniform highp vec2 texelSize;
    uniform vec3 uBackColor;
    uniform float uShading;
    uniform float uBloomEnabled;
    uniform float uTransparent;
    uniform float uColorMode;
    uniform float uDensitySensitivity;

    vec3 mapDensityToPalette (vec3 dye) {
      float density = max(dye.r, max(dye.g, dye.b));
      float palettePosition = 1.0 - exp(-density * max(uDensitySensitivity, 0.0001));
      float intensity = 1.0 - exp(-density * 3.0);
      vec3 mappedColor = texture2D(
        uPaletteTexture,
        vec2(clamp(palettePosition, 0.0, 1.0), 0.5)
      ).rgb;
      return mappedColor * intensity;
    }

    void main () {
      vec3 c = texture2D(uTexture, vUv).rgb;

      if (uColorMode > 0.5) {
        c = mapDensityToPalette(c);
      }

      if (uBloomEnabled > 0.5) {
        vec3 bloom = texture2D(uBloom, vUv).rgb;
        c += bloom;
      }

      if (uShading > 0.5) {
        vec3 lc = texture2D(uTexture, vL).rgb;
        vec3 rc = texture2D(uTexture, vR).rgb;
        vec3 tc = texture2D(uTexture, vT).rgb;
        vec3 bc = texture2D(uTexture, vB).rgb;

        float dx = length(rc) - length(lc);
        float dy = length(tc) - length(bc);

        vec3 n = normalize(vec3(dx, dy, length(texelSize)));
        vec3 l = vec3(0.0, 0.0, 1.0);
        float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
        c *= diffuse;
      }

      float a = max(c.r, max(c.g, c.b));
      if (uTransparent > 0.5) {
        gl_FragColor = vec4(c, a);
      } else {
        gl_FragColor = vec4(c + uBackColor * (1.0 - clamp(a, 0.0, 1.0)), 1.0);
      }
    }
  `;

  const flowFieldShader = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    uniform sampler2D uTarget;
    uniform float uTime;
    uniform float uForce;

    void main () {
      vec3 base = texture2D(uTarget, vUv).xyz;
      
      float nx = sin(vUv.y * 3.0 + uTime * 0.5) + cos(vUv.x * 2.0 - uTime * 0.3);
      float ny = cos(vUv.x * 4.0 - uTime * 0.4) + sin(vUv.y * 2.5 + uTime * 0.4);

      vec2 force = vec2(nx, ny) * uForce * 0.0002;
      gl_FragColor = vec4(base.xy + force, 0.0, 1.0);
    }
  `;

  const splatShader = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    uniform sampler2D uTarget;
    uniform float aspectRatio;
    uniform vec3 color;
    uniform vec2 point;
    uniform vec2 pointPrev;
    uniform float radius;

    void main () {
      vec2 p = vUv - pointPrev.xy;
      vec2 ba = point.xy - pointPrev.xy;
      p.x *= aspectRatio;
      ba.x *= aspectRatio;
      
      float h = clamp(dot(p, ba) / (dot(ba, ba) + 1e-8), 0.0, 1.0);
      vec2 d = p - ba * h;
      
      vec3 splat = exp(-dot(d, d) / radius) * color;
      vec3 base = texture2D(uTarget, vUv).xyz;
      gl_FragColor = vec4(base + splat, 1.0);
    }
  `;

  const advectionShader = `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uVelocity;
    uniform sampler2D uSource;
    uniform vec2 texelSize;
    uniform vec2 dyeTexelSize;
    uniform float dt;
    uniform float dissipation;

    vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
      vec2 st = uv / tsize - 0.5;
      vec2 iuv = floor(st);
      vec2 fuv = fract(st);
      vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
      vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
      vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
      vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
      return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
    }

    void main () {
      vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
      vec4 result = bilerp(uSource, coord, dyeTexelSize);
      float decay = 1.0 + dissipation * dt;
      gl_FragColor = result / decay;
    }
  `;

  const divergenceShader = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uVelocity;

    void main () {
      float L = texture2D(uVelocity, vL).x;
      float R = texture2D(uVelocity, vR).x;
      float T = texture2D(uVelocity, vT).y;
      float B = texture2D(uVelocity, vB).y;

      vec2 C = texture2D(uVelocity, vUv).xy;
      if (vL.x < 0.0) { L = -C.x; }
      if (vR.x > 1.0) { R = -C.x; }
      if (vT.y > 1.0) { T = -C.y; }
      if (vB.y < 0.0) { B = -C.y; }

      float div = 0.5 * (R - L + T - B);
      gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
    }
  `;

  const curlShader = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uVelocity;

    void main () {
      float L = texture2D(uVelocity, vL).y;
      float R = texture2D(uVelocity, vR).y;
      float T = texture2D(uVelocity, vT).x;
      float B = texture2D(uVelocity, vB).x;
      float vorticity = R - L - T + B;
      gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
    }
  `;

  const vorticityShader = `
    precision highp float;
    precision highp sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uVelocity;
    uniform sampler2D uCurl;
    uniform float curl;
    uniform float dt;

    void main () {
      float L = texture2D(uCurl, vL).x;
      float R = texture2D(uCurl, vR).x;
      float T = texture2D(uCurl, vT).x;
      float B = texture2D(uCurl, vB).x;
      float C = texture2D(uCurl, vUv).x;

      vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
      force /= length(force) + 0.0001;
      force *= curl * C;
      force.y *= -1.0;

      vec2 velocity = texture2D(uVelocity, vUv).xy;
      velocity += force * dt;
      velocity = min(max(velocity, -1000.0), 1000.0);
      gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
  `;

  const pressureShader = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uDivergence;

    void main () {
      float L = texture2D(uPressure, vL).x;
      float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x;
      float B = texture2D(uPressure, vB).x;
      float divergence = texture2D(uDivergence, vUv).x;
      float pressure = (L + R + B + T - divergence) * 0.25;
      gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
    }
  `;

  const gradientSubtractShader = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uVelocity;

    void main () {
      float L = texture2D(uPressure, vL).x;
      float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x;
      float B = texture2D(uPressure, vB).x;
      vec2 velocity = texture2D(uVelocity, vUv).xy;
      velocity.xy -= vec2(R - L, T - B);
      gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
  `;

  const bloomPrefilterShader = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    uniform sampler2D uTexture;
    uniform sampler2D uPaletteTexture;
    uniform vec3 curve;
    uniform float threshold;
    uniform float uColorMode;
    uniform float uDensitySensitivity;

    vec3 mapDensityToPalette (vec3 dye) {
      float density = max(dye.r, max(dye.g, dye.b));
      float palettePosition = 1.0 - exp(-density * max(uDensitySensitivity, 0.0001));
      float intensity = 1.0 - exp(-density * 3.0);
      vec3 mappedColor = texture2D(
        uPaletteTexture,
        vec2(clamp(palettePosition, 0.0, 1.0), 0.5)
      ).rgb;
      return mappedColor * intensity;
    }

    void main () {
      vec3 c = texture2D(uTexture, vUv).rgb;
      if (uColorMode > 0.5) {
        c = mapDensityToPalette(c);
      }
      float br = max(c.r, max(c.g, c.b));
      float rq = clamp(br - curve.x, 0.0, curve.y);
      rq = curve.z * rq * rq;
      c *= max(rq, br - threshold) / max(br, 0.0001);
      gl_FragColor = vec4(c, 0.0);
    }
  `;

  const bloomBlurShader = `
    precision highp float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    uniform sampler2D uTexture;
    uniform highp vec2 texelSize;

    void main () {
      vec4 sum = vec4(0.0);
      sum += texture2D(uTexture, vUv + vec2(-2.0 * texelSize.x, 0.0)) * 0.0625;
      sum += texture2D(uTexture, vUv + vec2(-1.0 * texelSize.x, 0.0)) * 0.125;
      sum += texture2D(uTexture, vUv) * 0.25;
      sum += texture2D(uTexture, vUv + vec2(1.0 * texelSize.x, 0.0)) * 0.125;
      sum += texture2D(uTexture, vUv + vec2(2.0 * texelSize.x, 0.0)) * 0.0625;

      sum += texture2D(uTexture, vUv + vec2(0.0, -2.0 * texelSize.y)) * 0.0625;
      sum += texture2D(uTexture, vUv + vec2(0.0, -1.0 * texelSize.y)) * 0.125;
      sum += texture2D(uTexture, vUv + vec2(0.0, 1.0 * texelSize.y)) * 0.125;
      sum += texture2D(uTexture, vUv + vec2(0.0, 2.0 * texelSize.y)) * 0.0625;
      gl_FragColor = sum;
    }
  `;

  const bloomFinalShader = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    uniform sampler2D uTexture;
    uniform float intensity;

    void main () {
      gl_FragColor = intensity * texture2D(uTexture, vUv);
    }
  `;

  // ========== Framebuffer management ==========

  function createFBO(w, h, internalFormat, format, type, param) {
    gl.activeTexture(gl.TEXTURE0);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const texelSizeX = 1.0 / w;
    const texelSizeY = 1.0 / h;

    return {
      texture,
      fbo,
      width: w,
      height: h,
      texelSizeX,
      texelSizeY,
      attach(id) {
        gl.activeTexture(gl.TEXTURE0 + id);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        return id;
      },
    };
  }

  function destroyFBO(target) {
    if (!target || !gl) return;
    if (target.texture) gl.deleteTexture(target.texture);
    if (target.fbo) gl.deleteFramebuffer(target.fbo);
  }

  function destroyDoubleFBO(target) {
    if (!target) return;
    destroyFBO(target.read);
    destroyFBO(target.write);
  }

  function createDoubleFBO(w, h, internalFormat, format, type, param) {
    let fbo1 = createFBO(w, h, internalFormat, format, type, param);
    let fbo2 = createFBO(w, h, internalFormat, format, type, param);

    return {
      width: w,
      height: h,
      texelSizeX: fbo1.texelSizeX,
      texelSizeY: fbo1.texelSizeY,
      get read() { return fbo1; },
      set read(value) { fbo1 = value; },
      get write() { return fbo2; },
      set write(value) { fbo2 = value; },
      swap() {
        const temp = fbo1;
        fbo1 = fbo2;
        fbo2 = temp;
      },
    };
  }

  function resizeFBO(target, w, h, internalFormat, format, type, param) {
    const newFBO = createFBO(w, h, internalFormat, format, type, param);
    copyProgram.bind();
    gl.uniform1i(copyProgram.uniforms.uTexture, target.attach(0));
    blit(newFBO);
    destroyFBO(target);
    return newFBO;
  }

  function resizeDoubleFBO(target, w, h, internalFormat, format, type, param) {
    if (target.width === w && target.height === h) return target;
    const oldWrite = target.write;
    target.read = resizeFBO(target.read, w, h, internalFormat, format, type, param);
    target.write = createFBO(w, h, internalFormat, format, type, param);
    destroyFBO(oldWrite);
    target.width = w;
    target.height = h;
    target.texelSizeX = 1.0 / w;
    target.texelSizeY = 1.0 / h;
    return target;
  }

  function getResolution(resolution) {
    let aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
    if (aspectRatio < 1) aspectRatio = 1.0 / aspectRatio;
    const min = Math.round(resolution);
    const max = Math.round(resolution * aspectRatio);
    if (gl.drawingBufferWidth > gl.drawingBufferHeight)
      return { width: max, height: min };
    else
      return { width: min, height: max };
  }

  // ========== Quad rendering ==========

  let blit;

  function initBlit() {
    quadVertexBuffer = gl.createBuffer();
    quadIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    blit = function (target, clear = false) {
      if (target == null) {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      } else {
        gl.viewport(0, 0, target.width, target.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      }
      if (clear) {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    };
  }

  // ========== Pointer ==========

  function PointerPrototype() {
    this.id = null;
    this.texcoordX = 0;
    this.texcoordY = 0;
    this.prevTexcoordX = 0;
    this.prevTexcoordY = 0;
    this.deltaX = 0;
    this.deltaY = 0;
    this.down = false;
    this.moved = false;
    this.initialized = false;
    this.color = { r: 30, g: 0, b: 300 };
  }

  // ========== Color ==========

  // Pre-cached parsed colors to eliminate GC in hot loop
  let cachedCustomColor = { r: 0, g: 0, b: 0 };
  let cachedSecondaryColor = { r: 0, g: 0, b: 0 };
  let cachedPaletteColors = [];

  function cacheParsedColors(updateTexture = true) {
    cachedCustomColor = hexToNormalized(config.CUSTOM_COLOR || '#00f0ff');
    cachedSecondaryColor = hexToNormalized(config.SECONDARY_COLOR || '#ff007f');
    cachedPaletteColors = [];
    if (config.COLOR_PALETTE && config.COLOR_PALETTE.length > 0) {
      for (let i = 0; i < config.COLOR_PALETTE.length; i++) {
        cachedPaletteColors.push(hexToNormalized(config.COLOR_PALETTE[i]));
      }
    }
    if (gl && updateTexture) {
      updatePaletteTexture();
    }
  }

  function generateColor(velocityMag = 0, outColor = { r: 0, g: 0, b: 0 }) {
    if (config.COLOR_MODE === 'single') {
      outColor.r = cachedCustomColor.r;
      outColor.g = cachedCustomColor.g;
      outColor.b = cachedCustomColor.b;
      return outColor;
    } else if (config.COLOR_MODE === 'dual') {
      const t = (Math.sin(colorUpdateTimer * 0.05) + 1) * 0.5;
      const c1 = cachedCustomColor;
      const c2 = cachedSecondaryColor;
      outColor.r = c1.r * (1 - t) + c2.r * t;
      outColor.g = c1.g * (1 - t) + c2.g * t;
      outColor.b = c1.b * (1 - t) + c2.b * t;
      return outColor;
    } else if (config.COLOR_MODE === 'density-palette') {
      // Density mode stores an achromatic scalar field. This keeps palette
      // selection dependent on density instead of the hue used at injection.
      outColor.r = 0.15;
      outColor.g = 0.15;
      outColor.b = 0.15;
      return outColor;
    } else if ((config.COLOR_MODE === 'palette' || config.COLOR_MODE === 'velocity-palette') && cachedPaletteColors.length > 0) {
      const palette = cachedPaletteColors;
      if (palette.length === 1) {
        outColor.r = palette[0].r; outColor.g = palette[0].g; outColor.b = palette[0].b;
        return outColor;
      }
      
      let progress = 0;
      if (config.COLOR_MODE === 'palette') {
        progress = (colorUpdateTimer * 0.05) % palette.length;
      } else {
        progress = (velocityMag / config.VELOCITY_COLOR_SENSITIVITY) * (palette.length - 1);
        progress = Math.max(0, Math.min(progress, palette.length - 1.001));
      }
      
      const index1 = Math.floor(progress);
      const index2 = config.COLOR_MODE === 'palette' ? (index1 + 1) % palette.length : Math.min(index1 + 1, palette.length - 1);
      const t = progress - index1;
      
      const c1 = palette[index1];
      const c2 = palette[index2];
      
      outColor.r = c1.r * (1 - t) + c2.r * t;
      outColor.g = c1.g * (1 - t) + c2.g * t;
      outColor.b = c1.b * (1 - t) + c2.b * t;
      return outColor;
    } else {
      HSVtoRGB(colorUpdateTimer * 0.01, 1.0, 1.0, outColor);
      outColor.r *= 0.15;
      outColor.g *= 0.15;
      outColor.b *= 0.15;
      return outColor;
    }
  }

  function updatePaletteTexture() {
    if (!gl) return;
    if (!paletteTexture) {
      paletteTexture = gl.createTexture();
    }
    const palette = cachedPaletteColors.length > 0
      ? cachedPaletteColors
      : [hexToNormalized('#ffffff')];
    const size = 256;
    const data = new Uint8Array(size * 3);
    for (let i = 0; i < size; i++) {
      let progress = (i / (size - 1)) * (palette.length - 1);
      const index1 = Math.floor(progress);
      const index2 = Math.min(index1 + 1, palette.length - 1);
      const t = progress - index1;
      
      const c1 = palette[index1];
      const c2 = palette[index2];
      
      data[i * 3 + 0] = Math.min(255, Math.max(0, (c1.r * (1 - t) + c2.r * t) / 0.15 * 255));
      data[i * 3 + 1] = Math.min(255, Math.max(0, (c1.g * (1 - t) + c2.g * t) / 0.15 * 255));
      data[i * 3 + 2] = Math.min(255, Math.max(0, (c1.b * (1 - t) + c2.b * t) / 0.15 * 255));
    }
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, paletteTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, size, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, data);
  }

  function hexToNormalized(hex) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return {
      r: ((num >> 16) & 255) / 255 * 0.15,
      g: ((num >> 8) & 255) / 255 * 0.15,
      b: (num & 255) / 255 * 0.15,
    };
  }

  function HSVtoRGB(h, s, v, outColor = { r: 0, g: 0, b: 0 }) {
    let r, g, b;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }
    outColor.r = r;
    outColor.g = g;
    outColor.b = b;
    return outColor;
  }

  // ========== Event handlers ==========

  function getCanvasCoordinates(posX, posY) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const x = (posX - rect.left) / rect.width;
    const y = (posY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return null;
    return { x, y: 1.0 - y };
  }

  function resetPointerMotion(pointer) {
    pointer.moved = false;
    pointer.initialized = false;
    pointer.deltaX = 0;
    pointer.deltaY = 0;
  }

  function updatePointerDownData(pointer, id, posX, posY) {
    const position = getCanvasCoordinates(posX, posY);
    if (!position) return false;

    pointer.id = id;
    pointer.down = true;
    pointer.moved = false;
    pointer.initialized = true;
    pointer.texcoordX = position.x;
    pointer.texcoordY = position.y;
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.deltaX = 0;
    pointer.deltaY = 0;
    generateColor(0, pointer.color);
    return true;
  }

  function updatePointerMoveData(pointer, posX, posY) {
    const position = getCanvasCoordinates(posX, posY);
    if (!position) {
      resetPointerMotion(pointer);
      return false;
    }

    if (!pointer.initialized) {
      pointer.initialized = true;
      pointer.texcoordX = position.x;
      pointer.texcoordY = position.y;
      pointer.prevTexcoordX = position.x;
      pointer.prevTexcoordY = position.y;
      pointer.deltaX = 0;
      pointer.deltaY = 0;
      pointer.moved = false;
      generateColor(0, pointer.color);
      return false;
    }

    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.texcoordX = position.x;
    pointer.texcoordY = position.y;
    pointer.deltaX = correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX);
    pointer.deltaY = correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY);
    pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
    return pointer.moved;
  }

  function updatePointerUpData(pointer, releaseId = false) {
    pointer.down = false;
    pointer.moved = false;
    pointer.deltaX = 0;
    pointer.deltaY = 0;
    if (releaseId) {
      pointer.id = null;
      pointer.initialized = false;
    }
  }

  function correctDeltaX(delta) {
    const aspectRatio = canvas.clientWidth / canvas.clientHeight;
    if (aspectRatio < 1) delta *= aspectRatio;
    return delta;
  }

  function correctDeltaY(delta) {
    const aspectRatio = canvas.clientWidth / canvas.clientHeight;
    if (aspectRatio > 1) delta /= aspectRatio;
    return delta;
  }

  function addManagedEvent(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    eventCleanups.push(() => target.removeEventListener(type, handler, options));
  }

  function teardownEvents() {
    eventCleanups.forEach(cleanup => cleanup());
    eventCleanups = [];
  }

  function getTouchPointer(identifier) {
    let pointer = pointers.find((candidate, index) => index > 0 && candidate.id === identifier);
    if (pointer) return pointer;

    pointer = pointers.find((candidate, index) => index > 0 && candidate.id === null);
    if (!pointer) {
      pointer = new PointerPrototype();
      pointers.push(pointer);
    }
    return pointer;
  }

  function setupEvents() {
    const mousePointer = pointers[0];
    mousePointer.id = -1;

    const onMouseDown = (e) => {
      if (!config.GLOBAL_POINTER_TRACKING && e.target !== canvas) {
        resetPointerMotion(mousePointer);
        return;
      }
      updatePointerDownData(mousePointer, -1, e.clientX, e.clientY);
    };

    const onMouseMove = (e) => {
      if (!config.GLOBAL_POINTER_TRACKING && e.target !== canvas) {
        resetPointerMotion(mousePointer);
        return;
      }
      const pointer = pointers[0];
      if (!pointer.down && !config.POINTER_HOVER_SPLATS) return;
      updatePointerMoveData(pointer, e.clientX, e.clientY);
    };

    const onMouseUp = () => {
      updatePointerUpData(mousePointer);
    };

    const onTouchStart = (e) => {
      if (!config.GLOBAL_POINTER_TRACKING && e.target !== canvas) return;
      if (e.target === canvas && e.cancelable) e.preventDefault();
      const touches = e.changedTouches;
      for (let i = 0; i < touches.length; i++) {
        const pointer = getTouchPointer(touches[i].identifier);
        updatePointerDownData(
          pointer,
          touches[i].identifier,
          touches[i].clientX,
          touches[i].clientY
        );
      }
    };

    const onTouchMove = (e) => {
      if (!config.GLOBAL_POINTER_TRACKING && e.target !== canvas) return;
      if (e.target === canvas && e.cancelable) e.preventDefault();
      const touches = e.changedTouches;
      for (let i = 0; i < touches.length; i++) {
        const pointer = pointers.find((candidate, index) => (
          index > 0 && candidate.id === touches[i].identifier
        ));
        if (!pointer) continue;
        updatePointerMoveData(pointer, touches[i].clientX, touches[i].clientY);
      }
    };

    const onTouchEnd = (e) => {
      const touches = e.changedTouches;
      for (let i = 0; i < touches.length; i++) {
        const pointer = pointers.find((candidate, index) => (
          index > 0 && candidate.id === touches[i].identifier
        ));
        if (!pointer) continue;
        updatePointerUpData(pointer, true);
      }
    };

    addManagedEvent(window, 'mousedown', onMouseDown);
    addManagedEvent(window, 'mousemove', onMouseMove);
    addManagedEvent(window, 'mouseup', onMouseUp);
    addManagedEvent(window, 'touchstart', onTouchStart, { passive: false });
    addManagedEvent(window, 'touchmove', onTouchMove, { passive: false });
    addManagedEvent(window, 'touchend', onTouchEnd);
    addManagedEvent(window, 'touchcancel', onTouchEnd);
    addManagedEvent(window, 'resize', () => { resizePending = true; }, { passive: true });

    if ('ResizeObserver' in window) {
      const resizeObserver = new ResizeObserver(() => { resizePending = true; });
      resizeObserver.observe(canvas);
      eventCleanups.push(() => resizeObserver.disconnect());
    }

    // Start pointer as "active" for hover-based splats
    mousePointer.down = config.POINTER_HOVER_SPLATS;
  }

  function getPixelRatio() {
    return Math.min(window.devicePixelRatio || 1, 2);
  }

  function scaleByPixelRatio(input) {
    return Math.max(1, Math.floor(input * getPixelRatio()));
  }

  // ========== Splat ==========

  const flowColorScratch = { r: 0, g: 0, b: 0 };
  
  function applyBackgroundFlow(now) {
    const time = now / 1000.0 * config.FLOW_BACKGROUND_SPEED;
    
    // 1. Inject global vector field velocity
    flowFieldProgram.bind();
    gl.uniform1i(flowFieldProgram.uniforms.uTarget, velocity.read.attach(0));
    gl.uniform1f(flowFieldProgram.uniforms.uTime, time);
    gl.uniform1f(flowFieldProgram.uniforms.uForce, config.FLOW_BACKGROUND_FORCE);
    blit(velocity.write);
    velocity.swap();

    // 2. Inject dye using phantom pointers (so it moves freely via the vector field)
    programs_splat.bind();
    const numPointers = 3;
    // Faintness multiplier. If faintness is 8.0, multiplier is 0.4.
    const faintnessMult = config.FLOW_BACKGROUND_FAINTNESS * 0.05; 
    
    // Shared uniform bindings
    gl.uniform1i(programs_splat.uniforms.uTarget, dye.read.attach(0));
    gl.uniform1f(programs_splat.uniforms.aspectRatio, canvas.clientWidth / canvas.clientHeight);
    gl.uniform1f(programs_splat.uniforms.radius, correctRadius(0.1)); // relatively small radius so it looks like mist

    for (let i = 0; i < numPointers; i++) {
      // Smooth Lissajous curves for each phantom pointer
      const pTime = time * 0.5 + i * 2.0;
      const x = 0.5 + 0.4 * Math.sin(pTime * 1.13 + i);
      const y = 0.5 + 0.4 * Math.cos(pTime * 0.87 - i);
      
      const px = 0.5 + 0.4 * Math.sin((pTime - 0.01) * 1.13 + i);
      const py = 0.5 + 0.4 * Math.cos((pTime - 0.01) * 0.87 - i);
      
      generateColor(5000 + i * 1000, flowColorScratch); // Standard high velocity to get full color cycle
      
      gl.uniform2f(programs_splat.uniforms.point, x, y);
      gl.uniform2f(programs_splat.uniforms.pointPrev, px, py);
      gl.uniform3f(
        programs_splat.uniforms.color,
        flowColorScratch.r * faintnessMult,
        flowColorScratch.g * faintnessMult,
        flowColorScratch.b * faintnessMult
      );
      
      blit(dye.write);
      dye.swap();
      // Re-attach target after swap
      gl.uniform1i(programs_splat.uniforms.uTarget, dye.read.attach(0));
    }
  }

  function splatPointer(pointer) {
    const dx = pointer.deltaX * config.SPLAT_FORCE;
    const dy = pointer.deltaY * config.SPLAT_FORCE;
    splatAtLocation(pointer.texcoordX, pointer.texcoordY, pointer.prevTexcoordX, pointer.prevTexcoordY, dx, dy, pointer.color);
  }

  function splatAtLocation(x, y, prevX, prevY, dx, dy, color) {
    programs_splat.bind();
    gl.uniform1i(programs_splat.uniforms.uTarget, velocity.read.attach(0));
    gl.uniform1f(programs_splat.uniforms.aspectRatio, canvas.clientWidth / canvas.clientHeight);
    gl.uniform2f(programs_splat.uniforms.point, x, y);
    gl.uniform2f(programs_splat.uniforms.pointPrev, prevX, prevY);
    gl.uniform3f(programs_splat.uniforms.color, dx, dy, 0.0);
    gl.uniform1f(programs_splat.uniforms.radius, correctRadius(config.SPLAT_RADIUS / 100.0));
    blit(velocity.write);
    velocity.swap();

    gl.uniform1i(programs_splat.uniforms.uTarget, dye.read.attach(0));
    gl.uniform3f(programs_splat.uniforms.color, color.r, color.g, color.b);
    blit(dye.write);
    dye.swap();
  }

  function correctRadius(radius) {
    const aspectRatio = canvas.clientWidth / canvas.clientHeight;
    if (aspectRatio > 1) radius *= aspectRatio;
    return radius;
  }

  function multipleSplats(amount) {
    const tempColor = { r: 0, g: 0, b: 0 };
    for (let i = 0; i < amount; i++) {
      const dx = 1000 * (Math.random() - 0.5);
      const dy = 1000 * (Math.random() - 0.5);
      const velocityMag = Math.sqrt(dx*dx + dy*dy);
      generateColor(velocityMag, tempColor);
      tempColor.r *= 10.0;
      tempColor.g *= 10.0;
      tempColor.b *= 10.0;
      const x = Math.random();
      const y = Math.random();
      splatAtLocation(x, y, x, y, dx, dy, tempColor);
    }
  }

  // Programs stored with explicit names to avoid naming conflicts
  let programs_splat;

  // ========== Init ==========

  function initPrograms() {
    copyProgram = new GLProgram(baseVertexShader, copyShader);
    clearProgram = new GLProgram(baseVertexShader, clearShader);
    programs_splat = new GLProgram(baseVertexShader, splatShader);
    advectionProgram = new GLProgram(baseVertexShader, advectionShader);
    divergenceProgram = new GLProgram(baseVertexShader, divergenceShader);
    curlProgram = new GLProgram(baseVertexShader, curlShader);
    vorticityProgram = new GLProgram(baseVertexShader, vorticityShader);
    pressureProgram = new GLProgram(baseVertexShader, pressureShader);
    gradientSubtractProgram = new GLProgram(baseVertexShader, gradientSubtractShader);
    bloomPrefilterProgram = new GLProgram(baseVertexShader, bloomPrefilterShader);
    bloomBlurProgram = new GLProgram(baseVertexShader, bloomBlurShader);
    bloomFinalProgram = new GLProgram(baseVertexShader, bloomFinalShader);
    displayMaterial = new GLProgram(baseVertexShader, displayShader);
    flowFieldProgram = new GLProgram(baseVertexShader, flowFieldShader);
  }

  function destroyPrograms() {
    [
      copyProgram,
      clearProgram,
      programs_splat,
      advectionProgram,
      divergenceProgram,
      curlProgram,
      vorticityProgram,
      pressureProgram,
      gradientSubtractProgram,
      bloomPrefilterProgram,
      bloomBlurProgram,
      bloomFinalProgram,
      displayMaterial,
      flowFieldProgram,
    ].forEach(program => program?.destroy());

    copyProgram = null;
    clearProgram = null;
    programs_splat = null;
    advectionProgram = null;
    divergenceProgram = null;
    curlProgram = null;
    vorticityProgram = null;
    pressureProgram = null;
    gradientSubtractProgram = null;
    bloomPrefilterProgram = null;
    bloomBlurProgram = null;
    bloomFinalProgram = null;
    displayMaterial = null;
    flowFieldProgram = null;
  }

  function initFramebuffers(resizeBloom = true) {
    const simRes = getResolution(config.SIM_RESOLUTION);
    const dyeRes = getResolution(config.DYE_RESOLUTION);

    const texType = ext.halfFloatTexType;
    const rgba = ext.formatRGBA;
    const rg = ext.formatRG;
    const r = ext.formatR;
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    if (!rgba || !rg || !r) {
      throw new Error('This browser cannot create the render textures required by SplashCursor.');
    }

    gl.disable(gl.BLEND);

    if (dye == null) {
      dye = createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
    } else {
      dye = resizeDoubleFBO(dye, dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
    }

    if (velocity == null) {
      velocity = createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);
    } else {
      velocity = resizeDoubleFBO(velocity, simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);
    }

    destroyFBO(divergence);
    destroyFBO(curl);
    destroyDoubleFBO(pressure);
    divergence = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    curl = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    pressure = createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);

    if (resizeBloom) initBloomFramebuffers();
  }

  function initBloomFramebuffers() {
    destroyBloomFramebuffers();
    if (!config.BLOOM) return;

    const res = getResolution(config.BLOOM_RESOLUTION);
    const texType = ext.halfFloatTexType;
    const rgba = ext.formatRGBA;
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    bloom = createFBO(res.width, res.height, rgba.internalFormat, rgba.format, texType, filtering);

    for (let i = 0; i < config.BLOOM_ITERATIONS; i++) {
      const width = res.width >> (i + 1);
      const height = res.height >> (i + 1);
      if (width < 2 || height < 2) break;
      bloomFramebuffers.push(createFBO(width, height, rgba.internalFormat, rgba.format, texType, filtering));
    }
  }

  function destroyBloomFramebuffers() {
    destroyFBO(bloom);
    bloomFramebuffers.forEach(destroyFBO);
    bloom = null;
    bloomFramebuffers = [];
  }

  function destroyFramebuffers() {
    destroyDoubleFBO(dye);
    destroyDoubleFBO(velocity);
    destroyFBO(divergence);
    destroyFBO(curl);
    destroyDoubleFBO(pressure);
    destroyBloomFramebuffers();

    dye = null;
    velocity = null;
    divergence = null;
    curl = null;
    pressure = null;
  }

  // ========== Simulation step ==========

  function step(dt) {
    gl.disable(gl.BLEND);

    curlProgram.bind();
    gl.uniform2f(curlProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.attach(0));
    blit(curl);

    vorticityProgram.bind();
    gl.uniform2f(vorticityProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(vorticityProgram.uniforms.uCurl, curl.attach(1));
    gl.uniform1f(vorticityProgram.uniforms.curl, config.CURL);
    gl.uniform1f(vorticityProgram.uniforms.dt, dt);
    blit(velocity.write);
    velocity.swap();

    divergenceProgram.bind();
    gl.uniform2f(divergenceProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read.attach(0));
    blit(divergence);

    clearProgram.bind();
    gl.uniform1i(clearProgram.uniforms.uTexture, pressure.read.attach(0));
    gl.uniform1f(clearProgram.uniforms.value, config.PRESSURE);
    blit(pressure.write);
    pressure.swap();

    pressureProgram.bind();
    gl.uniform2f(pressureProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence.attach(0));
    for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
      gl.uniform1i(pressureProgram.uniforms.uPressure, pressure.read.attach(1));
      blit(pressure.write);
      pressure.swap();
    }

    gradientSubtractProgram.bind();
    gl.uniform2f(gradientSubtractProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(gradientSubtractProgram.uniforms.uPressure, pressure.read.attach(0));
    gl.uniform1i(gradientSubtractProgram.uniforms.uVelocity, velocity.read.attach(1));
    blit(velocity.write);
    velocity.swap();

    advectionProgram.bind();
    gl.uniform2f(advectionProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
    let velocityId = velocity.read.attach(0);
    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocityId);
    gl.uniform1i(advectionProgram.uniforms.uSource, velocityId);
    gl.uniform1f(advectionProgram.uniforms.dt, dt);
    gl.uniform1f(advectionProgram.uniforms.dissipation, config.VELOCITY_DISSIPATION);
    blit(velocity.write);
    velocity.swap();

    gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(advectionProgram.uniforms.uSource, dye.read.attach(1));
    gl.uniform1f(advectionProgram.uniforms.dissipation, config.DENSITY_DISSIPATION);
    blit(dye.write);
    dye.swap();
  }

  // ========== Bloom rendering ==========

  function applyBloom(source, destination) {
    if (!source || !destination || bloomFramebuffers.length < 2) return;

    let last = destination;
    gl.disable(gl.BLEND);

    bloomPrefilterProgram.bind();
    const knee = config.BLOOM_THRESHOLD * config.BLOOM_SOFT_KNEE + 0.0001;
    const curve0 = config.BLOOM_THRESHOLD - knee;
    const curve1 = knee * 2.0;
    const curve2 = 0.25 / knee;
    gl.uniform3f(bloomPrefilterProgram.uniforms.curve, curve0, curve1, curve2);
    gl.uniform1f(bloomPrefilterProgram.uniforms.threshold, config.BLOOM_THRESHOLD);
    gl.uniform1i(bloomPrefilterProgram.uniforms.uTexture, source.attach(0));
    
    gl.uniform1f(bloomPrefilterProgram.uniforms.uColorMode, config.COLOR_MODE === 'density-palette' ? 1.0 : 0.0);
    if (config.COLOR_MODE === 'density-palette' && paletteTexture) {
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, paletteTexture);
      gl.uniform1i(bloomPrefilterProgram.uniforms.uPaletteTexture, 2);
      gl.uniform1f(bloomPrefilterProgram.uniforms.uDensitySensitivity, config.DENSITY_COLOR_SENSITIVITY / 10.0);
    }
    
    blit(last);

    bloomBlurProgram.bind();
    for (let i = 0; i < bloomFramebuffers.length; i++) {
      const dest = bloomFramebuffers[i];
      gl.uniform2f(bloomBlurProgram.uniforms.texelSize, last.texelSizeX, last.texelSizeY);
      gl.uniform1i(bloomBlurProgram.uniforms.uTexture, last.attach(0));
      blit(dest);
      last = dest;
    }

    gl.blendFunc(gl.ONE, gl.ONE);
    gl.enable(gl.BLEND);

    for (let i = bloomFramebuffers.length - 2; i >= 0; i--) {
      const baseFBO = bloomFramebuffers[i];
      gl.uniform2f(bloomBlurProgram.uniforms.texelSize, last.texelSizeX, last.texelSizeY);
      gl.uniform1i(bloomBlurProgram.uniforms.uTexture, last.attach(0));
      gl.viewport(0, 0, baseFBO.width, baseFBO.height);
      blit(baseFBO);
      last = baseFBO;
    }

    gl.disable(gl.BLEND);

    bloomFinalProgram.bind();
    gl.uniform1i(bloomFinalProgram.uniforms.uTexture, last.attach(0));
    gl.uniform1f(bloomFinalProgram.uniforms.intensity, config.BLOOM_INTENSITY);
    blit(destination);
  }

  // ========== Display ==========



  function renderDisplay() {
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;

    displayMaterial.bind();
    gl.uniform2f(displayMaterial.uniforms.texelSize, 1.0 / width, 1.0 / height);
    gl.uniform1i(displayMaterial.uniforms.uTexture, dye.read.attach(0));
    
    gl.uniform1f(displayMaterial.uniforms.uColorMode, config.COLOR_MODE === 'density-palette' ? 1.0 : 0.0);
    if (config.COLOR_MODE === 'density-palette' && paletteTexture) {
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, paletteTexture);
      gl.uniform1i(displayMaterial.uniforms.uPaletteTexture, 2);
      gl.uniform1f(displayMaterial.uniforms.uDensitySensitivity, config.DENSITY_COLOR_SENSITIVITY / 10.0);
    }
    
    gl.uniform1f(displayMaterial.uniforms.uShading, config.SHADING ? 1.0 : 0.0);
    gl.uniform1f(displayMaterial.uniforms.uTransparent, config.TRANSPARENT ? 1.0 : 0.0);

    if (config.BLOOM && bloom) {
      gl.uniform1f(displayMaterial.uniforms.uBloomEnabled, 1.0);
      gl.uniform1i(displayMaterial.uniforms.uBloom, bloom.attach(1));
    } else {
      gl.uniform1f(displayMaterial.uniforms.uBloomEnabled, 0.0);
    }

    const bg = config.BACK_COLOR;
    gl.uniform3f(displayMaterial.uniforms.uBackColor, bg.r / 255.0, bg.g / 255.0, bg.b / 255.0);

    blit(null);
  }

  // ========== Main update loop ==========

  function resizeCanvas() {
    const width = scaleByPixelRatio(canvas.clientWidth || 1);
    const height = scaleByPixelRatio(canvas.clientHeight || 1);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      initFramebuffers();
      return true;
    }
    return false;
  }

  function update(timestamp) {
    if (!isRunning || !gl) return;

    const now = Number.isFinite(timestamp) ? timestamp : performance.now();
    let dt = (now - lastUpdateTime) / 1000;
    dt = clamp(dt, 0, 1 / 30);
    lastUpdateTime = now;

    if (!config.PAUSED) {
      const pixelRatio = getPixelRatio();
      if (pixelRatio !== lastPixelRatio) resizePending = true;
      if (resizePending) {
        resizeCanvas();
        resizePending = false;
        lastPixelRatio = pixelRatio;
      }
      colorUpdateTimer += dt * config.COLOR_UPDATE_SPEED;
      applyInputs();
      if (config.FLOW_BACKGROUND_ENABLED) {
        applyBackgroundFlow(now);
      }
      step(dt);
      if (config.BLOOM) {
        applyBloom(dye.read, bloom);
      }
    }

    renderDisplay();

    animationFrameId = requestAnimationFrame(update);
  }

  function applyInputs() {
    for (let i = 0; i < pointers.length; i++) {
      const p = pointers[i];
      if (p.moved) {
        p.moved = false;
        const velocityMag = Math.sqrt(p.deltaX*p.deltaX + p.deltaY*p.deltaY) * config.SPLAT_FORCE;
        generateColor(velocityMag, p.color);
        splatPointer(p);
      }
      // Keep pointer "alive" for hover mode
      if (config.POINTER_HOVER_SPLATS) {
        p.down = true;
      }
    }
  }

  function startAutoSplats() {
    if (autoSplatTimer !== null) clearInterval(autoSplatTimer);
    autoSplatTimer = null;
    if (!config.AUTO_SPLATS) return;

    autoSplatTimer = setInterval(() => {
      if (!config.PAUSED && isRunning) {
        multipleSplats(Math.floor(1 + Math.random() * 2));
      }
    }, config.AUTO_SPLAT_INTERVAL);
  }

  function destroyEngine() {
    isRunning = false;

    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    if (autoSplatTimer !== null) {
      clearInterval(autoSplatTimer);
      autoSplatTimer = null;
    }

    teardownEvents();

    if (gl) {
      destroyFramebuffers();
      destroyPrograms();
      if (paletteTexture) gl.deleteTexture(paletteTexture);
      if (quadVertexBuffer) gl.deleteBuffer(quadVertexBuffer);
      if (quadIndexBuffer) gl.deleteBuffer(quadIndexBuffer);
    }

    paletteTexture = null;
    quadVertexBuffer = null;
    quadIndexBuffer = null;
    resizePending = true;
    lastPixelRatio = 1;
    blit = null;
    pointers = [];
    cachedPaletteColors = [];
    canvas = null;
    gl = null;
    ext = null;
  }

  // ========== Public API ==========

  return {
    init(canvasElement, userConfig = {}) {
      if (!(canvasElement instanceof HTMLCanvasElement)) {
        console.error('SplashCursorEngine.init requires a canvas element.');
        return false;
      }

      if (canvas || gl || isRunning) destroyEngine();

      config = normalizeConfig(userConfig, defaultConfig);
      canvas = canvasElement;

      const context = getWebGLContext(canvas);
      if (!context) {
        console.error('SplashCursor requires WebGL, but it is not available in this browser.');
        canvas = null;
        return false;
      }

      gl = context.gl;
      ext = context.ext;

      if (!ext.supportLinearFiltering) {
        config.DYE_RESOLUTION = 512;
        config.SHADING = false;
        config.BLOOM = false;
      }

      try {
        cacheParsedColors();
        initBlit();
        initPrograms();
        resizeCanvas();
        resizePending = false;
        lastPixelRatio = getPixelRatio();
        if (!dye || !velocity) initFramebuffers();
      } catch (error) {
        console.error('SplashCursor failed to initialize:', error);
        destroyEngine();
        return false;
      }

      pointers = [new PointerPrototype()];
      setupEvents();

      isRunning = true;
      colorUpdateTimer = 0;
      lastUpdateTime = performance.now();
      startAutoSplats();
      animationFrameId = requestAnimationFrame(update);

      multipleSplats(Math.floor(Math.random() * 5) + 5);

      return true;
    },

    updateConfig(newParams) {
      if (!newParams || typeof newParams !== 'object' || Array.isArray(newParams)) {
        return cloneConfig(config);
      }

      const previousConfig = config;
      const nextConfig = normalizeConfig(newParams, config);
      if (ext && !ext.supportLinearFiltering) {
        nextConfig.DYE_RESOLUTION = Math.min(nextConfig.DYE_RESOLUTION, 512);
        nextConfig.SHADING = false;
        nextConfig.BLOOM = false;
      }
      const needsSimulationResize =
        nextConfig.SIM_RESOLUTION !== previousConfig.SIM_RESOLUTION ||
        nextConfig.DYE_RESOLUTION !== previousConfig.DYE_RESOLUTION;
      const needsBloomResize =
        nextConfig.BLOOM_RESOLUTION !== previousConfig.BLOOM_RESOLUTION ||
        nextConfig.BLOOM_ITERATIONS !== previousConfig.BLOOM_ITERATIONS;

      const paletteChanged = nextConfig.COLOR_PALETTE.length !== previousConfig.COLOR_PALETTE.length ||
        nextConfig.COLOR_PALETTE.some((color, index) => color !== previousConfig.COLOR_PALETTE[index]);
      const parsedColorsChanged = paletteChanged ||
        nextConfig.CUSTOM_COLOR !== previousConfig.CUSTOM_COLOR ||
        nextConfig.SECONDARY_COLOR !== previousConfig.SECONDARY_COLOR;
      const autoSplatsChanged = nextConfig.AUTO_SPLATS !== previousConfig.AUTO_SPLATS ||
        nextConfig.AUTO_SPLAT_INTERVAL !== previousConfig.AUTO_SPLAT_INTERVAL;
      const hoverChanged = nextConfig.POINTER_HOVER_SPLATS !== previousConfig.POINTER_HOVER_SPLATS;
      const bloomChanged = nextConfig.BLOOM !== previousConfig.BLOOM;

      config = nextConfig;
      if (parsedColorsChanged) cacheParsedColors(paletteChanged);

      if (needsSimulationResize && gl) {
        initFramebuffers(false);
      }
      if ((needsBloomResize || bloomChanged) && gl) {
        initBloomFramebuffers();
      }

      if (autoSplatsChanged) {
        startAutoSplats();
      }

      if (hoverChanged && pointers[0]) {
        pointers[0].down = config.POINTER_HOVER_SPLATS;
        resetPointerMotion(pointers[0]);
      }

      return cloneConfig(config);
    },

    getConfig() {
      return cloneConfig(config);
    },

    triggerSplats(count = 5) {
      if (!gl || !dye || !velocity) return;
      const safeCount = clamp(Math.round(Number(count) || 0), 0, 50);
      multipleSplats(safeCount);
    },

    reset() {
      if (!gl) return;
      config = normalizeConfig(defaultConfig, defaultConfig);
      if (!ext.supportLinearFiltering) {
        config.DYE_RESOLUTION = 512;
        config.SHADING = false;
        config.BLOOM = false;
      }
      cacheParsedColors();
      colorUpdateTimer = 0;
      startAutoSplats();
      if (pointers[0]) {
        pointers[0].down = config.POINTER_HOVER_SPLATS;
        resetPointerMotion(pointers[0]);
      }
      destroyFramebuffers();
      initFramebuffers();
      multipleSplats(5);
    },

    destroy() {
      destroyEngine();
    },
  };
})();
