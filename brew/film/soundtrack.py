"""Synthesised sound design for the brew launch film (72 s, 48 kHz stereo).

Every cue is placed on the same timeline as film.mjs: UI ticks, typing, whooshes on the
shape transitions, the dead-silent freeze, and one warm "brew" signature chord.
    python3 soundtrack.py  ->  out/soundtrack.wav
"""
import os
import wave
import numpy as np

SR = 48000
DUR = 72.0
N = int(DUR * SR)
rng = np.random.default_rng(7)
mix = np.zeros((N, 2))


def t_(d):
    return np.arange(int(d * SR)) / SR


def place(x, at, gain=1.0, pan=0.0):
    """Add mono signal x at time `at` (s), equal-power pan -1..1."""
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


# ---------- Act I: the loop (0–5.5), hard cut to silence ----------
place(band(rng.standard_normal(int(5.5 * SR)), 80, 600) * 0.004, 0)          # room tone
place(click(), 1.02, 0.5, 0.2)                                              # cursor click
for i in range(6):
    place(tick(900 + i * 120, 0.08), 1.7 + i * 0.08, 0.18, -0.6 + i * 0.24)   # cards deal in
for k in range(9):
    place(tick(1400, 0.05), 2.3 + k / 4.5, 0.06)                             # highlight steps the ring
r = np.random.default_rng(3)
for k in range(46):                                                         # notifications pile up
    at = 3.5 + (k / 46) ** 0.7 * 1.95
    place(ping(r.choice([880, 988, 1175, 1319, 1568])), at, 0.06 + 0.06 * k / 46, r.uniform(-0.8, 0.8))
for k in range(70):
    place(key(), 3.6 + r.uniform(0, 1.85), 0.08, r.uniform(-0.5, 0.5))
place(riser(2.1), 3.4, 0.22)
mix[int(5.5 * SR) : int(6.2 * SR)] = 0                                      # THE FREEZE: dead silence

# ---------- Act II: reveal ----------
place(thunk(), 6.55, 0.55)
rev = whoosh(1.3, 200, 5000)
rev *= np.linspace(0, 1, len(rev)) ** 2
place(rev, 7.5, 0.25)
place(click(0.7), 8.8, 0.3)
place(signature(), 9.0, 0.42)

# ---------- music bed (Act III onward) ----------
BPM = 108
beat = 60 / BPM
prog = [[110.0, 130.81, 164.81, 246.94], [87.31, 110.0, 130.81, 164.81], [130.81, 164.81, 196.0, 246.94], [98.0, 123.47, 146.83, 164.81]]
bar = beat * 4


def level(t):
    """Bed loudness over the film: full, dipped for the human-review act, out for the payoff."""
    if t < 11.0:
        return 0
    if t < 25.0:
        return 1.0
    if t < 33.05:
        return 0.35
    if t < 65.0:
        return 1.0
    if t < 67.0:
        return 0.25
    return 0.0


t = 11.0
i = 0
while t < 67.0:
    lv = level(t)
    place(pad(prog[i % 4], bar + 0.6, a=0.4, rel=0.6), t, 0.055 * max(lv, 0.5) if t < 67 else 0)
    place(pad([prog[i % 4][0] / 2], bar + 0.4, a=0.05, rel=0.4), t, 0.05 * lv)
    for b in range(4):
        bt = t + b * beat
        if bt >= 67.0:
            break
        lvb = level(bt)
        drums = lvb if not (25.0 <= bt < 33.05) else 0  # no beat while a person watches
        place(kick(), bt, 0.28 * drums)
        place(hat(), bt + beat / 2, 0.05 * drums, 0.3)
        if b % 2 == 1:
            place(hat(), bt + beat * 0.75, 0.03 * drums, -0.3)
    t += bar
    i += 1

# ---------- Act III: pipeline ----------
for k in range(39):
    place(key(), 11.65 + k * 0.95 / 39, 0.1, rng.uniform(-0.2, 0.2))
place(click(1.2), 12.75, 0.3)
for k in range(6):
    place(whoosh(0.25, 2000, 9000), 13.2 + k * 0.1, 0.05, -0.7 + k * 0.28)  # cards fly
place(tick(2200), 13.9, 0.12)
place(tick(2400), 14.02, 0.12)
for k in range(6):
    place(tick(1100, 0.05), 15.7 + k * 0.09, 0.07)
place(whoosh(0.6, 300, 4000), 17.6, 0.12)
place(whoosh(0.9, 500, 6000), 19.55, 0.1)
for k in range(10):
    place(click(0.8), 19.7 + k * 0.1, 0.06, -0.6 + k * 0.12)               # clips snap in
place(whoosh(0.8, 150, 3000), 22.5, 0.15)

# ---------- Act IV: a person watches (slow, tactile) ----------
for k in range(40):
    place(tick(600 + 40 * (k % 3), 0.03), 25.7 + k * 0.03, 0.05)           # scrub, frame by frame
place(stamp(180), 27.8, 0.18)                                               # wrong shot
place(whoosh(0.4, 1000, 8000), 29.1, 0.1, 0.5)                              # brackets jump
place(click(1.4), 29.4, 0.35, 0.4)                                          # shutter
place(signature(0.4), 29.45, 0.18)
for k in range(15):
    place(tick(1300 + k * 40, 0.05), 31.28 + k * 0.085, 0.12, -0.4 if k < 8 else 0.4)
place(whoosh(0.5, 200, 5000), 32.6, 0.2)
place(signature(), 33.3, 0.45)

# ---------- Act V: what we make ----------
for at in (34.5, 42.6, 45.75, 48.5, 55.3, 64.65):
    place(whoosh(0.55, 250, 7000), at - 0.05, 0.22, rng.uniform(-0.3, 0.3))
for k, at in enumerate([35.35, 35.95, 36.55, 37.15]):
    place(stamp(220 * 2 ** (k * 3 / 12)), at, 0.22)
for k in range(8):
    place(tick(1600, 0.04), 37.4 + k * 0.07, 0.08, -0.6 + k * 0.17)
place(ping(1319), 39.9, 0.08)
for k in range(58):
    place(key(), 43.55 + k * 1.1 / 58, 0.09)
place(click(), 45.47, 0.32)
place(whoosh(1.0, 300, 9000), 45.7, 0.15)
for k in range(3):
    place(whoosh(0.3, 1500, 8000), 49.1 + k * 0.15, 0.08, -0.6 + k * 0.6)
for k in range(12):
    place(tick(900 + k * 60, 0.05), 52.7 + k * 0.07, 0.1, rng.uniform(-0.7, 0.7))
for k in range(8):
    place(whoosh(0.35, 2500, 9000), 56.5 + k * 0.07, 0.05, -0.8 + k * 0.23)
strip = whoosh(1.0, 1000, 6000)
strip *= np.linspace(1, 0, len(strip))
place(strip, 62.0, 0.15)
place(click(0.9), 62.98, 0.25)
place(stamp(160), 63.95, 0.2)
place(stamp(130), 64.07, 0.2)

# ---------- Act VI: you approve ----------
rv = whoosh(0.9, 400, 6000)
rv *= np.linspace(0, 1, len(rv)) ** 3
place(rv, 65.5, 0.18)
place(click(), 66.36, 0.38)
place(ping(659), 66.4, 0.08)
place(click(1.1), 68.06, 0.38)
place(pad([220.0, 277.18, 329.63], 4.4, a=1.2, rel=2.0), 67.6, 0.07)
place(signature(), 69.6, 0.55)

# ---------- master ----------
fade = np.ones(N)
fade[int(71.3 * SR) :] = np.linspace(1, 0, N - int(71.3 * SR)) ** 1.5
mix *= fade[:, None]
mix = np.tanh(mix * 1.6) / np.tanh(1.6)        # gentle glue / soft limit
mix *= 0.89 / np.max(np.abs(mix))               # ≈ -1 dBFS peak
os.makedirs(os.path.join(os.path.dirname(__file__), 'out'), exist_ok=True)
path = os.path.join(os.path.dirname(__file__), 'out', 'soundtrack.wav')
with wave.open(path, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('wrote', path)
