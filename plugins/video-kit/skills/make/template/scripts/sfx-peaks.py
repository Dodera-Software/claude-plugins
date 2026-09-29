"""Where each sound effect is loudest, so a cue can hit exactly on its moment on screen.

Decode first (in the render image): ffmpeg -i sound.ogg -ac 1 -ar 22050 sound.wav
Usage: python3 scripts/sfx-peaks.py sound.wav [more.wav …]   → paste into CUES in src/kit/audio/cues.ts
"""
import array, json, sys, wave


def peak(path):
    w = wave.open(path)
    data = array.array('h', w.readframes(w.getnframes()))
    loudest = max(range(len(data)), key=lambda i: abs(data[i]))
    return round(loudest / w.getframerate(), 3)


print(json.dumps({p.rsplit('/', 1)[-1].rsplit('.', 1)[0]: peak(p) for p in sys.argv[1:]}, indent=2))
