/* Text to speech through ElevenLabs, for Convo's spoken replies.

   POST /api/tts  { "text": "你好，想喝点什么？", "voice": "jenny" | "jin" }  ->  audio/mpeg

   The API key stays on the server: ELEVENLABS_API_KEY is an environment variable of the Vercel
   project (Settings -> Environment Variables), never in the website's files. For `vercel dev`, put it
   in .env.local (git-ignored).

   "jenny" is the female voice and "jin" the male one (which character uses which: SPEAKER in
   app/js/voice-tts.js). The team chose ElevenLabs' library voices Jenny and Jin, but ElevenLabs only
   lets paid plans use library voices through the API, and the account is on the free plan (it answers
   402 paid_plan_required). Until it's upgraded, both slots use ElevenLabs' built-in voices below.
   To switch after upgrading, set ELEVENLABS_VOICE_JENNY and ELEVENLABS_VOICE_JIN to the library
   voices' ids in Vercel and redeploy; no code change.

   Errors come back as JSON { error, code, lasting }. `lasting` means every later line would fail the
   same way (no key, plan, quota, missing voice), so the website stops asking and uses the browser's
   voice, and the voice conversation says so. */

const API = 'https://api.elevenlabs.io/v1';
const MODEL = 'eleven_multilingual_v2'; // speaks Mandarin; 1 credit per character
const MAX_CHARS = 300;                  // one reply is short; this also caps what a stray request can spend
const HAN = /[㐀-鿿]/;          // Convo's lines are Mandarin; anything else isn't ours to speak

// Built-in ElevenLabs voices, which the free plan can use (tested 2026-11-15). Voice ids are not secret.
const DEFAULT_IDS = {
  jenny: 'EXAVITQu4vr4xnSDxMaL', // Sarah (female)
  jin: 'JBFqnCBsd6RMkjVDRZzb',   // George (male)
};
const voiceId = (name) => process.env[`ELEVENLABS_VOICE_${name.toUpperCase()}`] || DEFAULT_IDS[name];

function sameSite(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // same-origin GET/POST from a page often has none
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}

const fail = (res, status, code, error, lasting = false) => res.status(status).json({ error, code, lasting });

// What an ElevenLabs refusal means for the next line too.
function upstreamFailure(res, status, detail) {
  const kind = detail?.status || detail?.code || '';
  if (kind === 'quota_exceeded') return fail(res, 503, 'quota', 'ElevenLabs credits used up for this month', true);
  if (status === 401) return fail(res, 502, 'bad-key', 'ElevenLabs refused the key', true);
  if (status === 402) return fail(res, 502, 'paid-plan', 'ElevenLabs needs a paid plan for this voice', true);
  if (status === 404) return fail(res, 502, 'voice-missing', 'ElevenLabs has no voice with this id', true);
  if (status === 429) return fail(res, 503, 'busy', 'ElevenLabs is busy');
  return fail(res, 502, 'failed', 'speech failed');
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return fail(res, 405, 'method', 'POST only'); }
  if (!sameSite(req)) return fail(res, 403, 'forbidden', 'forbidden', true);
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return fail(res, 501, 'no-key', 'no key configured', true);

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  const voice = String(body?.voice || '').toLowerCase();
  if (!text || text.length > MAX_CHARS || !HAN.test(text)) return fail(res, 400, 'text', `text must be Mandarin, 1 to ${MAX_CHARS} characters`);
  if (!DEFAULT_IDS[voice]) return fail(res, 400, 'voice', 'voice must be jenny or jin');

  try {
    const r = await fetch(`${API}/text-to-speech/${voiceId(voice)}?output_format=mp3_44100_64`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      // language_code makes short lines like 好的。 come out as Mandarin, not Japanese or Cantonese.
      body: JSON.stringify({ text, model_id: MODEL, language_code: 'zh' }),
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) {
      let detail = null;
      try { detail = (await r.json())?.detail; } catch { /* not JSON */ }
      return upstreamFailure(res, r.status, detail);
    }
    const audio = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    return res.status(200).send(audio);
  } catch {
    return fail(res, 502, 'failed', 'speech failed');
  }
};
