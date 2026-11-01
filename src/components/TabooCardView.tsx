import React from 'react';
import {
  Ban,
  CheckCircle2,
  FastForward,
  AlertOctagon,
  Eye,
  EyeOff,
  Sparkles,
  HelpCircle,
  Volume2,
  ShieldAlert,
} from 'lucide-react';
import { translations, formatNumber } from '../i18n/translations';
import type { Language, TurnState } from '../types/game';
import { soundFX } from '../utils/sound';

export type RolePerspective = 'DESCRIBER' | 'GUESSER' | 'WATCHER';

interface TabooCardViewProps {
  turn: TurnState;
  roleView: RolePerspective;
  isSpectator?: boolean;
  lang: Language;
  describerName: string;
  onCorrect: () => void;
  onSkip: () => void;
  onBuzzTaboo: (violatedWord?: string) => void;
  onRevealHint: () => void;
}

export const TabooCardView: React.FC<TabooCardViewProps> = ({
  turn,
  roleView,
  isSpectator = false,
  lang,
  describerName,
  onCorrect,
  onSkip,
  onBuzzTaboo,
  onRevealHint,
}) => {
  const t = translations[lang];
  const card = turn.currentCard;
  const hint = turn.currentCardHint;

  // Mystery Card for Guessing Teammates
  if (roleView === 'GUESSER' || !card) {
    const categoryKey = hint?.category || 'general';
    const categoryLabel = t.categories[categoryKey] || t.categories.general;

    return (
      <div className="w-full max-w-md mx-auto animate-card-pop">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-slate-900/95 via-indigo-950/80 to-slate-950 border-2 border-cyan-500/30 shadow-2xl shadow-cyan-500/15 p-6 sm:p-8 text-center">
          {/* Decorative glowing radar rings */}
          <div className="relative w-24 h-24 mx-auto mb-5 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400/20 animate-ping" />
            <div className="absolute inset-2 rounded-full border border-indigo-400/30 animate-pulse" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-400/40 flex items-center justify-center shadow-inner">
              <EyeOff className="w-8 h-8 text-cyan-300" />
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            {categoryLabel}
          </span>

          <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
            {t.mysteryCardTitle}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
            {t.mysteryCardSubtitle}
          </p>

          {/* Hint Button & Remaining Hints Counter (First Word for 3+ word cards, First Letter otherwise) */}
          {hint && (
            <div>
              {hint.hintRevealed ? (
                <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-sm font-bold">
                  <HelpCircle className="w-4 h-4 shrink-0" />
                  <span>
                    {(hint.hintType === 'word' || hint.wordCount >= 3)
                      ? t.firstWordHint
                      : t.firstLetterHint}{' '}
                    « {hint.hintText || hint.firstLetter} »
                  </span>
                </div>
              ) : isSpectator ? (
                <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500/15 border border-indigo-400/30 text-indigo-300 text-xs font-bold">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{t.spectatorViewOnly}</span>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if ((turn.hintsRemaining ?? 0) <= 0) return;
                    soundFX.playClick();
                    onRevealHint();
                  }}
                  disabled={(turn.hintsRemaining ?? 0) <= 0}
                  className={`inline-flex flex-col items-center gap-1 px-5 py-2.5 rounded-2xl border text-xs font-bold transition ${
                    (turn.hintsRemaining ?? 0) > 0
                      ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-400/40 text-amber-300 cursor-pointer active:scale-95'
                      : 'bg-slate-900/50 border-white/5 text-slate-500 cursor-not-allowed opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-amber-400" />
                    <span>
                      {(turn.hintsRemaining ?? 0) <= 0
                        ? t.noHintsLeft
                        : hint.hintType === 'word' || hint.wordCount >= 3
                        ? t.revealWordHintBtn
                        : t.revealHintBtn}
                    </span>
                  </div>
                  <span className="text-[10px] opacity-80">
                    {t.hintsLeft}:{' '}
                    {(turn.hintsRemaining ?? 0) > 50
                      ? '∞'
                      : formatNumber(turn.hintsRemaining ?? 0, lang)}
                  </span>
                </button>
              )}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Volume2 className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>
              {t.describerLabel} <strong className="text-white">{describerName}</strong>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Full Card View for DESCRIBER and Opposing Team WATCHER
  const categoryLabel = t.categories[card.category] || t.categories.general;
  const isWatcher = roleView === 'WATCHER';

  return (
    <div key={card.id} className="w-full max-w-md mx-auto animate-card-pop">
      {/* Main Luxury Taboo Card */}
      <div
        className={`relative rounded-3xl overflow-hidden bg-slate-900/95 backdrop-blur-2xl border-2 transition-all shadow-2xl ${
          isWatcher
            ? 'border-rose-500/45 shadow-rose-500/15'
            : 'border-cyan-400/45 shadow-cyan-500/15'
        }`}
      >
        {/* Top Target Word Header */}
        <div
          className={`relative px-6 pt-5 pb-6 text-center ${
            isWatcher
              ? 'bg-gradient-to-br from-rose-950/90 via-slate-900 to-indigo-950/90'
              : 'bg-gradient-to-br from-cyan-950/90 via-slate-900 to-indigo-950/90'
          }`}
        >
          {/* Category Badge */}
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/10 text-slate-200 border border-white/10">
              {categoryLabel}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {t.targetWordLabel}
            </span>
          </div>

          {/* Target Word */}
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-snug drop-shadow-md py-1">
            {card.word}
          </h2>
        </div>

        {/* Forbidden Words Warning Ribbon */}
        <div className="bg-rose-500/20 border-y border-rose-500/30 px-4 py-2 flex items-center justify-center gap-2">
          <Ban className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="text-xs font-extrabold text-rose-300 tracking-wide">
            {t.forbiddenWordsLabel}
          </span>
        </div>

        {/* 6 Forbidden Words Grid */}
        <div className="p-5 sm:p-6">
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {card.forbiddenWords.map((fw, idx) =>
              isWatcher && !isSpectator ? (
                <button
                  key={idx}
                  onClick={() => {
                    onBuzzTaboo(fw);
                  }}
                  className="group relative flex items-center justify-between gap-2 px-3.5 py-3 rounded-2xl bg-slate-950/85 hover:bg-rose-500/25 border border-rose-500/25 hover:border-rose-400 text-slate-100 hover:text-white font-bold text-sm sm:text-base transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <span className="truncate">{fw}</span>
                  <AlertOctagon className="w-4 h-4 text-rose-400/60 group-hover:text-rose-300 group-hover:scale-110 transition shrink-0" />
                </button>
              ) : (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 px-3.5 py-3 rounded-2xl bg-slate-950/80 border border-white/10 text-slate-100 font-bold text-sm sm:text-base"
                >
                  <span className="truncate">{fw}</span>
                  <span className="w-2 h-2 rounded-full bg-rose-500/70 shrink-0" />
                </div>
              )
            )}
          </div>

          {isWatcher && !isSpectator && (
            <p className="text-[11px] text-center text-rose-300/80 mt-3.5 font-medium">
              {t.clickForbiddenToBuzz}
            </p>
          )}
        </div>
      </div>

      {/* Action Controls Below Card */}
      {isSpectator ? (
        <div className="mt-4 py-3 px-4 rounded-2xl bg-indigo-500/15 border border-indigo-400/30 text-indigo-200 text-xs sm:text-sm font-bold flex items-center justify-center gap-2">
          <Eye className="w-4 h-4 text-indigo-400" />
          <span>{t.spectatorViewOnly}</span>
        </div>
      ) : roleView === 'DESCRIBER' ? (
        <div className="mt-4 flex flex-col gap-2.5">
          <div className="grid grid-cols-5 gap-2.5">
            {/* Correct (+1) Button */}
            <button
              onClick={() => {
                onCorrect();
              }}
              className="col-span-3 flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base sm:text-lg shadow-lg shadow-emerald-500/25 transition transform active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{t.correctBtn}</span>
            </button>

            {/* Skip Button */}
            <button
              onClick={() => {
                if (turn.skipsRemaining <= 0) return;
                onSkip();
              }}
              disabled={turn.skipsRemaining <= 0}
              className={`col-span-2 flex flex-col items-center justify-center py-2.5 px-3 rounded-2xl border font-bold transition transform active:scale-95 ${
                turn.skipsRemaining > 0
                  ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-400/40 text-amber-300 cursor-pointer'
                  : 'bg-slate-900/50 border-white/5 text-slate-600 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-1.5 text-sm">
                <FastForward className="w-4 h-4" />
                <span>{t.skipBtn}</span>
              </div>
              <span className="text-[10px] opacity-80">
                {t.skipsLeft}:{' '}
                {turn.skipsRemaining > 50
                  ? '∞'
                  : formatNumber(turn.skipsRemaining, lang)}
              </span>
            </button>
          </div>

          {/* Self-Taboo Report Button */}
          <button
            onClick={() => {
              onBuzzTaboo();
            }}
            className="w-full py-2 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{t.selfTabooBtn}</span>
          </button>
        </div>
      ) : (
        /* Opposing Team Big Red Taboo Buzzer */
        <div className="mt-4">
          <button
            onClick={() => {
              onBuzzTaboo();
            }}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-rose-600 via-red-500 to-rose-600 hover:from-rose-500 hover:to-red-400 text-white font-black text-lg sm:text-xl shadow-xl shadow-rose-600/35 border border-rose-300/40 flex items-center justify-center gap-3 transition transform active:scale-95 cursor-pointer"
          >
            <AlertOctagon className="w-6 h-6" />
            <span>{t.tabooBuzzerBtn}</span>
          </button>
        </div>
      )}
    </div>
  );
};
