import { spawn } from 'node:child_process';
import fs from 'node:fs';

console.log('🚀 Starting HadesHood Taboo Server (port 5173) + Cloudflare Tunnel...\n');

const viteProc = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true,
});

const cfCandidates = [
  'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe',
  'C:\\Program Files\\cloudflared\\cloudflared.exe',
  'cloudflared',
];

const cfBin =
  cfCandidates.find((p) => p === 'cloudflared' || fs.existsSync(p)) || 'cloudflared';

setTimeout(() => {
  const cfProc = spawn(cfBin, ['tunnel', '--url', 'http://localhost:5173'], {
    stdio: 'inherit',
  });

  process.on('SIGINT', () => {
    cfProc.kill();
    viteProc.kill();
    process.exit(0);
  });
}, 2000);
