import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Sparkles, CheckCircle2, AlertOctagon, FastForward, Eye } from 'lucide-react';
import { translations } from '../i18n/translations';
import type { ChatGuessEntry, Language } from '../types/game';
import type { RolePerspective } from './TabooCardView';
import { AVATAR_PRESETS, getSafeAvatarUrl } from '../utils/avatars';
import { soundFX } from '../utils/sound';

const QUICK_EMOJIS = ['😂', '🔥', '🤯', '👏', '⏰', '🤫'];

interface GuessFeedPanelProps {
  guesses: ChatGuessEntry[];
  roleView: RolePerspective;
  isSpectator?: boolean;
  lang: Language;
  clueWarning: string | null;
  onSubmitGuess: (text: string) => void;
  onSendReaction: (emoji: string) => void;
}

export const GuessFeedPanel: React.FC<GuessFeedPanelProps> = ({
  guesses,
  roleView,
  isSpectator = false,
  lang,
  clueWarning,
  onSubmitGuess,
  onSendReaction,
}) => {
  const t = translations[lang];
  const [text, setText] = useState('');
  const feedEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [guesses.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    soundFX.playClick();
    onSubmitGuess(text.trim());
    setText('');
  };

  return (
    <div className="w-full bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-4 sm:p-5 flex flex-col h-[390px] sm:h-[460px] shadow-xl">
      {/* Header + Quick Emoji Bar */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs sm:text-sm font-black text-white">{t.liveGuessesTitle}</h3>
        </div>

        <div className="flex items-center gap-1">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                soundFX.playClick();
                onSendReaction(emoji);
              }}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center text-sm transition transform active:scale-125 cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Scrolling Messages List */}
      <div className="flex-1 overflow-y-auto space-y-2 pe-1">
        {guesses.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs text-center px-4">
            <Sparkles className="w-6 h-6 mb-2 text-cyan-400/50" />
            <p>{t.noGuessesYet}</p>
          </div>
        ) : (
          guesses.map((g) => {
            if (g.isSystem) {
              const badgeStyles =
                g.systemType === 'correct'
                  ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                  : g.systemType === 'taboo'
                  ? 'bg-rose-500/15 border-rose-500/35 text-rose-300'
                  : 'bg-amber-500/15 border-amber-500/35 text-amber-300';

              const Icon =
                g.systemType === 'correct'
                  ? CheckCircle2
                  : g.systemType === 'taboo'
                  ? AlertOctagon
                  : FastForward;

              return (
                <div
                  key={g.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold ${badgeStyles}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{g.text}</span>
                </div>
              );
            }

            return (
              <div
                key={g.id}
                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-2xl border ${
                  g.isCorrect
                    ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                    : 'bg-slate-950/75 border-white/5 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {g.playerAvatar && (
                    <img
                      src={getSafeAvatarUrl(g.playerAvatar, 0)}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.src = AVATAR_PRESETS[0];
                      }}
                      className="w-6 h-6 rounded-full bg-slate-800 shrink-0"
                    />
                  )}
                  <span
                    className={`text-xs font-bold shrink-0 ${
                      g.team === 'A' ? 'text-cyan-400' : 'text-rose-400'
                    }`}
                  >
                    {g.playerName}:
                  </span>
                  <span className="text-xs sm:text-sm font-medium truncate">{g.text}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={feedEndRef} />
      </div>

      {/* Warning if clue was blocked */}
      {clueWarning && (
        <div className="mt-2 px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold animate-pulse">
          {t.clueBlockedWarning}
        </div>
      )}

      {/* Input Form or Spectator View-Only Notice */}
      {isSpectator ? (
        <div className="mt-3 py-2.5 px-3.5 rounded-xl bg-indigo-500/15 border border-indigo-400/30 text-indigo-200 text-xs font-bold flex items-center justify-center gap-2">
          <Eye className="w-3.5 h-3.5 text-indigo-400" />
          <span>{t.spectatorViewOnly}</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              roleView === 'DESCRIBER'
                ? t.describerChatPlaceholder
                : t.guessInputPlaceholder
            }
            className="flex-1 bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-400"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 transition cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4 rtl:-scale-x-100" />
            <span className="hidden sm:inline">{t.sendBtn}</span>
          </button>
        </form>
      )}
    </div>
  );
};
