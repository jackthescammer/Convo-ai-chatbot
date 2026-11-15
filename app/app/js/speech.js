/*
  Voice input for the conversation: Mandarin speech becomes text in the reply box.
  The learner reads and can edit that text before sending; nothing is sent by voice alone.

  Engine: the speech recognition built into the browser (Web Speech API), set to Mandarin (zh-CN).
  - Chrome and Edge send the audio to their own cloud service (Google, Microsoft) to transcribe it;
    Safari uses Apple's. It needs a connection and a secure page (https or localhost).
  - Firefox has no speech recognition, so `voiceSupported` is false and the mic button isn't shown.
  - Brave and Opera have the API, but their speech service refuses requests, which shows up as a
    "network" error.
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

  const setListening = (on) => {
    if (listening === on) return;
    listening = on;
    onState?.(on);
  };

  function start() {
    if (!voiceSupported || rec) return;
    const r = new Recognition();
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
      rec = null;
      setListening(false);
    };
    rec = r;
    try {
      r.start();
      setListening(true);
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
