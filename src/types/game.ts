import type { CardCategory, TabooCard } from '../data/cards';

export type TeamId = 'A' | 'B';
export type Language = 'fa' | 'en';
export type ThemeMode = 'dark' | 'light';
export type GamePhase = 'LOBBY' | 'PRE_TURN' | 'PLAYING' | 'TURN_SUMMARY' | 'GAME_OVER';
export type CardOutcome = 'CORRECT' | 'TABOO' | 'SKIPPED';

export interface DiscordUserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  isDiscordAuth: boolean;
  channelId?: string | null;
  guildId?: string | null;
}

export interface Player {
  id: string;
  socketId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  team: TeamId;
  isHost: boolean;
  isBot: boolean;
  isConnected: boolean;
  stats: {
    describedCorrect: number;
    guessedCorrect: number;
    taboosCommitted: number;
    taboosCaught: number;
  };
}

export interface GameSettings {
  turnDuration: number; // e.g., 45, 60, 90, 120 seconds
  targetScore: number; // e.g., 15, 25, 35, 50 points
  maxRounds: number; // e.g., 4, 6, 8, 12 rounds
  maxSkipsPerTurn: number; // e.g., 3, 5, 99 (unlimited)
  maxHintsPerTurn: number; // e.g., 0, 1, 2, 3, 99 (unlimited)
  tabooPenalty: number; // 0 or 1 (subtract 1 point on taboo)
  categories: CardCategory[];
  category?: CardCategory;
  deckLanguage: Language;
  voiceAndTextGuessing: boolean;
}

export interface PlayedCardRecord {
  card: TabooCard;
  outcome: CardOutcome;
  timestamp: number;
  triggeredBy?: string; // e.g., who guessed it or who buzzed taboo + which forbidden word
  violatedWord?: string;
}

export interface TurnState {
  roundNumber: number;
  turnIndex: number;
  activeTeam: TeamId;
  describerId: string;
  timeRemaining: number;
  isPaused: boolean;
  skipsRemaining: number;
  hintsRemaining: number;
  currentCard: TabooCard | null;
  // Masked info for guessing teammates so they can't cheat via network tab
  currentCardHint: {
    category: Exclude<CardCategory, 'all'>;
    wordCount: number;
    letterCount: number;
    firstLetter?: string;
    hintText?: string;
    hintType?: 'word' | 'letter';
    hintRevealed: boolean;
  } | null;
  playedCards: PlayedCardRecord[];
  turnScoreDelta: number;
  buzzerCooldownUntil: number;
}

export interface ChatGuessEntry {
  id: string;
  playerId: string;
  playerName: string;
  playerAvatar: string;
  team: TeamId;
  text: string;
  isCorrect: boolean;
  isSystem?: boolean;
  systemType?: 'correct' | 'taboo' | 'skip' | 'info';
  timestamp: number;
}

export interface FloatingReaction {
  id: string;
  playerId: string;
  playerName: string;
  emoji: string;
  timestamp: number;
}

export interface RoomState {
  roomId: string;
  phase: GamePhase;
  players: Player[];
  scores: {
    A: number;
    B: number;
  };
  teamNames: {
    A: string;
    B: string;
  };
  settings: GameSettings;
  turn: TurnState;
  guesses: ChatGuessEntry[];
  customCardsCount: number;
  totalDeckSize: number;
  remainingDeckSize: number;
  winner: TeamId | 'DRAW' | null;
}
