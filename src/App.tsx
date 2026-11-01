import React, { useEffect, useState, useCallback, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { Eye, Mic, ShieldAlert, Sparkles } from 'lucide-react';
import { initializeDiscordSdk, saveLocalProfile } from './services/discord';
import { fetchCardsFromPublic, type TabooCard } from './data/cards';
import { translations } from './i18n/translations';
import { soundFX } from './utils/sound';
import type {
  CardOutcome,
  DiscordUserProfile,
  FloatingReaction,
  GameSettings,
  Language,
  RoomState,
  TeamId,
  ThemeMode,
} from './types/game';
import { TopBar } from './components/TopBar';
import { ScoreHeader } from './components/ScoreHeader';
import { LobbyView } from './components/LobbyView';
import { TabooCardView, type RolePerspective } from './components/TabooCardView';
import { GuessFeedPanel } from './components/GuessFeedPanel';
import { PreTurnScreen, TurnSummaryScreen, GameOverScreen } from './components/TurnScreens';
import SplashCursorBackground from './components/SplashCursorBackground';
import {
  RulesModal,
  CustomCardModal,
  DeckBrowserModal,
  EditProfileModal,
} from './components/Modals';

interface CardEventBanner {
  id: string;
  outcome: CardOutcome;
  word: string;
  byPlayerName?: string;
  violatedWord?: string;
}

export const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('en');
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('hadeshood_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // ignore storage errors
    }
    return 'dark';
  });
  const [smokeEnabled, setSmokeEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('hadeshood_smoke');
      if (saved === 'false') return false;
    } catch {
      // ignore storage errors
    }
    return true;
  });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [profile, setProfile] = useState<DiscordUserProfile | null>(null);
  const [roomId, setRoomId] = useState<string>('NEON-1');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);

  // Local cards cache for Deck Browser modal
  const [deckCards, setDeckCards] = useState<{ fa: TabooCard[]; en: TabooCard[] }>({
    fa: [],
    en: [],
  });

  // Modals state
  const [rulesOpen, setRulesOpen] = useState(false);
  const [customCardOpen, setCustomCardOpen] = useState(false);
  const [deckBrowserOpen, setDeckBrowserOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  // Role perspective override for solo/dev testing ('AUTO' uses actual player role)
  const [perspectiveOverride, setPerspectiveOverride] = useState<'AUTO' | RolePerspective>('AUTO');

  // Visual feedback states
  const [eventBanner, setEventBanner] = useState<CardEventBanner | null>(null);
  const [shakeScreen, setShakeScreen] = useState(false);
  const [clueWarning, setClueWarning] = useState<string | null>(null);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const lastOutcomeFXRef = useRef<{ outcome: CardOutcome; time: number }>({
    outcome: 'CORRECT',
    time: 0,
  });
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerCardOutcomeFX = useCallback((outcome: CardOutcome) => {
    const now = Date.now();
    if (
      lastOutcomeFXRef.current.outcome === outcome &&
      now - lastOutcomeFXRef.current.time < 550
    ) {
      return;
    }
    lastOutcomeFXRef.current = { outcome, time: now };

    if (outcome === 'CORRECT') {
      soundFX.playCorrect();
      window.SplashCursorEngine?.triggerSplats(5);
    } else if (outcome === 'TABOO') {
      soundFX.playTabooBuzzer();
      window.SplashCursorEngine?.triggerSplats(6);
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      setShakeScreen(false);
      requestAnimationFrame(() => {
        setShakeScreen(true);
        shakeTimerRef.current = setTimeout(() => setShakeScreen(false), 410);
      });
    } else if (outcome === 'SKIPPED') {
      soundFX.playSkip();
    }
  }, []);

  const t = translations[lang];

  // Synchronize HTML dir="rtl" / dir="ltr" and lang attribute whenever language changes
  useEffect(() => {
    const dir = lang === 'fa' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [lang]);

  // Synchronize HTML dark/light class whenever theme changes
  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('hadeshood_theme', theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  // Load cards from public/cards.txt & public/cards_en.txt via src/data/cards.ts parser
  useEffect(() => {
    Promise.all([fetchCardsFromPublic('fa'), fetchCardsFromPublic('en')]).then(
      ([faCards, enCards]) => {
        setDeckCards({ fa: faCards, en: enCards });
      }
    );
  }, []);

  // Initialize Discord Embedded App SDK (or fallback browser profile) + Socket.io connection
  useEffect(() => {
    let activeSocket: Socket | null = null;

    async function bootstrap() {
      const { profile: initializedProfile, roomId: initialRoomId } =
        await initializeDiscordSdk();

      setProfile(initializedProfile);
      setRoomId(initialRoomId);

      // Determine Socket.io path for Discord Activity proxy (/.proxy/socket.io) vs direct
      const isDiscordProxy =
        typeof window !== 'undefined' &&
        window.location.hostname.includes('discordsays.com');

      const s = io({
        path: isDiscordProxy ? '/.proxy/socket.io' : '/socket.io',
        transports: ['websocket', 'polling'],
      });

      activeSocket = s;
      setSocket(s);

      s.on('connect', () => {
        s.emit('join_room', {
          roomId: initialRoomId,
          profile: {
            id: initializedProfile.id,
            username: initializedProfile.username,
            displayName: initializedProfile.displayName,
            avatarUrl: initializedProfile.avatarUrl,
          },
        });

        // Re-sync any custom cards saved in localStorage so they persist across server restarts
        try {
          const rawSaved = localStorage.getItem('hadeshood_custom_cards_v1');
          if (rawSaved) {
            const savedCards = JSON.parse(rawSaved) as Array<{
              word: string;
              forbiddenWords: string[];
              lang: 'fa' | 'en';
            }>;
            if (Array.isArray(savedCards)) {
              savedCards.forEach((c) => {
                if (c.word && Array.isArray(c.forbiddenWords)) {
                  s.emit('add_custom_card', c);
                }
              });
            }
          }
        } catch {
          // ignore storage errors
        }
      });

      s.on('room_state', (state: RoomState) => {
        setRoomState(state);
        const me = state.players.find((p) => p.id === initializedProfile.id);
        if (me) {
          setProfile((prev) =>
            prev && prev.displayName !== me.displayName
              ? { ...prev, displayName: me.displayName }
              : prev
          );
        }
      });

      s.on('timer_tick', ({ timeRemaining }: { timeRemaining: number }) => {
        setRoomState((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            turn: {
              ...prev.turn,
              timeRemaining,
            },
          };
        });
      });

      s.on(
        'card_event',
        (evt: {
          outcome: CardOutcome;
          word: string;
          byPlayerName?: string;
          violatedWord?: string;
        }) => {
          triggerCardOutcomeFX(evt.outcome);

          setEventBanner({
            id: `${Date.now()}`,
            outcome: evt.outcome,
            word: evt.word,
            byPlayerName: evt.byPlayerName,
            violatedWord: evt.violatedWord,
          });
        }
      );

      s.on('sound_effect', ({ type }: { type: string }) => {
        if (type === 'time_up') {
          soundFX.playTimeUp();
        }
      });

      s.on('clue_blocked', ({ message }: { message: string }) => {
        soundFX.playTabooBuzzer();
        setClueWarning(message);
        setTimeout(() => setClueWarning(null), 3500);
      });

      s.on('floating_reaction', (reaction: FloatingReaction) => {
        setFloatingReactions((prev) => [...prev.slice(-15), reaction]);
        setTimeout(() => {
          setFloatingReactions((prev) => prev.filter((r) => r.id !== reaction.id));
        }, 2400);
      });
    }

    bootstrap();

    return () => {
      if (activeSocket) {
        activeSocket.disconnect();
      }
    };
  }, [triggerCardOutcomeFX]);

  // Synchronize urgent timer heartbeat sound with the exact render frame of timeRemaining
  useEffect(() => {
    if (
      roomState?.phase === 'PLAYING' &&
      !roomState.turn.isPaused &&
      roomState.turn.timeRemaining <= 10 &&
      roomState.turn.timeRemaining > 0
    ) {
      soundFX.playTick(true);
    }
  }, [roomState?.phase, roomState?.turn.isPaused, roomState?.turn.timeRemaining]);

  // Clear card event banner after 2.4 seconds
  useEffect(() => {
    if (!eventBanner) return;
    const timer = setTimeout(() => setEventBanner(null), 2400);
    return () => clearTimeout(timer);
  }, [eventBanner]);

  // Reset perspective override when returning to lobby or changing turn
  useEffect(() => {
    setPerspectiveOverride('AUTO');
  }, [roomState?.phase, roomState?.turn.turnIndex]);

  const handleToggleLang = useCallback(() => {
    setLang((prev) => {
      const next = prev === 'fa' ? 'en' : 'fa';
      socket?.emit('update_settings', { deckLanguage: next });
      return next;
    });
  }, [socket]);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const handleToggleSmoke = useCallback(() => {
    setSmokeEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('hadeshood_smoke', String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  const handleToggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      soundFX.enabled = next;
      if (next) soundFX.playClick();
      return next;
    });
  }, []);

  const handleSaveProfile = useCallback(
    (displayName: string, avatarUrl: string) => {
      if (!profile || !socket) return;
      const updated: DiscordUserProfile = {
        ...profile,
        displayName,
        avatarUrl,
      };
      setProfile(updated);
      saveLocalProfile(updated);
      socket.emit('join_room', {
        roomId,
        profile: {
          id: updated.id,
          username: updated.username,
          displayName: updated.displayName,
          avatarUrl: updated.avatarUrl,
        },
      });
    },
    [profile, socket, roomId]
  );

  if (!profile || !roomState) {
    return (
      <div className="min-h-screen bg-persian-cyber flex flex-col items-center justify-center p-6 text-center relative">
        <SplashCursorBackground theme={theme} enabled={smokeEnabled} />
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-rose-500 p-[2px] animate-spin mb-4">
            <div className="w-full h-full bg-slate-950 rounded-[14px]" />
          </div>
          <h2 className="text-xl font-black text-white">
            {lang === 'fa' ? 'در حال اتصال به اتاق بازی تابو...' : 'Connecting to Taboo Activity...'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">Discord Embedded App SDK • Socket.io</p>
        </div>
      </div>
    );
  }

  // Determine actual role during PLAYING
  const myPlayer = roomState.players.find((p) => p.id === profile.id);
  const actualRole: RolePerspective =
    profile.id === roomState.turn.describerId
      ? 'DESCRIBER'
      : myPlayer?.team === roomState.turn.activeTeam
      ? 'GUESSER'
      : 'WATCHER';

  const effectiveRole: RolePerspective =
    perspectiveOverride === 'AUTO' ? actualRole : perspectiveOverride;

  const describerPlayer = roomState.players.find(
    (p) => p.id === roomState.turn.describerId
  );

  const baseDeckForLang =
    roomState.settings.deckLanguage === 'en' ? deckCards.en : deckCards.fa;
  const customForLang = (roomState.customCards || []).filter(
    (c) => !c.lang || c.lang === roomState.settings.deckLanguage
  );
  const activeDeckList = [...customForLang, ...baseDeckForLang];

  return (
    <div
      className={`min-h-screen bg-persian-cyber flex flex-col justify-between relative ${
        shakeScreen ? 'animate-buzzer-shake' : ''
      }`}
    >
      {/* Interactive WebGL Smoky Fluid Simulation Background */}
      <SplashCursorBackground theme={theme} enabled={smokeEnabled} />

      <div className="relative z-10 flex flex-col min-h-screen justify-between">
      {/* Top Navigation Bar */}
      <TopBar
        lang={lang}
        onToggleLang={handleToggleLang}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        smokeEnabled={smokeEnabled}
        onToggleSmoke={handleToggleSmoke}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        profile={profile}
        onOpenRules={() => setRulesOpen(true)}
        onOpenDeckBrowser={() => setDeckBrowserOpen(true)}
        onOpenCustomCard={() => setCustomCardOpen(true)}
        onOpenEditProfile={() => setEditProfileOpen(true)}
        totalCardsCount={roomState.totalDeckSize || activeDeckList.length}
      />

      {/* Floating Emoji Reactions Layer */}
      <div className="fixed bottom-16 end-8 z-40 pointer-events-none flex flex-col items-center gap-2">
        {floatingReactions.map((r) => (
          <div
            key={r.id}
            className="animate-float-up flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-white/15 shadow-xl"
          >
            <span className="text-2xl">{r.emoji}</span>
            <span className="text-[11px] font-bold text-slate-200">{r.playerName}</span>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 w-full py-3 sm:py-5">
        {roomState.phase === 'LOBBY' && (
          <LobbyView
            room={roomState}
            currentPlayerId={profile.id}
            lang={lang}
            onSwitchTeam={(team: TeamId) => socket?.emit('switch_team', { team })}
            onShuffleTeams={() => socket?.emit('shuffle_teams')}
            onAddBot={() => socket?.emit('add_bot')}
            onRemoveBots={() => socket?.emit('remove_bots')}
            onUpdateSettings={(partial: Partial<GameSettings>) =>
              socket?.emit('update_settings', partial)
            }
            onStartGame={() => socket?.emit('start_game')}
            onOpenCustomCard={() => setCustomCardOpen(true)}
          />
        )}

        {roomState.phase !== 'LOBBY' && (
          <div className="px-3 sm:px-6">
            {/* Live Scoreboard & Timer Header */}
            <ScoreHeader
              room={roomState}
              lang={lang}
              onTogglePause={() => socket?.emit('toggle_pause')}
              onBackToLobby={() => socket?.emit('back_to_lobby')}
            />

            {/* PRE_TURN Phase */}
            {roomState.phase === 'PRE_TURN' && (
              <PreTurnScreen
                room={roomState}
                currentPlayerId={profile.id}
                lang={lang}
                onStartTurn={() => socket?.emit('start_turn')}
              />
            )}

            {/* PLAYING Phase */}
            {roomState.phase === 'PLAYING' && (
              <div className="max-w-6xl mx-auto space-y-4">
                {/* Role Banner & Dev Role Switcher */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/80 border border-white/10 rounded-2xl px-4 py-2.5">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold">
                    {effectiveRole === 'DESCRIBER' ? (
                      <span className="text-emerald-300 flex items-center gap-1.5">
                        <Mic className="w-4 h-4 text-emerald-400" />
                        {t.roleDescriberBanner}
                      </span>
                    ) : effectiveRole === 'GUESSER' ? (
                      <span className="text-cyan-300 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        {t.roleGuesserBanner}
                      </span>
                    ) : (
                      <span className="text-rose-300 flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-rose-400" />
                        {t.roleWatcherBanner}
                      </span>
                    )}
                  </div>

                  {/* Quick Perspective Switcher for Testing Any Role */}
                  <div className="flex items-center gap-1 bg-slate-950/90 p-1 rounded-xl border border-white/10">
                    <Eye className="w-3.5 h-3.5 text-slate-400 ms-1.5 hidden sm:inline" />
                    {(
                      [
                        { key: 'AUTO', label: t.perspectiveActual },
                        { key: 'DESCRIBER', label: t.perspectiveDescriber },
                        { key: 'GUESSER', label: t.perspectiveGuesser },
                        { key: 'WATCHER', label: t.perspectiveWatcher },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => {
                          soundFX.playClick();
                          setPerspectiveOverride(opt.key);
                        }}
                        className={`px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition cursor-pointer ${
                          perspectiveOverride === opt.key
                            ? 'bg-cyan-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Animated Event Feedback Banner (Correct / Taboo / Skip) */}
                {eventBanner && (
                  <div
                    key={eventBanner.id}
                    className={`rounded-2xl px-4 py-2.5 text-center font-black text-sm sm:text-base border animate-card-pop ${
                      eventBanner.outcome === 'CORRECT'
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                        : eventBanner.outcome === 'TABOO'
                        ? 'bg-rose-500/25 border-rose-400 text-rose-200'
                        : 'bg-amber-500/20 border-amber-400 text-amber-200'
                    }`}
                  >
                    {eventBanner.outcome === 'CORRECT' && (
                      <span>
                        🎉 {t.describedCorrectlyMsg} «{eventBanner.word}» (+۱)
                      </span>
                    )}
                    {eventBanner.outcome === 'TABOO' && (
                      <span>
                        🚨 {t.tabooTriggeredMsg} «{eventBanner.word}»
                        {eventBanner.violatedWord
                          ? ` — ${t.violatedWordLabel} «${eventBanner.violatedWord}»`
                          : ''}
                      </span>
                    )}
                    {eventBanner.outcome === 'SKIPPED' && (
                      <span>
                        ⏭️ {t.cardSkippedMsg} «{eventBanner.word}»
                      </span>
                    )}
                  </div>
                )}

                {/* 2-Column Play Area: Taboo Card (7 cols) + Live Guess Feed (5 cols) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                  <div className="lg:col-span-7">
                    <TabooCardView
                      turn={roomState.turn}
                      roleView={effectiveRole}
                      lang={lang}
                      describerName={describerPlayer?.displayName || 'Describer'}
                      onCorrect={() => {
                        triggerCardOutcomeFX('CORRECT');
                        socket?.emit('card_correct');
                      }}
                      onSkip={() => {
                        if (roomState.turn.skipsRemaining <= 0) return;
                        triggerCardOutcomeFX('SKIPPED');
                        socket?.emit('card_skip');
                      }}
                      onBuzzTaboo={(violatedWord?: string) => {
                        if (Date.now() < roomState.turn.buzzerCooldownUntil) return;
                        triggerCardOutcomeFX('TABOO');
                        socket?.emit('buzz_taboo', { violatedWord });
                      }}
                      onRevealHint={() => socket?.emit('reveal_hint')}
                    />
                  </div>

                  <div className="lg:col-span-5">
                    <GuessFeedPanel
                      guesses={roomState.guesses}
                      roleView={effectiveRole}
                      lang={lang}
                      clueWarning={clueWarning}
                      onSubmitGuess={(text: string) =>
                        socket?.emit('submit_guess', { text })
                      }
                      onSendReaction={(emoji: string) =>
                        socket?.emit('send_reaction', { emoji })
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TURN_SUMMARY Phase */}
            {roomState.phase === 'TURN_SUMMARY' && (
              <TurnSummaryScreen
                room={roomState}
                lang={lang}
                onToggleCardOutcome={(index: number) =>
                  socket?.emit('toggle_card_outcome', { index })
                }
                onNextTurn={() => socket?.emit('next_turn')}
              />
            )}

            {/* GAME_OVER Phase */}
            {roomState.phase === 'GAME_OVER' && (
              <GameOverScreen
                room={roomState}
                lang={lang}
                onPlayAgain={() => socket?.emit('start_game')}
                onBackToLobby={() => socket?.emit('back_to_lobby')}
              />
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <RulesModal
        isOpen={rulesOpen}
        onClose={() => setRulesOpen(false)}
        lang={lang}
      />

      <CustomCardModal
        isOpen={customCardOpen}
        onClose={() => setCustomCardOpen(false)}
        lang={lang}
        onAddCard={(word, forbiddenWords) => {
          const cardPayload = {
            word,
            forbiddenWords,
            lang: roomState.settings.deckLanguage,
          };
          socket?.emit('add_custom_card', cardPayload);
          try {
            const rawSaved = localStorage.getItem('hadeshood_custom_cards_v1');
            const prev = rawSaved ? JSON.parse(rawSaved) : [];
            const next = Array.isArray(prev)
              ? [
                  cardPayload,
                  ...prev.filter(
                    (c: { word?: string }) =>
                      c.word?.toLowerCase() !== word.toLowerCase()
                  ),
                ].slice(0, 200)
              : [cardPayload];
            localStorage.setItem('hadeshood_custom_cards_v1', JSON.stringify(next));
          } catch {
            // ignore storage errors
          }
        }}
      />

      <DeckBrowserModal
        isOpen={deckBrowserOpen}
        onClose={() => setDeckBrowserOpen(false)}
        lang={lang}
        cards={activeDeckList}
        onOpenCustomCard={() => setCustomCardOpen(true)}
      />

      <EditProfileModal
        isOpen={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        lang={lang}
        profile={profile}
        onSaveProfile={handleSaveProfile}
      />
      </div>
    </div>
  );
};
export default App;
