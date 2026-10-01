"""Synthesised sound design for brew launch film v3 (93 s, 48 kHz stereo).

Every cue is placed on the same timeline as v3/scenes.mjs: UI ticks, typing, whooshes on the
shape transitions, the dead-silent freeze, and one warm "brew" signature chord.
    python3 v3/soundtrack.py  ->  v3/out/soundtrack.wav
"""
import os
import wave
import numpy as np

SR = 48000
DUR = 93.0
N = int(DUR * SR)
rng = np.random.default_rng(11)
mix = np.zeros((N, 2))


def t_(d):
    return np.arange(int(d * SR)) / SR


def place(x, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= N:
        return
    x = x[: N - i] * gain
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    mix[i : i + len(x), 0] += x * l
    mix[i : i + len(x), 1] += x * r


def band(x, lo, hi):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x))


def env(d, a=0.005, decay=0.1):
    t = t_(d)
    return np.minimum(t / max(a, 1e-4), 1) * np.exp(-np.maximum(t - a, 0) / decay)


def norm(x):
    m = np.max(np.abs(x))
    return x / m if m > 0 else x


# ---------- instruments ----------
def click(bright=1.0):
    d = 0.03
    x = band(rng.standard_normal(int(d * SR)), 1500, 9000) * env(d, 0.0005, 0.004)
    return norm(x + 0.5 * np.sin(2 * np.pi * 2400 * bright * t_(d)) * env(d, 0.0005, 0.006))


def tick(f=1800, d=0.06):
    return np.sin(2 * np.pi * f * t_(d)) * env(d, 0.001, 0.012)


def key():
    d = 0.05
    x = band(rng.standard_normal(int(d * SR)), 900, 6000) * env(d, 0.0008, 0.008)
    return norm(x) * 0.7 + 0.3 * tick(rng.uniform(500, 700), d)


def ping(f):
    d = 0.5
    t = t_(d)
    return (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t)) * env(d, 0.002, 0.09)


def whoosh(d=0.6, lo=400, hi=7000):
    x = band(rng.standard_normal(int(d * SR)), lo, hi)
    shape = np.sin(np.pi * np.clip(t_(d) / d, 0, 1)) ** 2.5
    return norm(x * shape)


def thunk(f0=80, f1=42, d=0.6):
    t = t_(d)
    ph = 2 * np.pi * np.cumsum(f1 + (f0 - f1) * np.exp(-t / 0.05)) / SR
    return np.sin(ph) * env(d, 0.002, 0.18) + 0.3 * np.pad(click(0.6), (0, len(t) - len(click())))


def kick():
    d = 0.4
    t = t_(d)
    ph = 2 * np.pi * np.cumsum(45 + 110 * np.exp(-t / 0.03)) / SR
    return np.sin(ph) * env(d, 0.001, 0.12)


def hat():
    d = 0.06
    return norm(band(rng.standard_normal(int(d * SR)), 7000, 16000)) * env(d, 0.0005, 0.015)


def pad(freqs, d, a=0.6, rel=0.8):
    t = t_(d)
    x = np.zeros_like(t)
    for f in freqs:
        for det in (-0.12, 0.12):
            for k in range(1, 7):
                x += np.sin(2 * np.pi * f * k * (1 + det / 100) * t + rng.uniform(0, 6.28)) / k ** 1.8
    e = np.minimum(t / a, 1) * np.minimum((d - t) / rel, 1).clip(0, 1)
    return norm(x) * e


def signature(gain_tail=1.0):
    """The brew sonic logo: a soft bell on an A-major-9 voicing with a warm tail."""
    d = 3.2
    t = t_(d)
    notes = [220.0, 277.18, 329.63, 415.30, 493.88]
    bell = sum(np.sin(2 * np.pi * f * t) * np.exp(-t / 1.2) + 0.25 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.25) for f in notes)
    return norm(bell) * np.minimum(t / 0.004, 1) + 0.6 * gain_tail * pad(notes[:3], d, a=0.08, rel=1.8)


def stamp(f):
    d = 0.35
    t = t_(d)
    return np.sin(2 * np.pi * f * t) * env(d, 0.002, 0.07) + 0.4 * np.pad(click(), (0, len(t) - len(click())))


def riser(d):
    t = t_(d)
    sweep = np.sin(2 * np.pi * np.cumsum(70 + 330 * (t / d) ** 2) / SR)
    n = band(rng.standard_normal(len(t)), 800, 9000)
    return (0.6 * sweep + 0.4 * norm(n)) * (t / d) ** 2.2



def typing(start, chars, dur, gain=0.08):
    for k in range(chars):
        place(key(), start + k * dur / max(chars, 1) + rng.uniform(-0.01, 0.01), gain, rng.uniform(-0.2, 0.2))


def sweep(f0, f1, d):
    t = t_(d)
    return np.sin(2 * np.pi * np.cumsum(f0 + (f1 - f0) * t / d) / SR) * np.sin(np.pi * t / d) ** 2


# ---------- music: bright major bed, enters on "Meet" ----------
BPM = 104
beat = 60 / BPM
bar = beat * 4
prog = [[146.83, 220.0, 277.18, 329.63], [123.47, 185.0, 220.0, 293.66], [98.0, 146.83, 185.0, 246.94], [110.0, 164.81, 220.0, 277.18]]


def pad_level(t):
    return 0 if t < 11.0 else 1.0


def drum_level(t):
    if t < 17.3:
        return 0
    if 31.5 <= t < 44.0:   # a person reviews: pad only
        return 0
    if 72.5 <= t:          # the close: pad only
        return 0
    return 1.0


t = 11.0
i = 0
while t < 87.5:
    lv = 0.045 if t < 79.5 else 0.03
    place(pad(prog[i % 4], bar + 0.8, a=0.6, rel=0.8), t, lv)
    place(pad([prog[i % 4][0] / 2], bar + 0.4, a=0.05, rel=0.4), t, 0.04 * (1 if 17.3 <= t < 72.5 else 0.5))
    for b in range(4):
        bt = t + b * beat
        d = drum_level(bt)
        if d:
            place(kick(), bt, 0.18 * d)
            place(hat(), bt + beat / 2, 0.045 * d, 0.3)
            place(hat(), bt + beat * 0.75, 0.025 * d, -0.3)
    t += bar
    i += 1
place(pad([146.83, 220.0, 293.66, 369.99], 7.5, a=1.5, rel=3.5), 85.5, 0.06)   # held final chord

# ---------- the problem ----------
place(band(rng.standard_normal(int(11 * SR)), 80, 600) * 0.004, 0)
typing(0.3, 14, 1.2); typing(2.2, 21, 1.5)
for k, at in enumerate([2.3, 2.9, 3.4, 3.8, 4.1]):
    place(ping([988, 1175, 1319, 1568, 1175][k]), at, 0.05, rng.uniform(-0.7, 0.7))
place(tick(2600, 0.04), 4.7, 0.12)
place(whoosh(0.5, 300, 4000), 6.3, 0.12, -0.4)
typing(6.45, 18, 1.0)
place(thunk(110, 38, 0.8), 8.2, 0.55); place(whoosh(0.35, 600, 9000), 8.15, 0.25)
place(tick(1500, 0.05), 9.45, 0.12); place(tick(1700, 0.05), 9.6, 0.12)

# ---------- meet brew ----------
place(whoosh(0.8, 200, 3000), 10.6, 0.1)
place(whoosh(0.3, 1500, 9000), 12.6, 0.08, 0.5)
place(signature(), 12.75, 0.4)
rise = whoosh(2.0, 200, 5000)
rise *= np.linspace(0, 1, len(rise)) ** 1.5
place(rise, 17.3, 0.12)

# ---------- we make it ----------
typing(20.75, 39, 1.7)
place(click(), 23.0, 0.32)
place(whoosh(0.6, 400, 6000), 23.3, 0.12)
place(whoosh(0.5, 150, 3000), 25.0, 0.18, 0.6)
for k in range(7):
    place(tick(1200 + k * 90, 0.05), 25.8 + k * 0.8, 0.14, 0.4)
place(whoosh(0.4, 300, 4000), 31.15, 0.14, -0.6)
typing(32.1, 18, 1.1)
place(sweep(300, 900, 1.5), 33.5, 0.05)
hum = band(rng.standard_normal(int(2.8 * SR)), 90, 400) * 0.6 + 0.4 * np.sin(2 * np.pi * 120 * t_(2.8))
place(norm(hum) * np.sin(np.pi * t_(2.8) / 2.8), 35.6, 0.035)
for k in range(4):
    place(tick(1600, 0.05), 36.2 + k * 0.45, 0.12)
place(ping(659) + ping(831) * 0.6, 38.75, 0.12)
swell = whoosh(1.6, 60, 600)
swell *= np.linspace(0, 1, len(swell)) ** 2
place(swell, 40.5, 0.2)
place(thunk(90, 50, 0.4), 42.1, 0.35); place(click(0.8), 42.1, 0.2)
place(whoosh(0.7, 300, 9000), 43.3, 0.28)
place(click(0.7), 44.6, 0.18); place(ping(1319), 45.0, 0.07)
place(stamp(180), 47.5, 0.25)
place(whoosh(0.3, 500, 9000), 49.0, 0.3, 0.6); place(whoosh(0.3, 500, 9000), 50.05, 0.25, -0.6)

# ---------- you drive it ----------
typing(51.0, 10, 0.6, 0.05)
sw = whoosh(0.6, 2000, 12000)
place(sw * np.linspace(0, 1, len(sw)), 53.4, 0.12)
for k in range(5):
    place(tick(2000 + k * 120, 0.04), 54.1 + k * 0.05, 0.07)
place(tick(2400, 0.04), 55.2, 0.1)
place(whoosh(0.4, 800, 9000), 55.65, 0.18)
typing(56.35, 42, 2.3)
place(click(0.6), 58.9, 0.15)
for k in range(4):
    place(whoosh(0.4, 3000, 12000), 59.8 + k * 0.12, 0.05, -0.6 + k * 0.4)
place(click(), 61.85, 0.3)
place(whoosh(0.4, 600, 8000), 63.0, 0.15)
for k in range(3):
    place(ping([587, 740, 880][k]), 64.0 + k * 1.5, 0.12)
for k in range(4):
    place(tick(1100 + k * 150, 0.05), 68.8 + k * 0.9, 0.13)
place(ping(988), 69.6, 0.06)

# ---------- close ----------
place(whoosh(1.2, 200, 3000), 72.5, 0.08)
typing(75.1, 23, 1.1)
place(signature(0.4), 77.0, 0.16)
place(signature(), 79.6, 0.5)
place(whoosh(0.9, 80, 900), 82.2, 0.12)
typing(82.9, 32, 2.6, 0.06)
place(click(0.9), 88.1, 0.25)
typing(88.5, 17, 1.0, 0.05)

# ---------- master ----------
fade = np.ones(N)
fade[int(91.8 * SR):] = np.linspace(1, 0, N - int(91.8 * SR)) ** 1.5
mix *= fade[:, None]
mix = np.tanh(mix * 1.6) / np.tanh(1.6)
mix *= 0.89 / np.max(np.abs(mix))
here = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(here, 'out'), exist_ok=True)
path = os.path.join(here, 'out', 'soundtrack.wav')
with wave.open(path, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('wrote', path)
