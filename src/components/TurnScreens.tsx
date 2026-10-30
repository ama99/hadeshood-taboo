import React from 'react';
import {
  Play,
  CheckCircle2,
  AlertOctagon,
  FastForward,
  Trophy,
  RotateCcw,
  ArrowRight,
  Mic,
  Eye,
  Sparkles,
  Award,
  RefreshCw,
} from 'lucide-react';
import { translations, formatNumber } from '../i18n/translations';
import type { Language, Player, RoomState } from '../types/game';
import { soundFX } from '../utils/sound';

export const PreTurnScreen: React.FC<{
  room: RoomState;
  currentPlayerId: string;
  lang: Language;
  onStartTurn: () => void;
}> = ({ room, currentPlayerId, lang, onStartTurn }) => {
  const t = translations[lang];
  const { turn, players } = room;
  const describer = players.find((p) => p.id === turn.describerId);
  const currentPlayer = players.find((p) => p.id === currentPlayerId);

  const isDescriber = currentPlayerId === turn.describerId;
  const isTeammate = currentPlayer?.team === turn.activeTeam && !isDescriber;

  const isCyan = turn.activeTeam === 'A';

  return (
    <div className="max-w-xl mx-auto px-4 py-6 animate-card-pop">
      <div
        className={`rounded-3xl p-6 sm:p-8 border-2 backdrop-blur-2xl text-center shadow-2xl ${
          isCyan
            ? 'bg-slate-900/90 border-cyan-500/45 shadow-cyan-500/15'
            : 'bg-slate-900/90 border-rose-500/45 shadow-rose-500/15'
        }`}
      >
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white/10 text-xs font-extrabold text-slate-200 mb-4">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>
            {t.roundLabel} {formatNumber(turn.roundNumber, lang)} •{' '}
            {isCyan ? t.teamADefault : t.teamBDefault}
          </span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-white mb-6">
          {t.turnReadyTitle}
        </h2>

        {/* Describer Avatar Spotlight */}
        {describer && (
          <div className="flex flex-col items-center mb-6">
            <div className="relative mb-3">
              <div
                className={`absolute -inset-1.5 rounded-full blur-md opacity-75 animate-pulse ${
                  isCyan ? 'bg-cyan-400' : 'bg-rose-400'
                }`}
              />
              <img
                src={describer.avatarUrl}
                alt={describer.displayName}
                className="relative w-20 h-20 rounded-full border-2 border-white bg-slate-800 object-cover"
              />
              <span className="absolute -bottom-1 -end-1 w-7 h-7 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow">
                <Mic className="w-4 h-4" />
              </span>
            </div>
            <div className="text-xs text-slate-400">{t.describerLabel}</div>
            <div className="text-xl font-black text-white mt-0.5">
              {describer.displayName}
            </div>
          </div>
        )}

        {/* Role Instruction Banner */}
        <div
          className={`p-4 rounded-2xl border mb-6 text-xs sm:text-sm font-bold leading-relaxed flex items-center justify-center gap-2.5 ${
            isDescriber
              ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
              : isTeammate
              ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-200'
              : 'bg-rose-500/15 border-rose-400/40 text-rose-200'
          }`}
        >
          {isDescriber ? (
            <>
              <Mic className="w-5 h-5 shrink-0 text-emerald-400" />
              <span>{t.yourTurnToDescribe}</span>
            </>
          ) : isTeammate ? (
            <>
              <Sparkles className="w-5 h-5 shrink-0 text-cyan-400" />
              <span>{t.teammateTurnToGuess}</span>
            </>
          ) : (
            <>
              <Eye className="w-5 h-5 shrink-0 text-rose-400" />
              <span>{t.opponentTurnToWatch}</span>
            </>
          )}
        </div>

        {/* Start Turn Button */}
        <button
          onClick={() => {
            soundFX.playClick();
            onStartTurn();
          }}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-400 via-indigo-500 to-rose-500 hover:from-cyan-300 hover:to-rose-400 text-white font-black text-base sm:text-lg shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-2.5 transition transform active:scale-95 cursor-pointer"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>{isDescriber ? t.startTurnBtn : t.forceStartTurn}</span>
        </button>
      </div>
    </div>
  );
};

export const TurnSummaryScreen: React.FC<{
  room: RoomState;
  lang: Language;
  onToggleCardOutcome: (index: number) => void;
  onNextTurn: () => void;
}> = ({ room, lang, onToggleCardOutcome, onNextTurn }) => {
  const t = translations[lang];
  const { turn } = room;
  const delta = turn.turnScoreDelta;

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 animate-card-pop">
      <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/10 mb-5">
          <div>
            <h2 className="text-2xl font-black text-white">{t.turnOverTitle}</h2>
            <p className="text-xs text-slate-400 mt-1">{t.clickToToggleOutcome}</p>
          </div>

          <div
            className={`px-4 py-2 rounded-2xl border font-black text-lg ${
              delta > 0
                ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                : delta < 0
                ? 'bg-rose-500/20 border-rose-400/50 text-rose-300'
                : 'bg-slate-800 border-white/10 text-slate-300'
            }`}
          >
            {t.turnScoreSummary}{' '}
            <span>
              {delta > 0 ? `+${formatNumber(delta, lang)}` : formatNumber(delta, lang)}
            </span>
          </div>
        </div>

        {/* Played Cards List */}
        {turn.playedCards.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            {t.noCardsPlayed}
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[360px] overflow-y-auto pe-1 mb-6">
            {turn.playedCards.map((rec, idx) => {
              const isCorrect = rec.outcome === 'CORRECT';
              const isTaboo = rec.outcome === 'TABOO';

              return (
                <div
                  key={idx}
                  className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-950/85 border border-white/10"
                >
                  <div>
                    <div className="font-black text-base text-white flex items-center gap-2">
                      <span>{rec.card.word}</span>
                      {rec.violatedWord && isTaboo && (
                        <span className="text-xs px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 font-bold">
                          {t.violatedWordLabel} {rec.violatedWord}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {rec.card.forbiddenWords.join(' ، ')}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      soundFX.playClick();
                      onToggleCardOutcome(idx);
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-extrabold transition cursor-pointer ${
                      isCorrect
                        ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300 hover:bg-emerald-500/30'
                        : isTaboo
                        ? 'bg-rose-500/20 border-rose-400/50 text-rose-300 hover:bg-rose-500/30'
                        : 'bg-amber-500/20 border-amber-400/50 text-amber-300 hover:bg-amber-500/30'
                    }`}
                  >
                    {isCorrect ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : isTaboo ? (
                      <AlertOctagon className="w-4 h-4" />
                    ) : (
                      <FastForward className="w-4 h-4" />
                    )}
                    <span>
                      {isCorrect
                        ? t.outcomeCorrect
                        : isTaboo
                        ? t.outcomeTaboo
                        : t.outcomeSkipped}
                    </span>
                    <RefreshCw className="w-3 h-3 opacity-60 ms-1" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={() => {
            soundFX.playClick();
            onNextTurn();
          }}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 font-black text-base sm:text-lg shadow-xl shadow-cyan-500/20 flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <span>{t.nextTurnBtn}</span>
          <ArrowRight className="w-5 h-5 rtl:rotate-180" />
        </button>
      </div>
    </div>
  );
};

export const GameOverScreen: React.FC<{
  room: RoomState;
  lang: Language;
  onPlayAgain: () => void;
  onBackToLobby: () => void;
}> = ({ room, lang, onPlayAgain, onBackToLobby }) => {
  const t = translations[lang];
  const { winner, scores, players } = room;

  // Compute MVP
  const sortedPlayers: Player[] = [...players].sort((a, b) => {
    const scoreA =
      a.stats.describedCorrect * 2 + a.stats.guessedCorrect * 2 + a.stats.taboosCaught;
    const scoreB =
      b.stats.describedCorrect * 2 + b.stats.guessedCorrect * 2 + b.stats.taboosCaught;
    return scoreB - scoreA;
  });
  const mvp = sortedPlayers[0];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 animate-card-pop">
      <div className="bg-slate-900/90 backdrop-blur-2xl border-2 border-amber-400/40 rounded-3xl p-6 sm:p-8 text-center shadow-2xl shadow-amber-500/10">
        <div className="w-16 h-16 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center mx-auto mb-4">
          <Trophy className="w-9 h-9 text-amber-400 animate-bounce" />
        </div>

        <h2 className="text-2xl sm:text-4xl font-black text-white mb-2">
          {t.gameOverTitle}
        </h2>

        <p className="text-lg sm:text-xl font-extrabold text-amber-300 mb-6">
          {winner === 'DRAW'
            ? t.drawAnnouncement
            : `${t.winnerAnnouncement} ${
                winner === 'A' ? t.teamADefault : t.teamBDefault
              } 🎉`}
        </p>

        {/* Final Score Comparison */}
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8">
          <div className="p-4 rounded-2xl bg-cyan-500/15 border border-cyan-400/40">
            <div className="text-xs font-bold text-cyan-300">{t.teamADefault}</div>
            <div className="text-4xl font-black text-white mt-1">
              {formatNumber(scores.A, lang)}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-400/40">
            <div className="text-xs font-bold text-rose-300">{t.teamBDefault}</div>
            <div className="text-4xl font-black text-white mt-1">
              {formatNumber(scores.B, lang)}
            </div>
          </div>
        </div>

        {/* MVP Spotlight */}
        {mvp && (
          <div className="max-w-md mx-auto mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-indigo-500/15 to-amber-500/15 border border-amber-400/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src={mvp.avatarUrl}
                alt={mvp.displayName}
                className="w-12 h-12 rounded-full border-2 border-amber-400 bg-slate-800"
              />
              <div className="text-start">
                <div className="text-xs font-bold text-amber-300 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  <span>{t.mvpTitle}</span>
                </div>
                <div className="text-base font-black text-white">{mvp.displayName}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div>
                <div className="text-slate-400">{t.statsDescribed}</div>
                <div className="font-black text-emerald-400">
                  {formatNumber(mvp.stats.describedCorrect, lang)}
                </div>
              </div>
              <div>
                <div className="text-slate-400">{t.statsGuessed}</div>
                <div className="font-black text-cyan-400">
                  {formatNumber(mvp.stats.guessedCorrect, lang)}
                </div>
              </div>
              <div>
                <div className="text-slate-400">{t.statsBuzzed}</div>
                <div className="font-black text-rose-400">
                  {formatNumber(mvp.stats.taboosCaught, lang)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => {
              soundFX.playVictory();
              onPlayAgain();
            }}
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 transition cursor-pointer shadow-lg"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t.playAgainBtn}</span>
          </button>

          <button
            onClick={() => {
              soundFX.playClick();
              onBackToLobby();
            }}
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-sm sm:text-base transition cursor-pointer"
          >
            {t.backToLobbyBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
