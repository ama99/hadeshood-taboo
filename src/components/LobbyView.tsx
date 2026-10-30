import React from 'react';
import {
  Users,
  Settings,
  Shuffle,
  Bot,
  Trash2,
  Play,
  Crown,
  Sparkles,
  Clock,
  Trophy,
  FastForward,
  AlertTriangle,
  Layers,
  PlusCircle,
} from 'lucide-react';
import { translations, formatNumber } from '../i18n/translations';
import type { CardCategory } from '../data/cards';
import type { GameSettings, Language, RoomState, TeamId } from '../types/game';
import { soundFX } from '../utils/sound';

interface LobbyViewProps {
  room: RoomState;
  currentPlayerId: string;
  lang: Language;
  onSwitchTeam: (team: TeamId) => void;
  onShuffleTeams: () => void;
  onAddBot: () => void;
  onRemoveBots: () => void;
  onUpdateSettings: (partial: Partial<GameSettings>) => void;
  onStartGame: () => void;
  onOpenCustomCard: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  room,
  currentPlayerId,
  lang,
  onSwitchTeam,
  onShuffleTeams,
  onAddBot,
  onRemoveBots,
  onUpdateSettings,
  onStartGame,
  onOpenCustomCard,
}) => {
  const t = translations[lang];
  const connectedPlayers = room.players.filter((p) => p.isConnected);
  const teamA = connectedPlayers.filter((p) => p.team === 'A');
  const teamB = connectedPlayers.filter((p) => p.team === 'B');
  const hasBots = connectedPlayers.some((p) => p.isBot);
  const canStart = connectedPlayers.length >= 4;
  const { settings } = room;

  const categories: CardCategory[] = [
    'all',
    'memes',
    'food',
    'everyday',
    'proverbs',
    'pop',
    'tech',
    'places',
    'general',
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6">
      {/* Top Action Bar & Solo Test Helper */}
      <div className="bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-rose-500/10 border border-white/10 rounded-2xl p-3.5 sm:px-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-200">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          <span>{t.soloPracticeHint}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              soundFX.playClick();
              onShuffleTeams();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-200 text-xs font-bold transition cursor-pointer"
          >
            <Shuffle className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t.shuffleTeams}</span>
          </button>

          <button
            onClick={() => {
              soundFX.playClick();
              onAddBot();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-xs font-bold transition cursor-pointer"
          >
            <Bot className="w-3.5 h-3.5 text-indigo-300" />
            <span>{t.addBotPlayer}</span>
          </button>

          {hasBots && (
            <button
              onClick={() => {
                soundFX.playClick();
                onRemoveBots();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.removeBots}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Teams (Left/Right) + Match Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Teams Column (7 cols) */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Team A Card (Cyan) */}
          <div className="bg-slate-900/75 backdrop-blur-xl border-2 border-cyan-500/35 rounded-3xl p-5 flex flex-col justify-between shadow-xl shadow-cyan-500/5">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
                  <h2 className="text-lg font-black text-cyan-300">{t.teamADefault}</h2>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-300">
                  {formatNumber(teamA.length, lang)} {t.playersCount}
                </span>
              </div>

              <div className="space-y-2.5 min-h-[180px]">
                {teamA.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between gap-2 p-2.5 rounded-2xl border ${
                      p.id === currentPlayerId
                        ? 'bg-cyan-500/15 border-cyan-400/50'
                        : 'bg-slate-950/70 border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={p.avatarUrl}
                        alt={p.displayName}
                        className="w-9 h-9 rounded-full bg-slate-800 border border-cyan-400/40 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-white truncate flex items-center gap-1.5">
                          <span className="truncate">{p.displayName}</span>
                          {p.isHost && (
                            <span title={t.hostBadge} className="inline-flex">
                              <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {p.id === currentPlayerId && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                              {t.youBadge}
                            </span>
                          )}
                          {p.isBot && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                              {t.botBadge}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {teamA.length === 0 && (
                  <div className="h-36 flex flex-col items-center justify-center text-slate-500 text-xs border border-dashed border-white/10 rounded-2xl">
                    <Users className="w-6 h-6 mb-1 opacity-50" />
                    <span>{lang === 'fa' ? 'هنوز بازیکنی در این تیم نیست' : 'No players yet'}</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                soundFX.playClick();
                onSwitchTeam('A');
              }}
              className="mt-4 w-full py-2.5 px-4 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 font-extrabold text-xs sm:text-sm transition cursor-pointer"
            >
              {t.joinTeamA}
            </button>
          </div>

          {/* Team B Card (Ruby) */}
          <div className="bg-slate-900/75 backdrop-blur-xl border-2 border-rose-500/35 rounded-3xl p-5 flex flex-col justify-between shadow-xl shadow-rose-500/5">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-400 shadow-sm shadow-rose-400" />
                  <h2 className="text-lg font-black text-rose-300">{t.teamBDefault}</h2>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-300">
                  {formatNumber(teamB.length, lang)} {t.playersCount}
                </span>
              </div>

              <div className="space-y-2.5 min-h-[180px]">
                {teamB.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between gap-2 p-2.5 rounded-2xl border ${
                      p.id === currentPlayerId
                        ? 'bg-rose-500/15 border-rose-400/50'
                        : 'bg-slate-950/70 border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={p.avatarUrl}
                        alt={p.displayName}
                        className="w-9 h-9 rounded-full bg-slate-800 border border-rose-400/40 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-white truncate flex items-center gap-1.5">
                          <span className="truncate">{p.displayName}</span>
                          {p.isHost && (
                            <span title={t.hostBadge} className="inline-flex">
                              <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {p.id === currentPlayerId && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold">
                              {t.youBadge}
                            </span>
                          )}
                          {p.isBot && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                              {t.botBadge}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {teamB.length === 0 && (
                  <div className="h-36 flex flex-col items-center justify-center text-slate-500 text-xs border border-dashed border-white/10 rounded-2xl">
                    <Users className="w-6 h-6 mb-1 opacity-50" />
                    <span>{lang === 'fa' ? 'هنوز بازیکنی در این تیم نیست' : 'No players yet'}</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                soundFX.playClick();
                onSwitchTeam('B');
              }}
              className="mt-4 w-full py-2.5 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-200 font-extrabold text-xs sm:text-sm transition cursor-pointer"
            >
              {t.joinTeamB}
            </button>
          </div>

          {/* Start Game CTA Banner spanning both team columns */}
          <div className="sm:col-span-2 bg-slate-900/90 border border-white/10 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-slate-200">
                {t.deckRemaining}:{' '}
                <span className="text-cyan-400 font-black">
                  {formatNumber(room.totalDeckSize, lang)}
                </span>
              </div>
              {!canStart && (
                <p className="text-xs text-amber-300 mt-1">{t.needMorePlayers}</p>
              )}
            </div>

            <button
              onClick={() => {
                if (!canStart) return;
                soundFX.playVictory();
                onStartGame();
              }}
              disabled={!canStart}
              className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-base sm:text-lg flex items-center justify-center gap-2.5 transition transform active:scale-95 shadow-xl ${
                canStart
                  ? 'bg-gradient-to-r from-cyan-400 via-indigo-500 to-rose-500 hover:from-cyan-300 hover:to-rose-400 text-white shadow-indigo-500/25 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Play className="w-5 h-5 fill-current" />
              <span>{t.startGame}</span>
            </button>
          </div>
        </div>

        {/* Match Settings Panel (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base sm:text-lg font-black text-white">{t.gameSettings}</h3>
            </div>
            <button
              onClick={() => {
                soundFX.playClick();
                onOpenCustomCard();
              }}
              className="flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{t.customCardBtn}</span>
            </button>
          </div>

          {/* Deck Language Selection */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-300 mb-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t.deckLanguage}</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  soundFX.playClick();
                  onUpdateSettings({ deckLanguage: 'fa' });
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  settings.deckLanguage === 'fa'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                    : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {t.deckFa}
              </button>
              <button
                onClick={() => {
                  soundFX.playClick();
                  onUpdateSettings({ deckLanguage: 'en' });
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  settings.deckLanguage === 'en'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                    : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {t.deckEn}
              </button>
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">
              {t.cardCategory}
            </label>
            <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pe-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    soundFX.playClick();
                    onUpdateSettings({ category: cat });
                  }}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold text-start truncate border transition cursor-pointer ${
                    settings.category === cat
                      ? 'bg-indigo-500/25 border-indigo-400 text-white shadow-sm'
                      : 'bg-slate-950/60 border-white/5 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.categories[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* Turn Duration & Target Score */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-slate-300 mb-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{t.turnDuration}</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[45, 60, 90, 120].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => {
                      soundFX.playClick();
                      onUpdateSettings({ turnDuration: sec });
                    }}
                    className={`py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      settings.turnDuration === sec
                        ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                        : 'bg-slate-950/60 border-white/10 text-slate-400'
                    }`}
                  >
                    {formatNumber(sec, lang)} {t.seconds}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-slate-300 mb-1.5">
                <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.targetScore}</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[15, 20, 30, 40].map((pts) => (
                  <button
                    key={pts}
                    onClick={() => {
                      soundFX.playClick();
                      onUpdateSettings({ targetScore: pts });
                    }}
                    className={`py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      settings.targetScore === pts
                        ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                        : 'bg-slate-950/60 border-white/10 text-slate-400'
                    }`}
                  >
                    {formatNumber(pts, lang)} {t.points}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Max Skips & Taboo Penalty */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-slate-300 mb-1.5">
                <FastForward className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t.maxSkips}</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[2, 3, 99].map((sk) => (
                  <button
                    key={sk}
                    onClick={() => {
                      soundFX.playClick();
                      onUpdateSettings({ maxSkipsPerTurn: sk });
                    }}
                    className={`py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      settings.maxSkipsPerTurn === sk
                        ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200'
                        : 'bg-slate-950/60 border-white/10 text-slate-400'
                    }`}
                  >
                    {sk > 50 ? '∞' : formatNumber(sk, lang)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-slate-300 mb-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>{t.tabooPenalty}</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[1, 0].map((pen) => (
                  <button
                    key={pen}
                    onClick={() => {
                      soundFX.playClick();
                      onUpdateSettings({ tabooPenalty: pen });
                    }}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition cursor-pointer truncate ${
                      settings.tabooPenalty === pen
                        ? 'bg-rose-500/25 border-rose-400 text-rose-200'
                        : 'bg-slate-950/60 border-white/10 text-slate-400'
                    }`}
                  >
                    {pen === 1 ? '-۱' : '۰'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
