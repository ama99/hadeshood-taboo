import 'dotenv/config';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import express from 'express';
import { setupGameServer } from './server/gameServer';

function tabooRealtimeServerPlugin(): Plugin {
  return {
    name: 'taboo-realtime-server',
    configureServer(server) {
      if (!server.httpServer) return;
      const app = express();
      setupGameServer(server.httpServer as import('node:http').Server, app);
      server.middlewares.use(app);
    },
  };
}

export default defineConfig({
  // Required for Discord Activity proxy routing (/.proxy/)
  base: './',
  plugins: [react(), tailwindcss(), tabooRealtimeServerPlugin()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
  },
});
