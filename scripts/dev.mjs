// Әзірлеу режимі: API (node --watch) + Vite (HMR) бірге.  npm run dev → http://localhost:5173
import { spawn } from 'node:child_process';

const run = (cmd, args) => spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
const procs = [run('node', ['--watch', 'server/index.ts']), run('npx', ['vite'])];
const stop = () => { for (const p of procs) p.kill(); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
