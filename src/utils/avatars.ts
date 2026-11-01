/**
 * CSP-safe inline SVG Data URI avatars for Discord Activity iframe & browsers.
 * Discord Activities block external image domains (like api.dicebear.com) via Content-Security-Policy,
 * whereas `data:image/svg+xml;utf8,...` URIs render 100% natively with zero network requests.
 */

function createSvgAvatar(
  bgStart: string,
  bgEnd: string,
  accent: string,
  faceIconSvg: string
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgStart}" />
        <stop offset="100%" stop-color="${bgEnd}" />
      </linearGradient>
    </defs>
    <rect width="120" height="120" rx="60" fill="url(#g)" />
    <circle cx="60" cy="60" r="54" fill="none" stroke="${accent}" stroke-opacity="0.35" stroke-width="3" />
    ${faceIconSvg}
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const AVATAR_PRESETS: string[] = [
  // 1. Cyber Cyan Visor
  createSvgAvatar(
    '#083344',
    '#06b6d4',
    '#67e8f9',
    `<circle cx="60" cy="48" r="22" fill="#ecfeff"/>
     <path d="M26 106 C26 78 94 78 94 106" fill="#ecfeff"/>
     <rect x="42" y="42" width="36" height="11" rx="5.5" fill="#0891b2"/>
     <circle cx="51" cy="47.5" r="2.5" fill="#67e8f9"/>
     <circle cx="69" cy="47.5" r="2.5" fill="#67e8f9"/>`
  ),
  // 2. Ruby Crimson Kitsune
  createSvgAvatar(
    '#4c0519',
    '#e11d48',
    '#fda4af',
    `<circle cx="60" cy="50" r="21" fill="#fff1f2"/>
     <polygon points="40,38 46,20 56,34" fill="#fda4af"/>
     <polygon points="80,38 74,20 64,34" fill="#fda4af"/>
     <path d="M27 106 C27 79 93 79 93 106" fill="#fff1f2"/>
     <circle cx="52" cy="49" r="3" fill="#be123c"/>
     <circle cx="68" cy="49" r="3" fill="#be123c"/>
     <path d="M54 58 Q60 63 66 58" stroke="#be123c" stroke-width="2.5" fill="none" stroke-linecap="round"/>`
  ),
  // 3. Royal Violet Mage
  createSvgAvatar(
    '#2e1065',
    '#7c3aed',
    '#c4b5fd',
    `<circle cx="60" cy="49" r="21" fill="#f5f3ff"/>
     <path d="M27 106 C27 79 93 79 93 106" fill="#f5f3ff"/>
     <circle cx="52" cy="48" r="3" fill="#5b21b6"/>
     <circle cx="68" cy="48" r="3" fill="#5b21b6"/>
     <polygon points="60,16 42,36 78,36" fill="#c4b5fd"/>`
  ),
  // 4. Emerald Ninja
  createSvgAvatar(
    '#064e3b',
    '#10b981',
    '#6ee7b7',
    `<circle cx="60" cy="49" r="22" fill="#065f46"/>
     <rect x="40" y="41" width="40" height="13" rx="6" fill="#ecfdf5"/>
     <circle cx="51" cy="47.5" r="3" fill="#047857"/>
     <circle cx="69" cy="47.5" r="3" fill="#047857"/>
     <path d="M26 106 C26 79 94 79 94 106" fill="#ecfdf5"/>`
  ),
  // 5. Solar Gold Crown
  createSvgAvatar(
    '#451a03',
    '#f59e0b',
    '#fde68a',
    `<circle cx="60" cy="51" r="20" fill="#fffbeb"/>
     <polygon points="41,35 47,21 60,31 73,21 79,35" fill="#fde68a"/>
     <path d="M28 106 C28 80 92 80 92 106" fill="#fffbeb"/>
     <circle cx="52" cy="50" r="3" fill="#b45309"/>
     <circle cx="68" cy="50" r="3" fill="#b45309"/>
     <path d="M53 58 Q60 63 67 58" stroke="#b45309" stroke-width="2.5" fill="none" stroke-linecap="round"/>`
  ),
  // 6. Neon Rose Robot
  createSvgAvatar(
    '#500724',
    '#db2777',
    '#f9a8d4',
    `<rect x="38" y="30" width="44" height="38" rx="10" fill="#fdf2f8"/>
     <line x1="60" y1="18" x2="60" y2="30" stroke="#f9a8d4" stroke-width="4" stroke-linecap="round"/>
     <circle cx="60" cy="17" r="4" fill="#f9a8d4"/>
     <circle cx="50" cy="47" r="4" fill="#be185d"/>
     <circle cx="70" cy="47" r="4" fill="#be185d"/>
     <rect x="49" y="57" width="22" height="4" rx="2" fill="#be185d"/>
     <path d="M28 106 C28 80 92 80 92 106" fill="#fdf2f8"/>`
  ),
  // 7. Cobalt Electric Shades
  createSvgAvatar(
    '#172554',
    '#2563eb',
    '#93c5fd',
    `<circle cx="60" cy="49" r="21" fill="#eff6ff"/>
     <rect x="40" y="42" width="18" height="11" rx="3" fill="#1d4ed8"/>
     <rect x="62" y="42" width="18" height="11" rx="3" fill="#1d4ed8"/>
     <line x1="58" y1="46" x2="62" y2="46" stroke="#1d4ed8" stroke-width="3"/>
     <path d="M54 59 Q60 63 66 59" stroke="#1d4ed8" stroke-width="2.5" fill="none" stroke-linecap="round"/>
     <path d="M27 106 C27 79 93 79 93 106" fill="#eff6ff"/>`
  ),
  // 8. Sunset Fuchsia Cat
  createSvgAvatar(
    '#3b0764',
    '#c026d3',
    '#f0abfc',
    `<circle cx="60" cy="51" r="20" fill="#fdf4ff"/>
     <polygon points="41,41 44,23 56,35" fill="#f0abfc"/>
     <polygon points="79,41 76,23 64,35" fill="#f0abfc"/>
     <circle cx="52" cy="50" r="3" fill="#86198f"/>
     <circle cx="68" cy="50" r="3" fill="#86198f"/>
     <polygon points="60,56 57,53 63,53" fill="#e879f9"/>
     <path d="M28 106 C28 80 92 80 92 106" fill="#fdf4ff"/>`
  ),
];

export function getSafeAvatarUrl(url?: string, seedIndex = 0): string {
  if (
    !url ||
    url.includes('api.dicebear.com') ||
    url.includes('undefined')
  ) {
    return AVATAR_PRESETS[Math.abs(seedIndex) % AVATAR_PRESETS.length];
  }
  return url;
}
