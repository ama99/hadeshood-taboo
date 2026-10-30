import 'dotenv/config';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import { setupGameServer } from './gameServer';

const PORT = Number(process.env.PORT || 3001);
const app = express();
const httpServer = http.createServer(app);

setupGameServer(httpServer, app);

// Serve built Vite frontend if dist/ exists
const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 [Taboo Discord Activity Server] Running on http://localhost:${PORT}`);
});
