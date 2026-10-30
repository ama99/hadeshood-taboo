import React, { useState } from 'react';
import {
  Globe,
  Volume2,
  VolumeX,
  HelpCircle,
  BookOpen,
  Copy,
  Check,
  Hash,
  Edit3,
  PlusCircle,
  Sun,
  Moon,
} from 'lucide-react';
import { translations, formatNumber } from '../i18n/translations';
import type { DiscordUserProfile, Language, ThemeMode } from '../types/game';
import { soundFX } from '../utils/sound';

interface TopBarProps {
  lang: Language;
  onToggleLang: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  profile: DiscordUserProfile;
  roomId: string;
  onChangeRoom: (newRoomId: string) => void;
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
  soundEnabled,
  onToggleSound,
  profile,
  roomId,
  onChangeRoom,
  onOpenRules,
  onOpenDeckBrowser,
  onOpenCustomCard,
  onOpenEditProfile,
  totalCardsCount,
}) => {
  const t = translations[lang];
  const [copied, setCopied] = useState(false);
  const [showRoomInput, setShowRoomInput] = useState(false);
  const [roomInputVal, setRoomInputVal] = useState('');

  const handleCopyRoom = () => {
    soundFX.playClick();
    navigator.clipboard?.writeText(roomId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomInputVal.trim()) return;
    soundFX.playClick();
    onChangeRoom(roomInputVal.trim().toUpperCase());
    setRoomInputVal('');
    setShowRoomInput(false);
  };

  return (
    <header className="sticky top-0 z-30 w-full backdrop-blur-xl bg-slate-950/75 border-b border-white/10 px-3 sm:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
        {/* Brand Title */}
        <div className="flex items-center gap-2.5">
          <h1 className="text-lg sm:text-xl font-black tracking-tight bg-gradient-to-r from-cyan-300 via-white to-rose-300 bg-clip-text text-transparent">
            {t.appTitle}
          </h1>
          <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            Discord Activity
          </span>
        </div>

        {/* Center Room Badge */}
        <div className="relative flex items-center gap-1.5 bg-slate-900/90 border border-white/10 rounded-xl px-2.5 py-1.5">
          <Hash className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs text-slate-400 hidden sm:inline">{t.roomCode}:</span>
          <span className="text-xs sm:text-sm font-mono font-bold text-cyan-300 tracking-wider px-1">
            {roomId}
          </span>
          <button
            onClick={handleCopyRoom}
            title={t.copyRoom}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => {
              soundFX.playClick();
              setShowRoomInput((prev) => !prev);
            }}
            className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 transition cursor-pointer"
          >
            {t.changeRoom}
          </button>

          {showRoomInput && (
            <form
              onSubmit={handleRoomSubmit}
              className="absolute top-full mt-2 start-0 bg-slate-900 border border-white/15 rounded-xl p-2 shadow-2xl flex items-center gap-1.5 z-50 min-w-[230px]"
            >
              <input
                type="text"
                value={roomInputVal}
                onChange={(e) => setRoomInputVal(e.target.value)}
                placeholder={t.joinRoomPlaceholder}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-400"
                autoFocus
              />
              <button
                type="submit"
                className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition cursor-pointer shrink-0"
              >
                {t.joinBtn}
              </button>
            </form>
          )}
        </div>

        {/* Right Controls: User Profile, Deck Browser, Rules, Sound, Language */}
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
              src={profile.avatarUrl}
              alt={profile.displayName}
              className="w-6 h-6 rounded-full object-cover ring-1 ring-cyan-400/50 bg-slate-800"
            />
            <div className="text-start hidden lg:block">
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
