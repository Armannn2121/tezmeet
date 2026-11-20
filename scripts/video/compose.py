# TezMeet демо-видеосын жинау: экран жазбасы + телефон рамкасы + жазулар + (бар болса) дауыс.
#   python compose.py <video_dir> <out.mp4>
# vo/s1.mp3 … vo/s9.mp3 болса — көріністер дауыс ұзындығына теңестіріледі және дыбыс қосылады.
import json, math, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

D = sys.argv[1]
OUT = sys.argv[2]
RAW = os.path.join(D, 'raw')
WORK = os.path.join(D, 'work')
VO = os.path.join(D, 'vo')
os.makedirs(WORK, exist_ok=True)
W, H, FPS, XF = 1920, 1080, 30, 0.4
FONTS = 'C:/Windows/Fonts/'
BOLD, SEMI, REG = FONTS + 'segoeuib.ttf', FONTS + 'seguisb.ttf', FONTS + 'segoeui.ttf'

SCRIPT = json.load(open(os.path.join(D, 'script.json'), encoding='utf-8'))

def run(args):
    r = subprocess.run(args, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode != 0:
        print(r.stderr[-2000:])
        raise SystemExit(f'ffmpeg failed: {args[:6]}')

def probe(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], capture_output=True, text=True)
    return float(r.stdout.strip())

# ── Фон ──────────────────────────────────────────────────────────
def background():
    bg = Image.new('RGB', (W, H), (6, 7, 18))
    glow = Image.new('RGB', (W, H), (0, 0, 0))
    g = ImageDraw.Draw(glow)
    g.ellipse((-420, -520, 760, 560), fill=(70, 60, 200))
    g.ellipse((1150, 380, 2350, 1500), fill=(10, 100, 230))
    glow = glow.filter(ImageFilter.GaussianBlur(220))
    return Image.blend(bg, glow, 0.55)

def font(path, size):
    return ImageFont.truetype(path, size)

def wrap(draw, text, f, width):
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if draw.textlength(t, font=f) <= width: cur = t
        else: lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines

def app_icon(size):
    ic = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    grad = Image.new('RGB', (size, size))
    gd = ImageDraw.Draw(grad)
    for y in range(size):
        t = y / size
        gd.line([(0, y), (size, y)], fill=(int(94 + (10 - 94) * t), int(92 + (132 - 92) * t), int(230 + (255 - 230) * t)))
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=int(size * 0.225), fill=255)
    ic.paste(grad, (0, 0), mask)
    d = ImageDraw.Draw(ic)
    s = size / 120
    d.ellipse((29 * s, 35 * s, 59 * s, 65 * s), fill=(255, 255, 255, 255))
    d.ellipse((63 * s, 35 * s, 93 * s, 65 * s), fill=(255, 255, 255, 185))
    d.pieslice((22 * s, 71 * s, 66 * s, 113 * s), 180, 360, fill=(255, 255, 255, 255))
    d.pieslice((56 * s, 71 * s, 100 * s, 113 * s), 180, 360, fill=(255, 255, 255, 185))
    return ic

PHONE_H = 920
PHONE_W = round(PHONE_H * 780 / 1688)
PX, PY = 1210, (H - PHONE_H) // 2
RADIUS = 50

def frame_png(sc, path, with_phone=True):
    img = background().convert('RGBA')
    d = ImageDraw.Draw(img)
    # бренд
    img.alpha_composite(app_icon(64), (120, 84))
    d.text((200, 92), 'TezMeet', font=font(BOLD, 40), fill=(255, 255, 255))
    if with_phone:
        # көлеңке және рамка
        sh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle((PX - 14, PY - 4, PX + PHONE_W + 14, PY + PHONE_H + 28), radius=RADIUS + 14, fill=(0, 0, 0, 160))
        img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(30)))
        d.rounded_rectangle((PX - 12, PY - 12, PX + PHONE_W + 12, PY + PHONE_H + 12), radius=RADIUS + 12, fill=(16, 16, 20), outline=(70, 72, 90), width=2)
        tx = 120
        maxw = PX - 120 - 110
    else:
        tx = None
    kick, title, sub = sc['kicker'], sc['title'], sc['subtitle']
    if with_phone:
        y = 330 if sc['id'] != 's1' else 300
        if kick:
            kf = font(SEMI, 26)
            kw = d.textlength(kick, font=kf)
            d.rounded_rectangle((tx, y, tx + kw + 36, y + 46), radius=23, fill=(10, 132, 255))
            d.text((tx + 18, y + 6), kick, font=kf, fill=(255, 255, 255))
            y += 78
        tf = font(BOLD, 84 if sc['id'] == 's1' else 66)
        for line in wrap(d, title, tf, maxw):
            d.text((tx, y), line, font=tf, fill=(255, 255, 255))
            y += int(tf.size * 1.12)
        y += 18
        sf = font(REG, 34)
        for line in wrap(d, sub, sf, maxw):
            d.text((tx, y), line, font=sf, fill=(205, 210, 230))
            y += 48
    else:
        ic = app_icon(150)
        img.alpha_composite(ic, ((W - 150) // 2, 300))
        tf = font(BOLD, 96)
        tw = d.textlength(title, font=tf)
        d.text(((W - tw) / 2, 480), title, font=tf, fill=(255, 255, 255))
        sf = font(REG, 40)
        sw = d.textlength(sub, font=sf)
        d.text(((W - sw) / 2, 620), sub, font=sf, fill=(205, 210, 230))
        lf = font(SEMI, 30)
        link = sc.get('link', '')
        lw = d.textlength(link, font=lf)
        d.text(((W - lw) / 2, 720), link, font=lf, fill=(100, 170, 255))
    img.convert('RGB').save(path)

def mask_png(path):
    m = Image.new('L', (PHONE_W, PHONE_H), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, PHONE_W - 1, PHONE_H - 1), radius=RADIUS, fill=255)
    m.save(path)

# ── Көріністердің ұзақтығы ───────────────────────────────────────
def vo_len(sid, text):
    p = os.path.join(VO, f'{sid}.mp3')
    if os.path.exists(p): return probe(p), p
    return len(text) / 14.5 + 0.3, None  # бағалау: ~14.5 таңба/сек

mask = os.path.join(WORK, 'mask.png')
mask_png(mask)
clips, timeline = [], []
for sc in SCRIPT:
    sid = sc['id']
    vo, vo_path = vo_len(sid, sc['voice'])
    target = vo + 0.9
    out = os.path.join(WORK, f'{sid}.mp4')
    png = os.path.join(WORK, f'{sid}.png')
    if sc.get('raw'):
        frame_png(sc, png, True)
        meta = json.load(open(os.path.join(RAW, sc['raw'], 'frames.json')))
        frames, end = meta['frames'], meta['end']
        lst = os.path.join(WORK, f'{sid}.txt')
        with open(lst, 'w') as f:
            for i, fr in enumerate(frames):
                nxt = frames[i + 1]['t'] if i + 1 < len(frames) else end
                f.write(f"file '{os.path.join(RAW, sc['raw'], fr['f']).replace(os.sep, '/')}'\nduration {max(0.001, (nxt - fr['t']) / 1000):.3f}\n")
            f.write(f"file '{os.path.join(RAW, sc['raw'], frames[-1]['f']).replace(os.sep, '/')}'\n")
        raw_mp4 = os.path.join(WORK, f'{sid}-raw.mp4')
        run(['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-vf', f'fps={FPS},format=yuv420p', '-c:v', 'libx264', '-crf', '16', '-preset', 'veryfast', raw_mp4])
        raw = probe(raw_mp4)
        speed = min(sc.get('max_speed', 1.0), max(1.0, raw / target))
        dur = max(target, raw / speed)
        fc = (f"[0:v]setpts=PTS/{speed:.4f},fps={FPS},tpad=stop_mode=clone:stop_duration={dur:.3f},trim=duration={dur:.3f},"
              f"scale={PHONE_W}:{PHONE_H}:flags=lanczos,format=rgba[s];[2:v]format=gray,scale={PHONE_W}:{PHONE_H}[m];[s][m]alphamerge[p];"
              f"[1:v][p]overlay={PX}:{PY}:format=auto,format=yuv420p[v]")
        run(['ffmpeg', '-y', '-i', raw_mp4, '-loop', '1', '-t', f'{dur:.3f}', '-i', png, '-loop', '1', '-t', f'{dur:.3f}', '-i', mask,
             '-filter_complex', fc, '-map', '[v]', '-r', str(FPS), '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', '-t', f'{dur:.3f}', out])
    else:
        frame_png(sc, png, False)
        dur = target
        run(['ffmpeg', '-y', '-loop', '1', '-t', f'{dur:.3f}', '-i', png, '-vf', f'fps={FPS},format=yuv420p', '-c:v', 'libx264', '-crf', '17', out])
    clips.append((out, dur))
    timeline.append({'id': sid, 'dur': round(dur, 2), 'vo': round(vo, 2), 'voice_file': bool(vo_path)})
    print(f'{sid}: {dur:.1f}s (voice {vo:.1f}s{"" if vo_path else ", estimated"})')

# ── Біріктіру: xfade + дауыс ─────────────────────────────────────
inputs, fc, offs = [], [], []
t = 0.0
for i, (p, dur) in enumerate(clips):
    inputs += ['-i', p]
    offs.append(t)
    t += dur - XF
total = t + XF
prev = '[0:v]'
for i in range(1, len(clips)):
    off = offs[i]
    lab = f'[x{i}]'
    fc.append(f'{prev}[{i}:v]xfade=transition=fade:duration={XF}:offset={off:.3f}{lab}')
    prev = lab
fc.append(f'{prev}fade=t=in:st=0:d=0.5,fade=t=out:st={total - 0.8:.3f}:d=0.8[vout]')

audio_maps = []
n = len(clips)
for i, sc in enumerate(SCRIPT):
    p = os.path.join(VO, f"{sc['id']}.mp3")
    if os.path.exists(p):
        inputs += ['-i', p]
        idx = n + len(audio_maps)
        delay = int((offs[i] + 0.35) * 1000)
        fc.append(f'[{idx}:a]adelay={delay}|{delay},aresample=48000[a{len(audio_maps)}]')
        audio_maps.append(f'[a{len(audio_maps)}]')
cmd = ['ffmpeg', '-y'] + inputs
if audio_maps:
    fc.append(f"{''.join(audio_maps)}amix=inputs={len(audio_maps)}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11,apad,atrim=0:{total:.3f}[aout]")
    cmd += ['-filter_complex', ';'.join(fc), '-map', '[vout]', '-map', '[aout]', '-c:a', 'aac', '-b:a', '192k']
else:
    # дыбыссыз нұсқа: тыныш дорожка (плеерлер үшін)
    cmd += ['-f', 'lavfi', '-t', f'{total:.3f}', '-i', 'anullsrc=r=48000:cl=stereo', '-filter_complex', ';'.join(fc), '-map', '[vout]', '-map', f'{n}:a', '-c:a', 'aac', '-b:a', '96k']
cmd += ['-c:v', 'libx264', '-crf', '19', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-t', f'{total:.3f}', OUT]
run(cmd)
json.dump(timeline, open(os.path.join(WORK, 'timeline.json'), 'w'), indent=1)
print(f'video: {OUT} — {total:.1f}s, voice clips: {len(audio_maps)}/{len(SCRIPT)}')
