// TezMeet демо-видеосының экран жазбасы: headless Chrome + DevTools Protocol.
// Нақты қолданбада нақты басулар мен теру; әр көрініс бөлек кадрлар жиыны болып сақталады.
//   node record.mjs <outDir>
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.argv[2];
const BASE = 'http://127.0.0.1:8080';
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9334;
const profileDir = join(OUT, 'chrome-profile');
rmSync(profileDir, { recursive: true, force: true });
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profileDir}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ws, id = 0;
const pending = new Map();
let frameSink = null;
function send(method, params = {}) {
  return new Promise((resolve) => { const i = ++id; pending.set(i, resolve); ws.send(JSON.stringify({ id: i, method, params })); });
}
async function connect() {
  let target;
  for (let i = 0; i < 60 && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page'); } catch { await sleep(200); }
  }
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
    if (m.method === 'Page.screencastFrame') {
      const { data, sessionId } = m.params;
      ws.send(JSON.stringify({ id: ++id, method: 'Page.screencastFrameAck', params: { sessionId } }));
      frameSink?.(data);
    }
  });
}

async function js(expression) {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error(`JS error: ${r.result.exceptionDetails.text} in ${expression.slice(0, 120)}`);
  return r.result?.result?.value;
}

async function waitFor(expr, timeout = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await js(`!!(${expr})`)) return;
    await sleep(150);
  }
  throw new Error(`timeout waiting for ${expr}`);
}

// Элементті табу: көрінбесе — баяу айналдырып көрсетеміз, сосын ортасының координатасы
async function locate(expr) {
  return js(`(async () => {
    const el = (${expr});
    if (!el) return null;
    let r = el.getBoundingClientRect();
    if (r.top < 90 || r.bottom > innerHeight - 110) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      await new Promise((ok) => setTimeout(ok, 700));
      r = el.getBoundingClientRect();
    }
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  })()`);
}

async function tap(expr, after = 450) {
  const p = await locate(expr);
  if (!p) throw new Error(`not found: ${expr}`);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1 });
  await sleep(90);
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 });
  await sleep(after);
}

async function type(text, cps = 22) {
  for (const ch of text) {
    await send('Input.insertText', { text: ch });
    await sleep(1000 / cps);
  }
}

async function scroll(dy, steps = 12, x = 195, y = 420) {
  for (let i = 0; i < steps; i++) {
    await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY: dy / steps });
    await sleep(35);
  }
}

// Элементтерді мәтін бойынша іздейтін JS өрнектері
const byText = (sel, text) => `[...document.querySelectorAll(${JSON.stringify(sel)})].find((e) => e.innerText.trim() === ${JSON.stringify(text)})`;
const byStart = (sel, text) => `[...document.querySelectorAll(${JSON.stringify(sel)})].find((e) => e.innerText.trim().startsWith(${JSON.stringify(text)}))`;

const scenes = [];
async function scene(name, fn) {
  const dir = join(OUT, name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const frames = [];
  let n = 0;
  frameSink = (data) => {
    const f = `f${String(++n).padStart(5, '0')}.jpg`;
    writeFileSync(join(dir, f), Buffer.from(data, 'base64'));
    frames.push({ f, t: Date.now() });
  };
  const start = Date.now();
  await send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: 780, maxHeight: 1688, everyNthFrame: 1 });
  // бастапқы кадр міндетті түрде болсын
  await js('document.body.style.outline = "0px solid transparent"; 1');
  try {
    await fn();
  } finally {
    await sleep(300);
    await send('Page.stopScreencast');
    frameSink = null;
  }
  const end = Date.now();
  writeFileSync(join(dir, 'frames.json'), JSON.stringify({ start, end, frames }));
  scenes.push({ name, seconds: (end - start) / 1000, frames: frames.length });
  console.log(`scene ${name}: ${((end - start) / 1000).toFixed(1)}s, ${frames.length} frames`);
}

try {
  await connect();
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }, { name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await send('Page.enable');
  await send('Page.navigate', { url: `${BASE}/` });
  await sleep(1200);
  await js(`localStorage.clear(); localStorage.setItem('tm.lang', 'ru'); 1`);
  await send('Page.navigate', { url: `${BASE}/` });
  await waitFor(`document.querySelector('.welcome')`);
  await sleep(800);

  await scene('s1-welcome', async () => {
    await sleep(3200);
  });

  await scene('s2-form', async () => {
    await tap(byText('.welcome .btn', 'Заполнить анкету'), 700);
    await tap(byStart('.goal-row', '💼'), 400);
    await tap(`document.querySelector('input[aria-label="Имя"]')`, 200);
    await type('Дана Ермекова', 16);
    await tap(byStart('.row', 'Роль'), 700);
    await tap(byText('.sheet .row', 'Backend-разработчик'), 700);
    await tap(`document.querySelector('.stepper button[aria-label="+"]')`, 250);
    await tap(`document.querySelector('.stepper button[aria-label="+"]')`, 400);
    await tap(byText('.row', 'Добавить технологию'), 800);
    for (const s of ['Go', 'PostgreSQL']) await tap(byText('.sheet .chips .chip', s), 250);
    await tap(byText('.sheet .row', 'Docker'), 350);
    await sleep(300);
    await tap(byText('.sheet .nav-btn', 'Готово'), 700);
    await tap(byText('.chip', 'FinTech'), 250);
    await tap(byText('.chip', 'Облака и DevOps'), 350);
    await tap(`document.querySelector('textarea[aria-label="«О себе»"]')`, 250);
    await type('Go-разработчик, 3 года в стартапе. Ищу сильную финтех-команду.', 30);
    await sleep(400);
    await tap(`document.querySelector('.sticky-cta .btn')`, 200);
    await waitFor(`document.querySelectorAll('.card .name').length >= 3`);
    await sleep(300);
  });

  await scene('s3-recs', async () => {
    await sleep(2200);
    await scroll(520, 16);
    await sleep(1400);
    await scroll(-520, 16);
    await sleep(700);
    await tap(`document.querySelector('.card .head')`, 1300);
    await scroll(700, 16, 195, 600);
    await sleep(1600);
    await tap(byText('.sheet .nav-btn', 'Готово'), 800);
  });

  await scene('s4-chat', async () => {
    await tap(`document.querySelector('.card .pill-btn.primary')`, 1600);
    await tap(`document.querySelector('.send-btn')`, 200);
    await waitFor(`document.querySelectorAll('.msg-row.theirs').length >= 1`, 20000);
    await sleep(1600);
    await tap(`document.querySelector('.composer textarea')`, 200);
    await type('Отлично! Давайте встретимся сегодня?', 20);
    await sleep(300);
    await tap(`document.querySelector('.send-btn')`, 200);
    await waitFor(`document.querySelectorAll('.msg-row.theirs').length >= 2`, 20000);
    await sleep(2200);
  });

  await scene('s5-meet', async () => {
    await tap(`document.querySelector('.chat-header .nav-btn[aria-label="Встреча"]')`, 1000);
    await waitFor(`document.querySelector('.sheet .slot-grid .chip')`);
    await tap(`document.querySelectorAll('.sheet .slot-grid .chip')[0]`, 500);
    await tap(`document.querySelector('.sheet .btn.filled')`, 600);
    await sleep(2400);
  });

  await scene('s6-feedback', async () => {
    await tap(`document.querySelector('.chat-header a.nav-btn')`, 700);
    await tap(byText('.tab', 'Для вас'), 1500);
    const target = `document.querySelectorAll('.card')[1]?.querySelector('.pill-btn.gray')`;
    await tap(target, 300);
    await sleep(2600);
  });

  await scene('s7-home', async () => {
    await tap(byText('.tab', 'Главная'), 1800);
    await scroll(560, 16);
    await sleep(1500);
    await scroll(-560, 16);
    await sleep(600);
    await tap(byText('.tab', 'Профиль'), 1000);
    await tap(byText('.segmented button', 'Қазақша'), 1200);
    await tap(byText('.tab', 'Басты'), 2200);
  });

  await scene('s8-hall', async () => {
    await tap(byText('.tab', 'Зал'), 1600);
    await scroll(620, 20);
    await sleep(2400);
  });

  writeFileSync(join(OUT, 'scenes.json'), JSON.stringify(scenes, null, 2));
} finally {
  try { ws?.close(); } catch { /* */ }
  proc.kill();
}
