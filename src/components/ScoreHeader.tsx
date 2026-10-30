import React from 'react';
import { Timer, Pause, Play, Crown, Sparkles } from 'lucide-react';
import { translations, formatNumber } from '../i18n/translations';
import type { Language, RoomState } from '../types/game';
import { soundFX } from '../utils/sound';

interface ScoreHeaderProps {
  room: RoomState;
  lang: Language;
  onTogglePause: () => void;
  onBackToLobby: () => void;
}

export const ScoreHeader: React.FC<ScoreHeaderProps> = ({
  room,
  lang,
  onTogglePause,
  onBackToLobby,
}) => {
  const t = translations[lang];
  const { scores, turn, settings, players, phase } = room;
  const teamAPlayers = players.filter((p) => p.team === 'A' && p.isConnected);
  const teamBPlayers = players.filter((p) => p.team === 'B' && p.isConnected);

  const isUrgent = phase === 'PLAYING' && turn.timeRemaining <= 10;
  const timeProgress = Math.max(
    0,
    Math.min(100, (turn.timeRemaining / Math.max(1, settings.turnDuration)) * 100)
  );

  return (
    <div className="w-full max-w-5xl mx-auto mb-4">
      <div className="grid grid-cols-3 items-center gap-2 sm:gap-4 bg-slate-900/75 backdrop-blur-xl border border-white/10 rounded-2xl p-3 sm:px-6 shadow-xl">
        {/* Team A (Cyan / فیروزه) */}
        <div
          className={`flex flex-col sm:flex-row items-center justify-between gap-2 p-2.5 rounded-xl border transition-all ${
            turn.activeTeam === 'A'
              ? 'bg-cyan-500/15 border-cyan-400/50 shadow-lg shadow-cyan-500/10'
              : 'bg-slate-950/50 border-white/5 opacity-80'
          }`}
        >
          <div className="flex flex-col items-center sm:items-start">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs sm:text-sm font-extrabold text-cyan-300">
                {t.teamADefault}
              </span>
              {turn.activeTeam === 'A' && phase !== 'GAME_OVER' && (
                <Sparkles className="w-3.5 h-3.5 text-cyan-300 hidden sm:inline" />
              )}
            </div>
            {/* Team A Avatars */}
            <div className="flex items-center -space-x-1.5 rtl:space-x-reverse mt-1.5">
              {teamAPlayers.slice(0, 5).map((p) => (
                <img
                  key={p.id}
                  src={p.avatarUrl}
                  alt={p.displayName}
                  title={p.displayName}
                  className={`w-6 h-6 rounded-full border-2 bg-slate-800 ${
                    p.id === turn.describerId
                      ? 'border-amber-400 ring-2 ring-amber-400/50 z-10 scale-110'
                      : 'border-slate-900'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="text-center sm:text-end">
            <div className="text-2xl sm:text-4xl font-black text-cyan-300 leading-none">
              {formatNumber(scores.A, lang)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              / {formatNumber(settings.targetScore, lang)} {t.points}
            </div>
          </div>
        </div>

        {/* Center Timer & Round Info */}
        <div className="flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold text-slate-300">
              {t.roundLabel} {formatNumber(turn.roundNumber, lang)} /{' '}
              {formatNumber(settings.maxRounds, lang)}
            </span>
            <button
              onClick={() => {
                soundFX.playClick();
                onBackToLobby();
              }}
              className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer hidden sm:inline"
            >
              {t.backToLobbyBtn}
            </button>
          </div>

          {phase === 'PLAYING' ? (
            <div className="flex items-center gap-2">
              <div
                className={`relative flex items-center justify-center px-4 py-1.5 rounded-2xl border font-mono text-2xl sm:text-3xl font-black transition-all ${
                  isUrgent
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300 animate-heartbeat shadow-lg shadow-rose-500/30'
                    : 'bg-slate-950/90 border-white/15 text-white'
                }`}
              >
                <Timer
                  className={`w-5 h-5 me-1.5 ${
                    isUrgent ? 'text-rose-400 animate-pulse' : 'text-cyan-400'
                  }`}
                />
                <span>{formatNumber(turn.timeRemaining, lang)}</span>
                <span className="text-xs font-normal text-slate-400 ms-1">{t.seconds}</span>
              </div>

              <button
                onClick={() => {
                  soundFX.playClick();
                  onTogglePause();
                }}
                title={turn.isPaused ? t.resumeTimer : t.pauseTimer}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 transition cursor-pointer"
              >
                {turn.isPaused ? (
                  <Play className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Pause className="w-4 h-4 text-amber-400" />
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
              <Crown className="w-3.5 h-3.5" />
              <span>
                {turn.activeTeam === 'A' ? t.teamADefault : t.teamBDefault}
              </span>
            </div>
          )}

          {/* Slim Timer Progress Bar */}
          {phase === 'PLAYING' && (
            <div className="w-full max-w-[160px] h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  isUrgent
                    ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                    : 'bg-gradient-to-r from-cyan-400 to-indigo-500'
                }`}
                style={{ width: `${timeProgress}%` }}
              />
            </div>
          )}
        </div>

        {/* Team B (Ruby / یاقوت) */}
        <div
          className={`flex flex-col sm:flex-row-reverse items-center justify-between gap-2 p-2.5 rounded-xl border transition-all ${
            turn.activeTeam === 'B'
              ? 'bg-rose-500/15 border-rose-400/50 shadow-lg shadow-rose-500/10'
              : 'bg-slate-950/50 border-white/5 opacity-80'
          }`}
        >
          <div className="flex flex-col items-center sm:items-end">
            <div className="flex items-center gap-1.5">
              {turn.activeTeam === 'B' && phase !== 'GAME_OVER' && (
                <Sparkles className="w-3.5 h-3.5 text-rose-300 hidden sm:inline" />
              )}
              <span className="text-xs sm:text-sm font-extrabold text-rose-300">
                {t.teamBDefault}
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse" />
            </div>
            {/* Team B Avatars */}
            <div className="flex items-center -space-x-1.5 rtl:space-x-reverse mt-1.5">
              {teamBPlayers.slice(0, 5).map((p) => (
                <img
                  key={p.id}
                  src={p.avatarUrl}
                  alt={p.displayName}
                  title={p.displayName}
                  className={`w-6 h-6 rounded-full border-2 bg-slate-800 ${
                    p.id === turn.describerId
                      ? 'border-amber-400 ring-2 ring-amber-400/50 z-10 scale-110'
                      : 'border-slate-900'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="text-center sm:text-start">
            <div className="text-2xl sm:text-4xl font-black text-rose-300 leading-none">
              {formatNumber(scores.B, lang)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              / {formatNumber(settings.targetScore, lang)} {t.points}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
