/*
  The learner's side of a voice message, next to speech.js (which turns the same speech into words):
  - the microphone's loudness, to see when the learner starts and stops talking (voice activity);
  - the audio itself, trimmed to the speech, so the message can be played back like a voice message.

  Everything stays on the device: the audio becomes a WAV in memory (a blob: URL), kept only while
  the conversation is open. Only the recognised words go to the model.

  Mic level and recording come from one tap on the microphone (an AudioWorklet, or a
  ScriptProcessor where AudioWorklet is missing). If the browser can't open the microphone twice
  (some Android phones, while speech recognition holds it), the conversation still works: the end of
  speech is then judged from the recogniser alone and the message has no audio to replay.
*/

export const captureSupported = typeof window !== 'undefined'
  && Boolean(navigator.mediaDevices?.getUserMedia) && Boolean(window.AudioContext || window.webkitAudioContext);

const CHUNK = 2048;          // samples per analysis step (~43 ms at 48 kHz)
const OUT_RATE = 16000;      // the saved message: 16 kHz mono, 16-bit
const PRE_ROLL = 0.3;        // seconds kept before the first and after the last voiced chunk
const POST_ROLL = 0.35;
const MIN_FLOOR = 0.0025;
const MIN_THRESHOLD = 0.012;

// One AudioContext for the page: Safari only lets it run if it was started from a tap once.
let sharedCtx = null;
function audioContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!sharedCtx || sharedCtx.state === 'closed') sharedCtx = new Ctx();
  return sharedCtx;
}
/** Call from a tap so later turns can open the microphone's audio without one. */
export function unlockAudio() {
  if (!captureSupported) return;
  try { audioContext().resume?.(); } catch { /* ignore */ }
}

const TAP_SOURCE = `class ConvoTap extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Float32Array(${CHUNK}); this.n = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) for (let i = 0; i < ch.length; i++) {
      this.buf[this.n++] = ch[i];
      if (this.n === ${CHUNK}) { this.port.postMessage(this.buf); this.buf = new Float32Array(${CHUNK}); this.n = 0; }
    }
    return true;
  }
}
registerProcessor('convo-tap', ConvoTap);`;
let workletUrl = null;

/**
 * Opens the microphone and starts measuring and recording.
 * @returns {Promise<{ level: number, voiced: boolean, heardVoice: boolean, lastVoiceAt: number,
 *   live: boolean, take: () => Promise<{ url: string, duration: number, wave: number[] } | null>, close: () => void }>}
 */
export async function openCapture() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
  });
  const ctx = audioContext();
  try { await ctx.resume?.(); } catch { /* stays suspended: `live` stays false */ }
  const source = ctx.createMediaStreamSource(stream);
  const mute = ctx.createGain();
  mute.gain.value = 0;
  mute.connect(ctx.destination);

  const chunks = [];       // Float32Array per CHUNK
  const voicedFlags = [];  // was each chunk speech?
  const rmsList = [];
  let floor = 0.006;
  let run = 0;             // consecutive voiced chunks
  let firstVoiced = -1;
  let lastVoiced = -1;
  let closed = false;

  const state = {
    level: 0,          // 0..1, smoothed loudness for the visual
    voiced: false,     // speaking right now
    heardVoice: false, // spoke at all since opening
    lastVoiceAt: 0,    // performance.now() of the last voiced chunk
    live: false,       // audio is actually arriving
  };

  function onChunk(data) {
    if (closed) return;
    state.live = true;
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
    const rms = Math.sqrt(sum / data.length);
    // The noise floor falls fast and rises slowly, so it follows the room, not the voice.
    floor = rms < floor ? floor * 0.6 + rms * 0.4 : floor * 0.996 + rms * 0.004;
    floor = Math.max(floor, MIN_FLOOR);
    const threshold = Math.max(MIN_THRESHOLD, floor * 2.8);
    const loud = rms > threshold;
    run = loud ? run + 1 : 0;
    const index = chunks.length;
    chunks.push(data);
    rmsList.push(rms);
    // Two loud chunks in a row (~90 ms) count as speech; a single click doesn't.
    const voiced = run >= 2 || (loud && state.voiced);
    voicedFlags.push(voiced);
    if (voiced) {
      if (firstVoiced < 0) firstVoiced = Math.max(0, index - 1);
      lastVoiced = index;
      state.lastVoiceAt = performance.now();
      state.heardVoice = true;
    }
    state.voiced = voiced;
    const target = Math.min(1, Math.max(0, (rms - floor) / 0.12));
    state.level = state.level * 0.45 + target * 0.55;
  }

  let node = null;
  try {
    if (ctx.audioWorklet && window.AudioWorkletNode) {
      if (!workletUrl) workletUrl = URL.createObjectURL(new Blob([TAP_SOURCE], { type: 'application/javascript' }));
      await ctx.audioWorklet.addModule(workletUrl);
      node = new AudioWorkletNode(ctx, 'convo-tap', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1 });
      node.port.onmessage = (e) => onChunk(e.data);
    }
  } catch { node = null; }
  if (!node) {
    node = ctx.createScriptProcessor(CHUNK, 1, 1);
    node.onaudioprocess = (e) => onChunk(new Float32Array(e.inputBuffer.getChannelData(0)));
  }
  source.connect(node);
  node.connect(mute);

  function close() {
    if (closed) return;
    closed = true;
    try { source.disconnect(); node.disconnect(); mute.disconnect(); } catch { /* ignore */ }
    if (node.port) node.port.onmessage = null;
    stream.getTracks().forEach((t) => t.stop());
  }

  /** The speech since opening, trimmed to the voice, as a playable WAV. If the level never counted
      as speech (a soft voice the recogniser still understood), the whole recording is kept. */
  async function take() {
    const rate = ctx.sampleRate;
    if (!chunks.length) return null;
    const perChunk = CHUNK / rate;
    const from = firstVoiced < 0 ? 0 : Math.max(0, firstVoiced - Math.ceil(PRE_ROLL / perChunk));
    const to = firstVoiced < 0 ? chunks.length : Math.min(chunks.length, lastVoiced + 1 + Math.ceil(POST_ROLL / perChunk));
    const parts = chunks.slice(from, to);
    const pcm = new Float32Array(parts.length * CHUNK);
    parts.forEach((c, i) => pcm.set(c, i * CHUNK));
    const samples = downsample(pcm, rate, OUT_RATE);
    const duration = samples.length / OUT_RATE;
    const wave = shape(rmsList.slice(from, to), barsFor(duration));
    const url = URL.createObjectURL(encodeWav(samples, OUT_RATE));
    return { url, duration, wave };
  }

  return Object.assign(state, { take, close });
}

/** How many bars a voice message of this length gets. */
export const barsFor = (seconds) => Math.round(Math.min(34, Math.max(16, 12 + seconds * 2.2)));

/** Loudness per chunk -> `count` bar heights between 0.12 and 1. */
function shape(levels, count) {
  if (!levels.length) return Array(count).fill(0.2);
  const bars = [];
  for (let i = 0; i < count; i++) {
    const a = Math.floor((i * levels.length) / count);
    const b = Math.max(a + 1, Math.floor(((i + 1) * levels.length) / count));
    let peak = 0;
    for (let j = a; j < b && j < levels.length; j++) peak = Math.max(peak, levels[j]);
    bars.push(peak);
  }
  const max = Math.max(...bars) || 1;
  return bars.map((v) => Math.round(Math.max(0.12, Math.sqrt(v / max)) * 100) / 100);
}

function downsample(input, from, to) {
  if (from <= to) return input;
  const ratio = from / to;
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const a = Math.floor(i * ratio);
    const b = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = a; j < b; j++) sum += input[j];
    out[i] = sum / Math.max(1, b - a);
  }
  return out;
}

function encodeWav(samples, rate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buffer);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, samples.length * 2, true);
  // Light gain so quiet microphones still play back at a usable level, without clipping.
  let peak = 0;
  for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]));
  const gain = peak > 0 ? Math.min(4, 0.9 / peak) : 1;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] * gain));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}
