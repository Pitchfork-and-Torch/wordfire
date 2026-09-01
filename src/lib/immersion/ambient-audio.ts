/**
 * Procedural campfire ambient (Web Audio) — no media files, works offline.
 * Soft filtered noise crackle + low rumble. Tasteful, never loud by default.
 */

type AmbientHandle = {
  setVolume: (v: number) => void;
  setEnabled: (on: boolean) => void;
  dispose: () => void;
};

let shared: AmbientHandle | null = null;

function createNoiseBuffer(ctx: AudioContext, seconds = 2): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buf;
}

export function getAmbientAudio(): AmbientHandle {
  if (shared) return shared;

  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let crackleGain: GainNode | null = null;
  let rumbleGain: GainNode | null = null;
  let noiseSrc: AudioBufferSourceNode | null = null;
  let rumbleOsc: OscillatorNode | null = null;
  let enabled = false;
  let volume = 0.35;
  let popTimer: number | null = null;

  function ensureGraph() {
    if (ctx) return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // Crackle: bandpassed noise
    crackleGain = ctx.createGain();
    crackleGain.gain.value = 0.22;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1200;
    filter.Q.value = 0.7;
    const noise = createNoiseBuffer(ctx, 3);
    noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noise;
    noiseSrc.loop = true;
    noiseSrc.connect(filter);
    filter.connect(crackleGain);
    crackleGain.connect(master);
    noiseSrc.start();

    // Soft low rumble
    rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0.04;
    rumbleOsc = ctx.createOscillator();
    rumbleOsc.type = "sine";
    rumbleOsc.frequency.value = 55;
    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = "lowpass";
    rumbleFilter.frequency.value = 120;
    rumbleOsc.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(master);
    rumbleOsc.start();

    schedulePops();
  }

  function schedulePops() {
    if (!ctx || !master || !enabled) return;
    const delay = 400 + Math.random() * 1800;
    popTimer = window.setTimeout(() => {
      if (!ctx || !master || !enabled) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(180 + Math.random() * 400, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.08 * volume, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.connect(g);
      g.connect(master);
      osc.start(t);
      osc.stop(t + 0.15);
      schedulePops();
    }, delay);
  }

  function applyGain() {
    if (!master || !ctx) return;
    const target = enabled ? Math.max(0, Math.min(1, volume)) * 0.55 : 0;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.35);
  }

  shared = {
    setVolume(v: number) {
      volume = Math.max(0, Math.min(1, v));
      applyGain();
    },
    setEnabled(on: boolean) {
      enabled = on;
      if (on) {
        ensureGraph();
        void ctx?.resume();
        if (popTimer == null) schedulePops();
      } else if (popTimer != null) {
        window.clearTimeout(popTimer);
        popTimer = null;
      }
      applyGain();
    },
    dispose() {
      if (popTimer != null) window.clearTimeout(popTimer);
      try {
        noiseSrc?.stop();
        rumbleOsc?.stop();
        void ctx?.close();
      } catch {
        /* ignore */
      }
      ctx = null;
      shared = null;
    },
  };

  return shared;
}

/** One-shot soft “word added” chime — very quiet */
export function playWordChime(volume = 0.2) {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(380, t + 0.15);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06 * volume, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.25);
    window.setTimeout(() => void ctx.close(), 400);
  } catch {
    /* ignore */
  }
}
