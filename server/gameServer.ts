import fs from 'node:fs';
import path from 'node:path';
import type { Server as HttpServer } from 'node:http';
import express, { type Express } from 'express';
import cors from 'cors';
import { Server as SocketIOServer, type Socket } from 'socket.io';
import {
  parseCardsText,
  isGuessCorrect,
  normalizeTextForMatch,
  type TabooCard,
  type CardCategory,
} from '../src/data/cards';
import type {
  CardOutcome,
  ChatGuessEntry,
  FloatingReaction,
  GamePhase,
  GameSettings,
  PlayedCardRecord,
  Player,
  RoomState,
  TeamId,
  TurnState,
} from '../src/types/game';

interface ServerRoom {
  roomId: string;
  phase: GamePhase;
  players: Player[];
  scores: { A: number; B: number };
  teamNames: { A: string; B: string };
  settings: GameSettings;
  turn: TurnState;
  guesses: ChatGuessEntry[];
  customCards: TabooCard[];
  deck: TabooCard[];
  usedCardIds: Set<string>;
  teamRotation: { A: number; B: number };
  winner: TeamId | 'DRAW' | null;
  timerInterval: ReturnType<typeof setInterval> | null;
}

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

function formatPlayerNumberName(num: number, lang: 'fa' | 'en' = 'fa'): string {
  if (lang === 'en') return `Player ${num}`;
  const faNum = String(num).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)] ?? d);
  return `بازیکن شماره ${faNum}`;
}

const BOT_AVATARS = [
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Arash&backgroundColor=06b6d4',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Sara&backgroundColor=ec4899',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Kian&backgroundColor=8b5cf6',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Niloufar&backgroundColor=f59e0b',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Parsa&backgroundColor=10b981',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Mahsa&backgroundColor=f43f5e',
];

export function setupGameServer(httpServer: HttpServer, app: Express) {
  app.use(cors());
  app.use(express.json());

  // Load Persian & English card decks from disk
  const rootDir = process.cwd();
  const faPath = fs.existsSync(path.join(rootDir, 'public', 'cards.txt'))
    ? path.join(rootDir, 'public', 'cards.txt')
    : path.join(rootDir, 'src', 'data', 'cards.txt');
  const enPath = fs.existsSync(path.join(rootDir, 'public', 'cards_en.txt'))
    ? path.join(rootDir, 'public', 'cards_en.txt')
    : path.join(rootDir, 'src', 'data', 'cards_en.txt');

  const baseDecks: { fa: TabooCard[]; en: TabooCard[] } = {
    fa: fs.existsSync(faPath) ? parseCardsText(fs.readFileSync(faPath, 'utf8'), 'fa') : [],
    en: fs.existsSync(enPath) ? parseCardsText(fs.readFileSync(enPath, 'utf8'), 'en') : [],
  };

  console.log(`[Taboo Server] Loaded ${baseDecks.fa.length} Persian cards and ${baseDecks.en.length} English cards.`);

  // REST API: Health & Card Stats
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      persianCards: baseDecks.fa.length,
      englishCards: baseDecks.en.length,
    });
  });

  // Terms of Service & Privacy Policy pages for Discord App Verification
  app.get(['/terms', '/terms-of-service'], (_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Terms of Service — HadesHood Taboo</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #090a14; color: #f8fafc; max-width: 720px; margin: 40px auto; padding: 0 20px; line-height: 1.6; }
    h1, h2 { color: #38bdf8; }
    .card { background: #0f172a; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 28px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Terms of Service — HadesHood Taboo</h1>
    <p><strong>Last Updated:</strong> October 2026</p>
    <h2>1. Acceptance of Terms</h2>
    <p>By accessing or playing HadesHood Taboo ("the Activity") via Discord or web browser, you agree to these Terms of Service.</p>
    <h2>2. Fair Play & Conduct</h2>
    <p>Players must follow Discord's Community Guidelines and Terms of Service at all times while using the Activity, including when submitting guesses or creating custom cards in a game room.</p>
    <h2>3. Availability</h2>
    <p>The Activity is provided "as is" free of charge for entertainment purposes without warranties of any kind.</p>
  </div>
</body>
</html>`);
  });

  app.get(['/privacy', '/privacy-policy'], (_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Privacy Policy — HadesHood Taboo</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #090a14; color: #f8fafc; max-width: 720px; margin: 40px auto; padding: 0 20px; line-height: 1.6; }
    h1, h2 { color: #38bdf8; }
    .card { background: #0f172a; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 28px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Privacy Policy — HadesHood Taboo</h1>
    <p><strong>Last Updated:</strong> October 2026</p>
    <h2>1. Data We Access</h2>
    <p>When launched inside Discord, HadesHood Taboo accesses your basic Discord profile (User ID, display name, and avatar URL) solely to display your player profile in the active game room.</p>
    <h2>2. Ephemeral In-Memory Game State</h2>
    <p>All game rooms, scores, guesses, and custom cards are stored temporarily in server memory only during an active session and are never sold or shared with third parties.</p>
    <h2>3. Contact</h2>
    <p>If you have questions regarding this Privacy Policy, you may contact the developer team through Discord.</p>
  </div>
</body>
</html>`);
  });

  app.get('/api/cards', (req, res) => {
    const lang = req.query.lang === 'en' ? 'en' : 'fa';
    res.json({ cards: baseDecks[lang] });
  });

  // REST API: Discord Embedded App SDK OAuth2 Token Exchange
  app.post('/api/token', async (req, res) => {
    const { code } = req.body || {};
    const clientId =
      process.env.VITE_DISCORD_CLIENT_ID ||
      process.env.DISCORD_CLIENT_ID ||
      '1566438121787363389';
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;

    if (!code || !clientId || !clientSecret) {
      res.status(400).json({
        error: 'Missing Discord OAuth credentials or authorization code. Using local/mock profile fallback.',
      });
      return;
    }

    try {
      const response = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          code,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        res.status(response.status).json({ error: errText });
        return;
      }

      const data = (await response.json()) as { access_token: string };
      res.json({ access_token: data.access_token });
    } catch (error) {
      console.error('[Discord OAuth Error]', error);
      res.status(500).json({ error: 'Token exchange failed' });
    }
  });

  // Socket.io Real-time Authoritative Server
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    path: '/socket.io',
  });

  const rooms = new Map<string, ServerRoom>();
  const socketToRoom = new Map<string, { roomId: string; playerId: string }>();

  function createEmptyTurn(): TurnState {
    return {
      roundNumber: 1,
      turnIndex: 0,
      activeTeam: 'A',
      describerId: '',
      timeRemaining: 60,
      isPaused: false,
      skipsRemaining: 3,
      hintsRemaining: 2,
      currentCard: null,
      currentCardHint: null,
      playedCards: [],
      turnScoreDelta: 0,
      buzzerCooldownUntil: 0,
    };
  }

  function getOrCreateRoom(roomId: string): ServerRoom {
    const normalizedId = roomId.trim().toUpperCase() || 'NEON-1';
    let room = rooms.get(normalizedId);
    if (!room) {
      room = {
        roomId: normalizedId,
        phase: 'LOBBY',
        players: [],
        scores: { A: 0, B: 0 },
        teamNames: { A: 'Team Cyan', B: 'Team Ruby' },
        settings: {
          turnDuration: 60,
          targetScore: 20,
          maxRounds: 6,
          maxSkipsPerTurn: 3,
          maxHintsPerTurn: 2,
          tabooPenalty: 1,
          categories: ['all'],
          category: 'all',
          deckLanguage: 'en',
          voiceAndTextGuessing: true,
        },
        turn: createEmptyTurn(),
        guesses: [],
        customCards: [],
        deck: [],
        usedCardIds: new Set<string>(),
        teamRotation: { A: 0, B: 0 },
        winner: null,
        timerInterval: null,
      };
      rooms.set(normalizedId, room);
    }
    return room;
  }

  function getFilteredPool(room: ServerRoom): TabooCard[] {
    const langDeck = baseDecks[room.settings.deckLanguage] || baseDecks.fa;
    const combined = [...room.customCards, ...langDeck];
    const selectedCats =
      room.settings.categories && room.settings.categories.length > 0
        ? room.settings.categories
        : room.settings.category
        ? [room.settings.category]
        : ['all'];

    if (selectedCats.includes('all')) {
      return combined;
    }
    const filtered = combined.filter(
      (c) => selectedCats.includes(c.category) || c.category === 'custom'
    );
    return filtered.length > 0 ? filtered : combined;
  }

  function shuffleArray<T>(items: T[]): T[] {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function rebuildRoomDeck(room: ServerRoom) {
    const pool = getFilteredPool(room);
    const unused = pool.filter((c) => !room.usedCardIds.has(c.id));
    if (unused.length === 0) {
      room.usedCardIds.clear();
      room.deck = shuffleArray(pool);
    } else {
      room.deck = shuffleArray(unused);
    }
  }

  function drawNextCard(room: ServerRoom): TabooCard | null {
    if (room.deck.length === 0) {
      rebuildRoomDeck(room);
    }
    const card = room.deck.pop() || null;
    if (card) {
      room.usedCardIds.add(card.id);
      const cleanWord = card.word.trim();
      const words = cleanWord.split(/\s+/).filter(Boolean);
      const letters = cleanWord.replace(/\s+/g, '').length;
      const isMultiWordHint = words.length >= 3;
      const hintType: 'word' | 'letter' = isMultiWordHint ? 'word' : 'letter';
      const hintText = isMultiWordHint ? words[0] : cleanWord[0] || '';
      room.turn.currentCard = card;
      room.turn.currentCardHint = {
        category: card.category,
        wordCount: words.length,
        letterCount: letters,
        firstLetter: hintText,
        hintText,
        hintType,
        hintRevealed: false,
      };
      room.turn.buzzerCooldownUntil = Date.now() + 1200;
    } else {
      room.turn.currentCard = null;
      room.turn.currentCardHint = null;
    }
    return card;
  }

  function serializeRoomState(room: ServerRoom): RoomState {
    const pool = getFilteredPool(room);
    return {
      roomId: room.roomId,
      phase: room.phase,
      players: room.players,
      scores: room.scores,
      teamNames: room.teamNames,
      settings: room.settings,
      turn: room.turn,
      guesses: room.guesses.slice(-40),
      customCardsCount: room.customCards.length,
      totalDeckSize: pool.length,
      remainingDeckSize: room.deck.length > 0 ? room.deck.length : pool.length,
      winner: room.winner,
    };
  }

  function broadcastRoomState(room: ServerRoom) {
    io.to(room.roomId).emit('room_state', serializeRoomState(room));
  }

  function addSystemMessage(
    room: ServerRoom,
    text: string,
    systemType: 'correct' | 'taboo' | 'skip' | 'info' = 'info',
    team: TeamId = room.turn.activeTeam
  ) {
    room.guesses.push({
      id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      playerId: 'system',
      playerName: 'سیستم',
      playerAvatar: '',
      team,
      text,
      isCorrect: systemType === 'correct',
      isSystem: true,
      systemType,
      timestamp: Date.now(),
    });
    if (room.guesses.length > 60) {
      room.guesses = room.guesses.slice(-60);
    }
  }

  function stopRoomTimer(room: ServerRoom) {
    if (room.timerInterval) {
      clearInterval(room.timerInterval);
      room.timerInterval = null;
    }
  }

  function selectNextDescriber(room: ServerRoom, team: TeamId): Player | null {
    const teamPlayers = room.players.filter((p) => p.team === team && p.isConnected);
    if (teamPlayers.length === 0) {
      // Fallback to any connected player if a team is empty
      const anyPlayers = room.players.filter((p) => p.isConnected);
      return anyPlayers[0] || null;
    }
    // Prefer human players over bots when selecting the Describer if humans exist on this team
    const humanPlayers = teamPlayers.filter((p) => !p.isBot);
    const candidates = humanPlayers.length > 0 ? humanPlayers : teamPlayers;
    const idx = room.teamRotation[team] % candidates.length;
    room.teamRotation[team] = idx + 1;
    return candidates[idx];
  }

  function setupPreTurn(room: ServerRoom, team: TeamId, roundNumber: number, turnIndex: number) {
    stopRoomTimer(room);
    const describer = selectNextDescriber(room, team);
    room.phase = 'PRE_TURN';
    room.turn = {
      roundNumber,
      turnIndex,
      activeTeam: team,
      describerId: describer ? describer.id : '',
      timeRemaining: room.settings.turnDuration,
      isPaused: false,
      skipsRemaining: room.settings.maxSkipsPerTurn,
      hintsRemaining: room.settings.maxHintsPerTurn ?? 2,
      currentCard: null,
      currentCardHint: null,
      playedCards: [],
      turnScoreDelta: 0,
      buzzerCooldownUntil: 0,
    };
    broadcastRoomState(room);
  }

  function checkMatchEndOrSummary(room: ServerRoom) {
    stopRoomTimer(room);
    // Check if targetScore reached
    if (room.scores.A >= room.settings.targetScore || room.scores.B >= room.settings.targetScore) {
      // If Team A just played and reached targetScore, or if both teams had equal turns
      if (room.turn.activeTeam === 'B' || Math.abs(room.scores.A - room.scores.B) >= 3) {
        room.phase = 'GAME_OVER';
        room.winner =
          room.scores.A > room.scores.B ? 'A' : room.scores.B > room.scores.A ? 'B' : 'DRAW';
        broadcastRoomState(room);
        return;
      }
    }
    room.phase = 'TURN_SUMMARY';
    room.turn.currentCard = null;
    broadcastRoomState(room);
  }

  function startTurnTimer(room: ServerRoom) {
    stopRoomTimer(room);
    room.phase = 'PLAYING';
    room.turn.isPaused = false;
    drawNextCard(room);
    broadcastRoomState(room);

    room.timerInterval = setInterval(() => {
      if (room.phase !== 'PLAYING' || room.turn.isPaused) return;
      room.turn.timeRemaining -= 1;

      if (room.turn.timeRemaining <= 0) {
        room.turn.timeRemaining = 0;
        io.to(room.roomId).emit('sound_effect', { type: 'time_up' });
        checkMatchEndOrSummary(room);
      } else {
        io.to(room.roomId).emit('timer_tick', {
          timeRemaining: room.turn.timeRemaining,
        });
      }
    }, 1000);
  }

  function handleCardResolved(
    room: ServerRoom,
    outcome: CardOutcome,
    byPlayerName?: string,
    violatedWord?: string
  ) {
    if (room.phase !== 'PLAYING' || !room.turn.currentCard) return;

    const resolvedCard = room.turn.currentCard;
    const team = room.turn.activeTeam;
    const describer = room.players.find((p) => p.id === room.turn.describerId);

    if (outcome === 'CORRECT') {
      room.scores[team] += 1;
      room.turn.turnScoreDelta += 1;
      if (describer) describer.stats.describedCorrect += 1;
      addSystemMessage(
        room,
        byPlayerName
          ? `🎉 ${byPlayerName} کلمه «${resolvedCard.word}» را درست حدس زد! (+۱)`
          : `✅ کلمه «${resolvedCard.word}» با موفقیت حل شد! (+۱)`,
        'correct',
        team
      );
    } else if (outcome === 'TABOO') {
      const penalty = room.settings.tabooPenalty;
      room.scores[team] = Math.max(0, room.scores[team] - penalty);
      room.turn.turnScoreDelta -= penalty;
      if (describer) describer.stats.taboosCommitted += 1;
      const wordNote = violatedWord ? ` (کلمه ممنوعه: «${violatedWord}»)` : '';
      addSystemMessage(
        room,
        `🚨 خطای تابو روی «${resolvedCard.word}» توسط ${byPlayerName || 'ناظر'}${wordNote}!`,
        'taboo',
        team
      );
    } else if (outcome === 'SKIPPED') {
      addSystemMessage(room, `⏭️ کارت «${resolvedCard.word}» رد شد.`, 'skip', team);
    }

    room.turn.playedCards.push({
      card: resolvedCard,
      outcome,
      timestamp: Date.now(),
      triggeredBy: byPlayerName,
      violatedWord,
    });

    io.to(room.roomId).emit('card_event', {
      outcome,
      word: resolvedCard.word,
      byPlayerName,
      violatedWord,
      team,
    });

    // Check if active team hit target score immediately
    if (outcome === 'CORRECT' && room.scores[team] >= room.settings.targetScore) {
      checkMatchEndOrSummary(room);
      return;
    }

    drawNextCard(room);
    broadcastRoomState(room);
  }

  io.on('connection', (socket: Socket) => {
    socket.on(
      'join_room',
      (payload: {
        roomId: string;
        profile: {
          id: string;
          username: string;
          displayName: string;
          avatarUrl: string;
        };
      }) => {
        const roomId = (payload.roomId || 'NEON-1').trim().toUpperCase();
        const prev = socketToRoom.get(socket.id);
        if (prev && prev.roomId !== roomId) {
          socket.leave(prev.roomId);
          const oldRoom = rooms.get(prev.roomId);
          if (oldRoom) {
            const p = oldRoom.players.find((pl) => pl.id === prev.playerId);
            if (p) p.isConnected = false;
            broadcastRoomState(oldRoom);
          }
        }

        socket.join(roomId);
        const room = getOrCreateRoom(roomId);

        let existing = room.players.find((p) => p.id === payload.profile.id);
        if (existing) {
          existing.socketId = socket.id;
          existing.isConnected = true;
          existing.displayName = payload.profile.displayName || existing.displayName;
          existing.avatarUrl = payload.profile.avatarUrl || existing.avatarUrl;
        } else {
          // Auto-balance team assignment
          const teamACount = room.players.filter((p) => p.team === 'A' && p.isConnected).length;
          const teamBCount = room.players.filter((p) => p.team === 'B' && p.isConnected).length;
          const assignedTeam: TeamId = teamACount <= teamBCount ? 'A' : 'B';
          const hasActiveHost = room.players.some((p) => p.isHost && p.isConnected && !p.isBot);

          const isDefaultNumberedName =
            !payload.profile.displayName ||
            payload.profile.displayName.startsWith('بازیکن شماره') ||
            payload.profile.displayName.startsWith('Player ');
          const playerNum = room.players.length + 1;
          const assignedName = isDefaultNumberedName
            ? formatPlayerNumberName(playerNum, room.settings.deckLanguage)
            : payload.profile.displayName;

          existing = {
            id: payload.profile.id,
            socketId: socket.id,
            username: payload.profile.username,
            displayName: assignedName,
            avatarUrl: payload.profile.avatarUrl,
            team: assignedTeam,
            isHost: !hasActiveHost,
            isBot: false,
            isConnected: true,
            stats: {
              describedCorrect: 0,
              guessedCorrect: 0,
              taboosCommitted: 0,
              taboosCaught: 0,
            },
          };
          room.players.push(existing);
        }

        socketToRoom.set(socket.id, { roomId, playerId: existing.id });
        broadcastRoomState(room);
      }
    );

    socket.on('switch_team', (payload: { team: TeamId }) => {
      const info = socketToRoom.get(socket.id);
      if (!info) return;
      const room = rooms.get(info.roomId);
      if (!room) return;
      const player = room.players.find((p) => p.id === info.playerId);
      if (player && (payload.team === 'A' || payload.team === 'B')) {
        player.team = payload.team;
        broadcastRoomState(room);
      }
    });

    socket.on('shuffle_teams', () => {
      const info = socketToRoom.get(socket.id);
      if (!info) return;
      const room = rooms.get(info.roomId);
      if (!room || room.phase !== 'LOBBY') return;
      const activePlayers = shuffleArray(room.players.filter((p) => p.isConnected));
      activePlayers.forEach((p, idx) => {
        p.team = idx % 2 === 0 ? 'A' : 'B';
      });
      broadcastRoomState(room);
    });

    socket.on('add_bot', () => {
      const info = socketToRoom.get(socket.id);
      if (!info) return;
      const room = rooms.get(info.roomId);
      if (!room) return;

      const existingBotsCount = room.players.filter((p) => p.isBot).length;
      if (existingBotsCount >= 6) return;

      const avatar = BOT_AVATARS[existingBotsCount % BOT_AVATARS.length];
      const teamACount = room.players.filter((p) => p.team === 'A' && p.isConnected).length;
      const teamBCount = room.players.filter((p) => p.team === 'B' && p.isConnected).length;
      const team: TeamId = teamACount <= teamBCount ? 'A' : 'B';
      const playerNum = room.players.length + 1;

      const botPlayer: Player = {
        id: `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        socketId: 'bot',
        username: `bot_${playerNum}`,
        displayName: formatPlayerNumberName(playerNum, room.settings.deckLanguage),
        avatarUrl: avatar,
        team,
        isHost: false,
        isBot: true,
        isConnected: true,
        stats: {
          describedCorrect: 0,
          guessedCorrect: 0,
          taboosCommitted: 0,
          taboosCaught: 0,
        },
      };
      room.players.push(botPlayer);
      broadcastRoomState(room);
    });

    socket.on('remove_bots', () => {
      const info = socketToRoom.get(socket.id);
      if (!info) return;
      const room = rooms.get(info.roomId);
      if (!room) return;
      room.players = room.players.filter((p) => !p.isBot);
      broadcastRoomState(room);
    });

    socket.on('update_settings', (partial: Partial<GameSettings>) => {
      const info = socketToRoom.get(socket.id);
      if (!info) return;
      const room = rooms.get(info.roomId);
      if (!room) return;

      room.settings = {
        ...room.settings,
        ...partial,
      };
      if (partial.categories && partial.categories.length > 0) {
        room.settings.category = partial.categories[0];
      } else if (partial.category && !partial.categories) {
        room.settings.categories = [partial.category];
      }
      if (partial.deckLanguage) {
        room.players.forEach((p, idx) => {
          if (
            p.displayName.startsWith('بازیکن شماره') ||
            p.displayName.startsWith('Player ')
          ) {
            p.displayName = formatPlayerNumberName(idx + 1, room.settings.deckLanguage);
          }
        });
      }
      rebuildRoomDeck(room);
      broadcastRoomState(room);
    });

    socket.on(
      'add_custom_card',
      (payload: { word: string; forbiddenWords: string[]; lang?: 'fa' | 'en' }) => {
        const info = socketToRoom.get(socket.id);
        if (!info) return;
        const room = rooms.get(info.roomId);
        if (!room) return;

        const cleanWord = (payload.word || '').trim();
        const cleanForbidden = (payload.forbiddenWords || [])
          .map((w) => w.trim())
          .filter(Boolean)
          .slice(0, 6);

        if (!cleanWord || cleanForbidden.length === 0) return;

        const newCard: TabooCard = {
          id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          word: cleanWord,
          forbiddenWords: cleanForbidden,
          category: 'custom',
          lang: payload.lang || room.settings.deckLanguage,
        };
        room.customCards.unshift(newCard);
        room.deck.push(newCard);
        broadcastRoomState(room);
      }
    );

    socket.on('start_game', () => {
      const info = socketToRoom.get(socket.id);
      if (!info) return;
      const room = rooms.get(info.roomId);
      if (!room) return;

      const connectedPlayers = room.players.filter((p) => p.isConnected);
      if (connectedPlayers.length < 4) return;

      // Ensure both teams have at least 2 players
      const teamA = connectedPlayers.filter((p) => p.team === 'A');
      const teamB = connectedPlayers.filter((p) => p.team === 'B');
      if (teamA.length < 2 || teamB.length < 2) {
        connectedPlayers.forEach((p, idx) => {
          p.team = idx % 2 === 0 ? 'A' : 'B';
        });
      }

      room.scores = { A: 0, B: 0 };
      room.winner = null;
      room.guesses = [];
      room.teamRotation = { A: 0, B: 0 };
      room.players.forEach((p) => {
        p.stats = {
          describedCorrect: 0,
          guessedCorrect: 0,
          taboosCommitted: 0,
          taboosCaught: 0,
        };
      });
      rebuildRoomDeck(room);
      setupPreTurn(room, 'A', 1, 1);
    });

    socket.on('start_turn', () => {
      const info = socketToRoom.get(socket.id);
      if (!info) return;
      const room = rooms.get(info.roomId);
      if (!room || room.phase !== 'PRE_TURN') return;

      startTurnTimer(room);
    });

    socket.on('toggle_pause', () => {
      const info = socketToRoom.get(socket.id);
      if (!info) return;
      const room = rooms.get(info.roomId);
      if (!room || room.phase !== 'PLAYING') return;

      room.turn.isPaused = !room.turn.isPaused;
      broadcastRoomState(room);
    });

    socket.on('reveal_hint', () => {
      const info = socketToRoom.get(socket.id);
      if (!info) return;
      const room = rooms.get(info.roomId);
      if (!room || room.phase !== 'PLAYING' || !room.turn.currentCardHint) return;
      if (room.turn.currentCardHint.hintRevealed || room.turn.hintsRemaining <= 0) return;
      room.turn.hintsRemaining -= 1;
      room.turn.currentCardHint.hintRevealed = true;
      broadcastRoomState(room);
    });

    socket.on('card_correct', () => {
      const info = socketToRoom.get(socket.id);
      if (!info) return;
      const room = rooms.get(info.roomId);
      if (!room || room.phase !== 'PLAYING') return;
      handleCardResolved(room, 'CORRECT');
    });

    socket.on('card_skip', () => {
      const info = socketToRoom.get(socket.id);
      if (!info) return;
      const room = rooms.get(info.roomId);
      if (!room || room.phase !== 'PLAYING') return;
      if (room.turn.skipsRemaining <= 0) return;

      room.turn.skipsRemaining -= 1;
      handleCardResolved(room, 'SKIPPED');
    });

    socket.on('buzz_taboo', (payload?: { violatedWord?: string }) => {
      const info = socketToRoom.get(socket.id);
      if (!info) return;
      const room = rooms.get(info.roomId);
      if (!room || room.phase !== 'PLAYING') return;

      // Cooldown protection right after a new card appears
      if (Date.now() < room.turn.buzzerCooldownUntil) return;

      const buzzerPlayer = room.players.find((p) => p.id === info.playerId);
      if (buzzerPlayer && buzzerPlayer.id !== room.turn.describerId) {
        buzzerPlayer.stats.taboosCaught += 1;
      }

      handleCardResolved(
        room,
        'TABOO',
        buzzerPlayer?.displayName || 'ناظر',
        payload?.violatedWord
      );
    });

    socket.on('submit_guess', (payload: { text: string }) => {
      const info = socketToRoom.get(socket.id);
      if (!info) return;
      const room = rooms.get(info.roomId);
      if (!room || !payload?.text?.trim()) return;

      const player = room.players.find((p) => p.id === info.playerId);
      if (!player) return;

      const text = payload.text.trim().slice(0, 120);
      const currentCard = room.turn.currentCard;

      // If player is the Describer during PLAYING, check that they didn't type the target word or forbidden word!
      if (room.phase === 'PLAYING' && currentCard && player.id === room.turn.describerId) {
        const normClue = normalizeTextForMatch(text);
        const normTarget = normalizeTextForMatch(currentCard.word);
        const hasForbidden =
          normClue.includes(normTarget) ||
          currentCard.forbiddenWords.some((fw) => normClue.includes(normalizeTextForMatch(fw)));

        if (hasForbidden) {
          socket.emit('clue_blocked', {
            message: 'پیام شما حاوی کلمه اصلی یا یکی از کلمات ممنوعه بود!',
          });
          return;
        }
      }

      // Check if this is a correct guess during PLAYING
      if (room.phase === 'PLAYING' && currentCard && player.id !== room.turn.describerId) {
        if (isGuessCorrect(text, currentCard.word)) {
          player.stats.guessedCorrect += 1;
          room.guesses.push({
            id: `guess-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            playerId: player.id,
            playerName: player.displayName,
            playerAvatar: player.avatarUrl,
            team: player.team,
            text,
            isCorrect: true,
            timestamp: Date.now(),
          });
          handleCardResolved(room, 'CORRECT', player.displayName);
          return;
        }
      }

      room.guesses.push({
        id: `guess-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        playerId: player.id,
        playerName: player.displayName,
        playerAvatar: player.avatarUrl,
        team: player.team,
        text,
        isCorrect: false,
        timestamp: Date.now(),
      });
      if (room.guesses.length > 60) {
        room.guesses = room.guesses.slice(-60);
      }
      broadcastRoomState(room);
    });

    socket.on('end_turn_early', () => {
      const info = socketToRoom.get(socket.id);
      if (!info) return;
      const room = rooms.get(info.roomId);
      if (!room || room.phase !== 'PLAYING') return;
      checkMatchEndOrSummary(room);
    });

    socket.on('toggle_card_outcome', (payload: { index: number }) => {
      const info = socketToRoom.get(socket.id);
      if (!info) return;
      const room = rooms.get(info.roomId);
      if (!room || room.phase !== 'TURN_SUMMARY') return;

      const record = room.turn.playedCards[payload.index];
      if (!record) return;

      const team = room.turn.activeTeam;
      const penalty = room.settings.tabooPenalty;

      // Undo previous score delta
      if (record.outcome === 'CORRECT') {
        room.scores[team] = Math.max(0, room.scores[team] - 1);
        room.turn.turnScoreDelta -= 1;
      } else if (record.outcome === 'TABOO') {
        room.scores[team] += penalty;
        room.turn.turnScoreDelta += penalty;
      }

      // Cycle: CORRECT -> SKIPPED -> TABOO -> CORRECT
      const nextOrder: Record<CardOutcome, CardOutcome> = {
        CORRECT: 'SKIPPED',
        SKIPPED: 'TABOO',
        TABOO: 'CORRECT',
      };
      record.outcome = nextOrder[record.outcome];

      // Apply new score delta
      if (record.outcome === 'CORRECT') {
        room.scores[team] += 1;
        room.turn.turnScoreDelta += 1;
      } else if (record.outcome === 'TABOO') {
        room.scores[team] = Math.max(0, room.scores[team] - penalty);
        room.turn.turnScoreDelta -= penalty;
      }

      broadcastRoomState(room);
    });

    socket.on('next_turn', () => {
      const info = socketToRoom.get(socket.id);
      if (!info) return;
      const room = rooms.get(info.roomId);
      if (!room || room.phase !== 'TURN_SUMMARY') return;

      const nextTurnIndex = room.turn.turnIndex + 1;
      const nextTeam: TeamId = room.turn.activeTeam === 'A' ? 'B' : 'A';
      const nextRound = nextTeam === 'A' ? room.turn.roundNumber + 1 : room.turn.roundNumber;

      // Check if match should end by maxRounds or targetScore
      if (
        nextRound > room.settings.maxRounds ||
        room.scores.A >= room.settings.targetScore ||
        room.scores.B >= room.settings.targetScore
      ) {
        if (room.turn.activeTeam === 'B' || nextRound > room.settings.maxRounds) {
          room.phase = 'GAME_OVER';
          room.winner =
            room.scores.A > room.scores.B ? 'A' : room.scores.B > room.scores.A ? 'B' : 'DRAW';
          broadcastRoomState(room);
          return;
        }
      }

      setupPreTurn(room, nextTeam, nextRound, nextTurnIndex);
    });

    socket.on('back_to_lobby', () => {
      const info = socketToRoom.get(socket.id);
      if (!info) return;
      const room = rooms.get(info.roomId);
      if (!room) return;
      stopRoomTimer(room);
      room.phase = 'LOBBY';
      room.winner = null;
      broadcastRoomState(room);
    });

    socket.on('send_reaction', (payload: { emoji: string }) => {
      const info = socketToRoom.get(socket.id);
      if (!info || !payload?.emoji) return;
      const room = rooms.get(info.roomId);
      if (!room) return;
      const player = room.players.find((p) => p.id === info.playerId);
      const reaction: FloatingReaction = {
        id: `react-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        playerId: info.playerId,
        playerName: player?.displayName || 'Player',
        emoji: payload.emoji,
        timestamp: Date.now(),
      };
      io.to(room.roomId).emit('floating_reaction', reaction);
    });

    socket.on('disconnect', () => {
      const info = socketToRoom.get(socket.id);
      if (!info) return;
      socketToRoom.delete(socket.id);

      const room = rooms.get(info.roomId);
      if (!room) return;

      const player = room.players.find((p) => p.id === info.playerId);
      if (player) {
        player.isConnected = false;
        if (player.isHost) {
          player.isHost = false;
          const nextHost = room.players.find((p) => p.isConnected && !p.isBot);
          if (nextHost) nextHost.isHost = true;
        }
      }
      broadcastRoomState(room);
    });
  });

  return { io, rooms };
}
