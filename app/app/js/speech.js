/*
  Voice input for the conversation: Mandarin speech becomes text in the reply box.
  The learner reads and can edit that text before sending; nothing is sent by voice alone.

  Engine: the speech recognition built into the browser (Web Speech API), set to Mandarin (zh-CN).
  - Chrome and Edge send the audio to their own cloud service (Google, Microsoft) to transcribe it;
    Safari uses Apple's. It needs a connection and a secure page (https or localhost).
  - Firefox has no speech recognition, so `voiceSupported` is false and the mic button isn't shown.
  - Opera and Brave have the API but no speech service behind it: it says it started and then never
    hears anything, with no error. They're recognised by name, and any other browser that does the
    same is caught by a watchdog. Either way the learner is told to switch browser or type.
  This is not Whisper (CLAUDE.md, Phase 2). A Whisper engine (record with MediaRecorder, transcribe on
  a server) can replace this one by keeping the same shape: createDictation(handlers) returns
  { start, stop, abort, toggle, listening }.

  Transcription is not pronunciation assessment: the recogniser picks the most likely words, so it can
  hide wrong tones by guessing what the learner meant.
*/

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
export const voiceSupported = Boolean(Recognition) && window.isSecureContext;

// Chrome on Android repeats earlier words in continuous mode, so phones there stop after each pause
// (tap again to add more). Elsewhere it keeps listening through pauses until the learner taps stop.
const CONTINUOUS = !/Android/i.test(navigator.userAgent);

// Browsers whose speech recognition is an empty shell (tested: Opera 139 never fires a single event).
const SHELL = /\bOP[RT]\//.test(navigator.userAgent) ? 'Opera' : ('brave' in navigator ? 'Brave' : '');
const noService = (name) => `${name || 'This browser'} can't turn speech into text, because it has no speech service. To speak, open Convo in Chrome, Edge or Safari. You can still type here.`;
// How long to wait for the service to say it's listening before calling it dead. Longer while the
// browser may still be asking for microphone permission.
const WATCHDOG_MS = { granted: 5000, other: 20000 };

const ERRORS = {
  'not-allowed': 'Microphone access is blocked. Allow it for this site in your browser settings, then try again.',
  'service-not-allowed': 'This browser doesn\'t allow voice input here. Try Chrome, Edge or Safari.',
  'audio-capture': 'No microphone was found.',
  'no-speech': 'Didn\'t hear anything. Tap the mic and try again.',
  network: 'Voice input couldn\'t reach the browser\'s speech service. Check your connection, or try Chrome, Edge or Safari.',
  'language-not-supported': 'This browser can\'t recognise Mandarin.',
};

/**
 * @param {object} handlers
 * @param {(text: string, final: boolean) => void} [handlers.onText]  everything heard since start, replaced on each update
 * @param {(listening: boolean) => void} [handlers.onState]
 * @param {(message: string, code: string) => void} [handlers.onError]  a message to show the learner
 */
export function createDictation({ lang = 'zh-CN', onText, onState, onError } = {}) {
  let rec = null;
  let listening = false;
  let watchdog = 0;
  let started = false; // the current recogniser's service said it's listening

  const setListening = (on) => {
    if (listening === on) return;
    listening = on;
    onState?.(on);
  };

  // If the service never says it started, it isn't there: stop pretending to listen.
  async function armWatchdog(r) {
    let state = 'other';
    try { state = (await navigator.permissions.query({ name: 'microphone' })).state; } catch { /* not supported */ }
    if (r !== rec || started) return;
    watchdog = setTimeout(() => {
      if (r !== rec || started) return;
      onError?.(noService(''), 'no-service');
      abort();
    }, state === 'granted' ? WATCHDOG_MS.granted : WATCHDOG_MS.other);
  }

  function start() {
    if (!voiceSupported || rec) return;
    if (SHELL) {
      onError?.(noService(SHELL), 'no-service');
      return;
    }
    const r = new Recognition();
    started = false;
    r.onstart = () => {
      if (r !== rec) return;
      started = true;
      clearTimeout(watchdog);
    };
    r.lang = lang;
    r.interimResults = true;
    r.continuous = CONTINUOUS;
    r.maxAlternatives = 1;
    // Each handler checks it still belongs to the current recogniser, so a stopped one can't write late.
    r.onresult = (e) => {
      if (r !== rec) return;
      let text = '';
      let final = true;
      for (const result of e.results) {
        text += result[0].transcript;
        if (!result.isFinal) final = false;
      }
      onText?.(text, final);
    };
    r.onerror = (e) => {
      if (r !== rec || e.error === 'aborted') return;
      onError?.(ERRORS[e.error] || 'Voice input stopped. Tap the mic to try again.', e.error);
    };
    r.onend = () => {
      if (r !== rec) return;
      clearTimeout(watchdog);
      rec = null;
      setListening(false);
    };
    rec = r;
    try {
      r.start();
      setListening(true);
      armWatchdog(r);
    } catch (err) {
      rec = null;
      onError?.('Voice input couldn\'t start. Tap the mic to try again.', 'start');
    }
  }

  // Keeps what was heard: the last words still arrive, then it ends.
  const stop = () => rec?.stop();

  // Drops anything still on its way (the learner started typing, or sent the message).
  function abort() {
    const r = rec;
    if (!r) return;
    clearTimeout(watchdog);
    rec = null;
    r.abort();
    setListening(false);
  }

  return {
    start,
    stop,
    abort,
    toggle: () => (rec ? stop() : start()),
    get listening() { return listening; },
  };
}
