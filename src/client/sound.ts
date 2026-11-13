// Efectos de sonido sintetizados con Web Audio: no hay archivos de audio (ni licencias) de por medio.
// Se pueden apagar; la preferencia queda en este navegador.

import type { SoundName } from './soundRules';
export type { SoundName };

const KEY = 'pp-sound';
let ctx: AudioContext | null = null;
const listeners = new Set<(on: boolean) => void>();

export function soundEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* sin almacenamiento: vale solo por esta visita */
  }
  listeners.forEach((cb) => cb(on));
  if (on) {
    unlock();
    play('pop');
  }
}

export function onSoundChange(cb: (on: boolean) => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  return ctx;
}

/** Los navegadores solo dejan sonar audio después de un toque: se desbloquea en el primero. */
export function unlock() {
  try {
    void audio()?.resume();
  } catch {
    /* sin audio */
  }
}
if (typeof document !== 'undefined') {
  const once = () => {
    unlock();
    document.removeEventListener('pointerdown', once);
    document.removeEventListener('keydown', once);
  };
  document.addEventListener('pointerdown', once);
  document.addEventListener('keydown', once);
}

interface Note {
  f: number;
  /** Frecuencia final (glissando). */
  to?: number;
  at: number;
  dur: number;
  type?: OscillatorType;
  vol?: number;
}

function tone(a: AudioContext, out: AudioNode, n: Note) {
  const t = a.currentTime + n.at;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = n.type ?? 'triangle';
  o.frequency.setValueAtTime(n.f, t);
  if (n.to) o.frequency.exponentialRampToValueAtTime(n.to, t + n.dur);
  const v = n.vol ?? 0.5;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + n.dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + n.dur + 0.05);
}

function noise(a: AudioContext, out: AudioNode, at: number, dur: number, freq: number, vol: number) {
  const t = a.currentTime + at;
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2;
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = 0.8;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(out);
  src.start(t);
}

const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5, G4 = 392;

const RECIPES: Record<SoundName, (a: AudioContext, out: AudioNode) => void> = {
  // Patada: golpe grave + crujido de madera.
  door: (a, o) => {
    tone(a, o, { f: 140, to: 38, at: 0, dur: 0.32, type: 'sine', vol: 0.9 });
    noise(a, o, 0, 0.18, 700, 0.9);
    tone(a, o, { f: 95, to: 45, at: 0.11, dur: 0.22, type: 'sine', vol: 0.5 });
    noise(a, o, 0.1, 0.25, 320, 0.5);
  },
  level: (a, o) => [C5, E5, G5, C6].forEach((f, i) => tone(a, o, { f, at: i * 0.08, dur: i === 3 ? 0.45 : 0.14, type: 'square', vol: 0.18 })),
  victory: (a, o) => {
    [G4, C5, E5].forEach((f, i) => tone(a, o, { f, at: i * 0.11, dur: 0.13, type: 'triangle', vol: 0.45 }));
    tone(a, o, { f: G5, at: 0.33, dur: 0.6, type: 'triangle', vol: 0.5 });
    tone(a, o, { f: C5, at: 0.33, dur: 0.6, type: 'square', vol: 0.12 });
  },
  // "Wah wah wah waaah" para la huida.
  boo: (a, o) => {
    [[392, 0], [370, 0.32], [349, 0.64]].forEach(([f, at]) => tone(a, o, { f, to: f * 0.96, at, dur: 0.28, type: 'sawtooth', vol: 0.16 }));
    tone(a, o, { f: 330, to: 262, at: 0.96, dur: 0.9, type: 'sawtooth', vol: 0.16 });
  },
  win: (a, o) => {
    const seq: [number, number, number][] = [[G4, 0, 0.12], [C5, 0.14, 0.12], [E5, 0.28, 0.12], [G5, 0.42, 0.26], [E5, 0.7, 0.12], [G5, 0.84, 0.9]];
    seq.forEach(([f, at, dur]) => tone(a, o, { f, at, dur, type: 'square', vol: 0.15 }));
    [C5, E5, G5, C6].forEach((f) => tone(a, o, { f, at: 0.84, dur: 1.1, type: 'triangle', vol: 0.22 }));
  },
  turn: (a, o) => {
    tone(a, o, { f: 880, at: 0, dur: 0.18, type: 'sine', vol: 0.4 });
    tone(a, o, { f: 1318.5, at: 0.14, dur: 0.35, type: 'sine', vol: 0.35 });
  },
  pop: (a, o) => tone(a, o, { f: 520, to: 980, at: 0, dur: 0.09, type: 'sine', vol: 0.25 }),
};

export function play(name: SoundName) {
  if (!soundEnabled()) return;
  // Para pruebas e2e: registra qué sonidos se dispararon (el audio real no se puede escuchar ahí).
  (window as unknown as { __ppSounds?: SoundName[] }).__ppSounds?.push(name);
  try {
    const a = audio();
    if (!a || a.state !== 'running') return;
    const master = a.createGain();
    master.gain.value = 0.55;
    master.connect(a.destination);
    RECIPES[name](a, master);
  } catch {
    /* sin audio: no pasa nada */
  }
}
