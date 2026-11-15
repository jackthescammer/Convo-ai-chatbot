/* Text to speech through ElevenLabs, for Convo's spoken replies.

   POST /api/tts  { "text": "你好，想喝点什么？", "voice": "jenny" | "jin" }  ->  audio/mpeg

   The API key stays on the server: set ELEVENLABS_API_KEY as an environment variable in the Vercel
   project (Settings -> Environment Variables), never in the website's files. The voices are found
   by id (DEFAULT_IDS below, or ELEVENLABS_VOICE_JENNY / ELEVENLABS_VOICE_JIN). With no id the voice
   is found by name among the voices in that ElevenLabs account ("My voices").

   If the key or a voice is missing the answer is an error status and the website falls back to the
   browser's own voice, so conversations never depend on this. */

const API = 'https://api.elevenlabs.io/v1';
const MODEL = 'eleven_multilingual_v2'; // speaks Mandarin
const VOICES = ['jenny', 'jin'];
const MAX_CHARS = 300;                  // one reply is short; this also caps what a stray request can spend

/* Voice ids are not secret (the key is). These are the ones the team chose; an environment variable
   ELEVENLABS_VOICE_JENNY / ELEVENLABS_VOICE_JIN overrides them, and with neither the voice is found by name. */
const DEFAULT_IDS = { jenny: 'vZZLclMx4wouUtKBRfZn', jin: 'vZZLclMx4wouUtKBRfZn' };

const ids = new Map(); // voice name -> { id, at }
const TTL = 10 * 60 * 1000;

async function voiceId(key, name) {
  const pinned = process.env[`ELEVENLABS_VOICE_${name.toUpperCase()}`] || DEFAULT_IDS[name];
  if (pinned) return pinned;
  const hit = ids.get(name);
  if (hit && Date.now() - hit.at < TTL) return hit.id;
  const r = await fetch(`${API}/voices`, { headers: { 'xi-api-key': key } });
  if (!r.ok) throw Object.assign(new Error('voices'), { status: r.status === 401 ? 401 : 502 });
  const { voices = [] } = await r.json();
  const lower = (v) => String(v.name || '').toLowerCase();
  // An exact first word ("Jin - calm") beats a loose match ("Jingle").
  const found = voices.find((v) => lower(v).split(/[^a-z]+/)[0] === name) || voices.find((v) => lower(v).includes(name));
  if (!found) throw Object.assign(new Error('no voice'), { status: 404 });
  ids.set(name, { id: found.voice_id, at: Date.now() });
  return found.voice_id;
}

function sameSite(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // same-origin GET/POST from a page often has none
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'POST only' }); }
  if (!sameSite(req)) return res.status(403).json({ error: 'forbidden' });
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return res.status(501).json({ error: 'no key configured' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  const voice = String(body?.voice || '').toLowerCase();
  if (!text || text.length > MAX_CHARS) return res.status(400).json({ error: `text must be 1 to ${MAX_CHARS} characters` });
  if (!VOICES.includes(voice)) return res.status(400).json({ error: 'voice must be jenny or jin' });

  try {
    const id = await voiceId(key, voice);
    const r = await fetch(`${API}/text-to-speech/${id}?output_format=mp3_44100_64`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text, model_id: MODEL }),
    });
    if (!r.ok) return res.status(r.status === 401 || r.status === 429 ? r.status : 502).json({ error: 'speech failed' });
    const audio = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    return res.status(200).send(audio);
  } catch (err) {
    return res.status(err.status || 502).json({ error: 'speech failed' });
  }
};
