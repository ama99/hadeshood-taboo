import { DiscordSDK, DiscordSDKMock } from '@discord/embedded-app-sdk';
import type { DiscordUserProfile } from '../types/game';

const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID || '1566438121787363389';

const AVATAR_SEEDS = [
  'Felix',
  'Aneka',
  'Jasper',
  'Milo',
  'Luna',
  'Zoe',
  'Leo',
  'Maya',
];

let discordSdkInstance: DiscordSDK | DiscordSDKMock | null = null;

/**
 * Checks whether the current window is running inside a Discord Activity iframe.
 */
export function isRunningInDiscordIframe(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return Boolean(params.get('frame_id') && params.get('instance_id'));
}

/**
 * Generates or retrieves a per-tab local dev player profile so multiple browser tabs
 * act as separate multiplayer clients out of the box.
 */
export function getOrCreateLocalProfile(): DiscordUserProfile {
  const storageKey = 'taboo_dev_profile_v3';
  const saved = sessionStorage.getItem(storageKey);
  if (saved) {
    try {
      return JSON.parse(saved) as DiscordUserProfile;
    } catch {
      // ignore corrupted storage
    }
  }

  const randomIdx = Math.floor(Math.random() * AVATAR_SEEDS.length);
  const suffix = Math.floor(100 + Math.random() * 900);
  const seed = AVATAR_SEEDS[randomIdx % AVATAR_SEEDS.length] + suffix;
  const profile: DiscordUserProfile = {
    id: `local-${Date.now()}-${suffix}`,
    username: `player_${suffix}`,
    displayName: 'Player 1',
    avatarUrl: `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(seed)}&backgroundColor=06b6d4,8b5cf6,ec4899,10b981`,
    isDiscordAuth: false,
    channelId: 'NEON-1',
    guildId: 'local-guild',
  };

  sessionStorage.setItem(storageKey, JSON.stringify(profile));
  return profile;
}

export function saveLocalProfile(profile: DiscordUserProfile): void {
  sessionStorage.setItem('taboo_dev_profile_v3', JSON.stringify(profile));
}

/**
 * Initializes the Discord Embedded App SDK (`await discordSdk.ready()`),
 * authorizes the client, exchanges the OAuth code for an access token,
 * and returns the user's Discord avatar, username, and ID.
 * Falls back gracefully to mock local dev mode when opened in a regular browser.
 */
export async function initializeDiscordSdk(): Promise<{
  profile: DiscordUserProfile;
  roomId: string;
  sdk: DiscordSDK | DiscordSDKMock;
}> {
  const inDiscord = isRunningInDiscordIframe();

  if (!inDiscord) {
    // Graceful Local Browser Dev Mode using DiscordSDKMock
    const mockSdk = new DiscordSDKMock(DISCORD_CLIENT_ID, 'local-guild', 'NEON-1', 'local-location');
    discordSdkInstance = mockSdk;
    const localProfile = getOrCreateLocalProfile();
    return {
      profile: localProfile,
      roomId: localProfile.channelId || 'NEON-1',
      sdk: mockSdk,
    };
  }

  try {
    const discordSdk = new DiscordSDK(DISCORD_CLIENT_ID);
    discordSdkInstance = discordSdk;

    // Wait for Discord client handshake with a safety timeout
    await Promise.race([
      discordSdk.ready(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('discordSdk.ready() timed out')), 6000)
      ),
    ]);

    const roomFromChannel = discordSdk.channelId
      ? `DISC-${discordSdk.channelId.slice(-6).toUpperCase()}`
      : discordSdk.instanceId
      ? `INST-${discordSdk.instanceId.slice(0, 6).toUpperCase()}`
      : 'NEON-1';

    // 1. Authorize with Discord client
    const { code } = await discordSdk.commands.authorize({
      client_id: DISCORD_CLIENT_ID,
      response_type: 'code',
      state: '',
      prompt: 'none',
      scope: ['identify', 'guilds'],
    });

    // 2. Exchange code for access_token via backend (/.proxy/api/token or ./api/token)
    const tokenEndpoint = window.location.hostname.includes('discordsays.com')
      ? '/.proxy/api/token'
      : './api/token';

    const tokenRes = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    if (!tokenRes.ok) {
      throw new Error(`Token exchange returned ${tokenRes.status}`);
    }

    const { access_token } = (await tokenRes.json()) as { access_token: string };

    // 3. Authenticate with Discord SDK
    const auth = await discordSdk.commands.authenticate({ access_token });
    if (!auth?.user) {
      throw new Error('Discord authenticate() returned no user');
    }

    const user = auth.user;
    const avatarUrl = user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`
      : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(user.id) >> 22n) % 6}.png`;

    const profile: DiscordUserProfile = {
      id: user.id,
      username: user.username,
      displayName: user.global_name || user.username,
      avatarUrl,
      isDiscordAuth: true,
      channelId: discordSdk.channelId,
      guildId: discordSdk.guildId,
    };

    return {
      profile,
      roomId: roomFromChannel,
      sdk: discordSdk,
    };
  } catch (err) {
    console.warn('[Discord SDK] Falling back to guest profile inside Activity/Browser:', err);
    const fallbackProfile = getOrCreateLocalProfile();
    const roomFromSdk =
      discordSdkInstance?.channelId
        ? `DISC-${discordSdkInstance.channelId.slice(-6).toUpperCase()}`
        : fallbackProfile.channelId || 'NEON-1';

    return {
      profile: fallbackProfile,
      roomId: roomFromSdk,
      sdk:
        discordSdkInstance ||
        new DiscordSDKMock(DISCORD_CLIENT_ID, 'local-guild', 'NEON-1', 'local-location'),
    };
  }
}
