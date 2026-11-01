import React from 'react';
import {
  Globe,
  Volume2,
  VolumeX,
  HelpCircle,
  BookOpen,
  Edit3,
  PlusCircle,
  Sun,
  Moon,
  Flame,
} from 'lucide-react';
import { translations, formatNumber } from '../i18n/translations';
import type { DiscordUserProfile, Language, ThemeMode } from '../types/game';
import { AVATAR_PRESETS, getSafeAvatarUrl } from '../utils/avatars';
import { soundFX } from '../utils/sound';

interface TopBarProps {
  lang: Language;
  onToggleLang: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  smokeEnabled: boolean;
  onToggleSmoke: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  profile: DiscordUserProfile;
  onOpenRules: () => void;
  onOpenDeckBrowser: () => void;
  onOpenCustomCard: () => void;
  onOpenEditProfile: () => void;
  totalCardsCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  lang,
  onToggleLang,
  theme,
  onToggleTheme,
  smokeEnabled,
  onToggleSmoke,
  soundEnabled,
  onToggleSound,
  profile,
  onOpenRules,
  onOpenDeckBrowser,
  onOpenCustomCard,
  onOpenEditProfile,
  totalCardsCount,
}) => {
  const t = translations[lang];

  return (
    <header className="sticky top-0 z-30 w-full backdrop-blur-xl bg-slate-950/75 border-b border-white/10 px-3 sm:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
        {/* Brand Title */}
        <div className="flex items-center gap-2.5">
          <h1 className="text-lg sm:text-xl font-black tracking-tight bg-gradient-to-r from-cyan-300 via-white to-rose-300 bg-clip-text text-transparent">
            {t.appTitle}
          </h1>
        </div>

        {/* Right Controls: User Profile, Deck Browser, Rules, Smoke, Theme, Sound, Language */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Discord / Local Profile Pill */}
          <button
            onClick={() => {
              soundFX.playClick();
              onOpenEditProfile();
            }}
            title={t.editProfile}
            className="flex items-center gap-2 bg-slate-900/80 hover:bg-slate-800/80 border border-white/10 rounded-xl px-2.5 py-1.5 transition cursor-pointer"
          >
            <img
              src={getSafeAvatarUrl(profile.avatarUrl, 0)}
              alt=""
              onError={(e) => {
                e.currentTarget.src = AVATAR_PRESETS[0];
              }}
              className="w-6 h-6 rounded-full object-cover ring-1 ring-cyan-400/50 bg-slate-800 shrink-0"
            />
            <div className="text-start hidden sm:block">
              <div className="text-xs font-bold text-slate-100 leading-none flex items-center gap-1.5">
                <span className="truncate max-w-[120px]">{profile.displayName}</span>
                <Edit3 className="w-3 h-3 text-slate-400" />
              </div>
            </div>
          </button>

          {/* Add Custom Card Quick Button */}
          <button
            onClick={() => {
              soundFX.playClick();
              onOpenCustomCard();
            }}
            title={t.customCardBtn}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden xl:inline">{t.customCardBtn}</span>
          </button>

          {/* Card Deck Browser Button */}
          <button
            onClick={() => {
              soundFX.playClick();
              onOpenDeckBrowser();
            }}
            title={t.deckBrowser}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-200 text-xs font-semibold transition cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span className="hidden md:inline">{t.deckBrowser}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
              {formatNumber(totalCardsCount, lang)}
            </span>
          </button>

          {/* How to Play Button */}
          <button
            onClick={() => {
              soundFX.playClick();
              onOpenRules();
            }}
            title={t.howToPlay}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
          </button>

          {/* Smoke Simulation Toggle (ON / OFF) */}
          <button
            onClick={() => {
              soundFX.playClick();
              onToggleSmoke();
            }}
            title={smokeEnabled ? t.smokeOn : t.smokeOff}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              smokeEnabled
                ? 'bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-400/40 text-cyan-300'
                : 'bg-slate-900 hover:bg-slate-800 border-white/10 text-slate-500'
            }`}
          >
            <Flame className={`w-4 h-4 ${smokeEnabled ? 'text-cyan-400' : 'text-slate-500'}`} />
          </button>

          {/* Theme Toggle (Dark <-> Light) */}
          <button
            onClick={() => {
              soundFX.playClick();
              onToggleTheme();
            }}
            title={theme === 'dark' ? t.lightMode : t.darkMode}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white transition cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-500" />
            )}
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? t.soundOn : t.soundOff}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white transition cursor-pointer"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-cyan-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-rose-400" />
            )}
          </button>

          {/* Language Switcher (Persian RTL <-> English LTR) */}
          <button
            onClick={() => {
              soundFX.playClick();
              onToggleLang();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 hover:from-cyan-500/30 hover:to-indigo-500/30 border border-cyan-400/30 text-cyan-200 text-xs font-bold transition cursor-pointer shadow-sm"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t.switchLang}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
