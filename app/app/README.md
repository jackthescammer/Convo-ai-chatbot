# Convo app (demo)

Static HTML/CSS/JS, no build step, no sign-in. Two pages share this folder:

| Page | What it is | Files |
| ---- | ---------- | ----- |
| `index.html` | Setup (onboarding), built in a separate workstream | `js/main.js`, `js/onboarding.js`, `css/app.css` |
| `home.html` | The app after setup: dashboard, conversation, reports, settings | everything below |

Setup hands off to `home.html`: its last screen opens `home.html#/talk`, and an onboarded learner who opens `/app/` is sent to `home.html`. Settings links back to `index.html#/hello` for "Go through setup again".

`home.html` shares tokens and components with the landing page (`../landing/styles.css`); setup's `css/app.css` carries its own copy of the same tokens (DESIGN.md). Both draw the mascot with `../mascot/convo-mascot.js` and use absolute paths, so serve the **project root**:

```sh
python -m http.server 5500 --bind 127.0.0.1
```

Then open http://127.0.0.1:5500/app/home.html (or http://127.0.0.1:5500/app/ to go through setup first).

## index.html (setup)

Duolingo's onboarding pattern, adapted to Convo: the mascot asks one question per screen in a speech bubble, and the next bubble opens by reacting to your answer.

| Route | What it asks or shows |
| ----- | --------------------- |
| `#/welcome` | Start, or skip setup (A2, Standard, all layers) |
| `#/hello` | Convo introduces itself |
| `#/why` | Why you're learning, any number of reasons (saved as `reasons`) |
| `#/level` | How much you know, mapped to A1 or A2 (`knows`, `level`) |
| `#/check` | Optional level check: two barista lines, which could you answer? |
| `#/display` | 汉字 / Pinyin / English, with a live preview of the conversation |
| `#/difficulty` | Easy / Standard / Challenging, suggested from your level, with the opening line at each |
| `#/goals` | What the café conversation practises, and that corrections wait for the report |
| `#/ready` | Summary with Change links (`?from=ready` returns there), then Start opens `home.html#/talk` |

Any step opened with `?from=settings` (Settings › Setup uses `#/check?from=settings`) shows Save and returns to `home.html#/settings/setup`.

Each step has its own URL, so browser Back and refresh work and answers are saved as they're chosen. Number keys pick options and Enter continues. Copy and options live in `js/onboarding.js`; routing, the shared mascot and the keyboard live in `js/main.js`.

## home.html

Sidebar on desktop (icon-only on mid-size screens and during a conversation); top bar and bottom tab bar on phones.

| Route | File | What it is |
| ----- | ---- | ---------- |
| `#/home` | `js/dashboard.js` | Greeting, the conversation in progress (resume) or the one started last, the other conversations ("More conversations"), this week against your weekly goal and streak, latest report, patterns that keep coming up, practice totals, your setup with a display preview. Everything is worked out from reports on this device (`js/stats.js`); nothing is estimated. |
| `#/talk[/scenario]` | `js/talk.js` | The conversation: chat, Convo in the scenario's role, and (when the model provides them) "Help me reply" phrases, goals and notes saved for the report. `#/talk/shop` (or `cafe`, `restaurant`, `interview`, `chat`) opens that conversation; plain `#/talk` resumes the one in progress or starts the last one. Leaving and coming back resumes it; starting a different one ends it without a report. |
| `#/reports` | `js/history.js` | Every report on this device. |
| `#/report/:id` | `js/report.js` | The post-conversation report: summary, goals, corrections (said / better / why), patterns, transcript. |
| `#/settings[/section]` | `js/settings.js` | Profile (name for the greeting), setup (go through setup again; the two-sentence level check, which returns here on Save), learning (level, difficulty, why you're learning, weekly goal), display (layers, Chinese text size), conversation (show notes, show "Help me reply", Enter sends, calm mascot), your data (export reports as JSON, delete reports, reset everything), about. Saves as you change things. |

`js/shell.js` is the router and chrome. `js/kit.js` has app-side helpers (mascots with the calm-mascot preference, dates, the switch control, icons, reason labels).

## Where things are stored (this browser only)

| Key | Written by | Holds |
| --- | ---------- | ----- |
| `convo-app-settings` | setup and Settings, through `js/store.js` | `onboarded`, `reasons`, `knows`, `level`, `difficulty`, `difficultyPicked` |
| `convo-layers` | `js/ui.js` | 汉字 / Pinyin / English, shared with the landing page |
| `convo-app-reports` | `js/store.js` | up to 12 reports |
| `convo-app-prefs` | `js/prefs.js` | name, weekly goal, Chinese text size, notes, help, Enter to send, calm mascot, the conversation started last |
| `convo-model-url` | `js/model.js` | the live model link, if it was changed from the built-in one (or `placeholder`) |

`js/store.js` and `js/ui.js` are shared with setup; app-only preferences live in `js/prefs.js` so the two pages can change independently.

## The model

Everything the UI needs goes through `js/model.js`:

- `model.start({ settings })` returns the opening turn.
- `model.reply({ history, settings })` returns the next turn: reply (汉字, pinyin, English), and optionally mood, notes for the report, goals reached, suggested phrases, and whether the conversation ended.
- `model.report({ history, notes, settings })` returns the report.

The shapes are documented at the top of the file, and every response goes through `validateTurn` / `validateReport` before it's shown. Setup also imports `GOALS` from this file, so keep that export (ids `order`, `answer`, `surprise`, `pay`).

### Conversations (scenarios)

| Id | Title | Convo is | Server character |
| -- | ----- | -------- | ---------------- |
| `cafe` | Ordering at a café | the barista | 小林, a café waiter |
| `shop` | Buying things at a shop | the shop assistant | 小王, at a small neighbourhood shop |
| `restaurant` | Ordering at a restaurant | the server | 小李, at a family restaurant |
| `interview` | A job interview | the interviewer | 刘经理, a bookshop manager hiring a part-time assistant |
| `chat` | Open conversation | your new friend | 小雨, a student who picks the topics and leads |

`SCENARIOS` in `js/model.js` holds what the app shows (title, Convo's role, the scene line above the chat, goals, and an optional `image`, relative to `home.html`, e.g. `img/scenes/cafe.webp`; a conversation without one shows its Chinese word, e.g. 购物, instead). The prompts are on the server, in the team repo's `convo/scenarios.py`; the ids must match. Every call's `settings` carries `scenario`, and reports save its title (`scenario`) and id (`scenarioId`).

### The live model (default)

The conversation runs on the team's model: Qwen2.5-3B-Instruct with the v6 prompts, served by the Gradio app in [jackthescammer/Convo-ai-chatbot](https://github.com/jackthescammer/Convo-ai-chatbot) (`app.py` and `convo/`), started by hand on a Google Colab GPU with `share=True`. `gradioModel` in `js/model.js` calls its `/start`, `/send` and `/finish` endpoints:

- The server keeps the conversation under a `session_hash` that the client makes up on `start` and sends with every call. Only the newest learner message goes up on `send`.
- Replies come back as display text (`汉字`, `*pinyin*`, `> English`, from `convo/render.py`), and the report as Markdown (`Report.to_markdown` in `convo/review.py`). Code on the server writes both formats, not the model, so the client can parse them back into the shapes above. Fix titles such as "杯 → 个" come from comparing what was written with the correction.
- The name in the rail, the report and Settings › About is what the server's own footer says it runs (for example "Qwen2.5-3B-Instruct, prompts v6"), not an assumption.
- **Scenarios need prompts v7 or later on the server.** Those servers add `/start_scenario` (level, difficulty, display, scenario) and `/check_scenario` (text, level, scenario); the app finds them in `/gradio_api/info` when a conversation starts and uses them. `/start` and `/check` stay as they were (always the café), because Gradio rejects a call that's missing an input, and the site deployed before scenarios sends three. Against an older server the café still works, and any other conversation stops with "The live model is running an older version that only has the café conversation…". It never runs the café in its place. Settings › About says "Online, café only" for such a server.

**The link changes every time Colab restarts.** Update `DEFAULT_MODEL_URL` in `js/model.js`, or without editing code, paste the new `https://….gradio.live` link in Settings › About, or open the app once with `?model=<link>`. Settings › About also checks whether the link is up.

If the model can't be reached, the conversation shows "Can't reach the live model" with Try again. It never switches to the placeholder on its own.

What the live model doesn't send, the UI hides instead of guessing: goals (rail, report, report list), notes while you talk (its corrections all come in the report), "Help me reply" phrases, the barista's mood, and the end of the conversation (you end it). Its replies take about 3 seconds; the report checks every sentence one by one, so it takes longer.

### The placeholder

Open the app with `?model=placeholder` (or type `placeholder` in Settings › About) to click through the design without the model. Its barista lines follow a fixed order and ignore what the learner wrote, and its notes come from three hand-written pattern checks (`吗` after a question word, `是` before 很-adjectives, `个` with drinks). The other conversations get their own opening line, then the same four generic replies, which tick that conversation's goals in order. The conversation rail, the report and Settings › About all say so.

## Limitations

- The live model only runs while someone has the Colab notebook open, and its link changes on every restart.
- A conversation lives on the model server, so if Colab restarts mid-conversation it can't be resumed: start a new one.
- Learner messages show as typed: no pinyin or English for them until the model provides it.
- Reports, settings and preferences live in this browser only; private windows may not keep them.
- "Delete reports" reloads the page, because `store.js` keeps reports in memory and has no delete call of its own.
- Voice input uses the browser's speech recognition, not Whisper (see below). Spoken replies are a later phase.
- Only the café has been evaluated (prompts v6, `results/VERSIONS.md` in the team repo). The shop, restaurant, job interview and open conversation prompts are new and unscored: run `python -m convo.evaluation conversation --scenario <id>` on Colab and have someone review the transcripts before relying on them. The correction test set is café sentences only.
- Setup (onboarding) still describes the café: its level check, goals preview and display preview use café lines.

## Voice input

The mic button in the reply box (`js/speech.js`) turns Mandarin speech into text in the box. The learner checks or edits it and then sends it; nothing is sent by voice alone. While it listens, the button is pressed (Vast), a "Listening" line shows under the box, and the barista switches to listening. Typing, sending or leaving the screen stops it.

It uses the speech recognition built into the browser (Web Speech API, `zh-CN`), so it works for every visitor with nothing to install, but it depends on their browser:

| Browser | Voice input |
| ------- | ----------- |
| Chrome, Edge (desktop and Android) | Works. Audio goes to Google's or Microsoft's speech service. On Android it stops after each pause; tap again to add more. |
| Safari (macOS, iOS 14.5+), any browser on iPhone | Works, through Apple's speech service. |
| Firefox | No speech recognition, so the mic button isn't shown. |
| Opera, Brave | They have the API but no speech service: it would say "listening" and never hear anything. Tapping the mic says so and suggests Chrome, Edge or Safari. Any other browser that starts and never hears is stopped after 5 seconds with the same message (20 seconds while it may still be asking for microphone permission). |

- It needs https (or localhost) and a microphone permission the first time.
- Audio leaves the device for the browser maker's service. Nothing goes to Convo's model except the text the learner sends.
- It's not Whisper, which CLAUDE.md names for Phase 2. Whisper needs a server: it could run next to the model on Colab, with a recorder in the browser. Any engine that keeps `createDictation`'s shape in `js/speech.js` can replace this one.
- On Windows, the OS's own voice typing (Win + H) also works in the reply box, like any text field: switch the Windows keyboard to Chinese (Win + Space) first, or it types pinyin as English words. The composer shows this tip under the box on Windows. It's independent of the mic button and works in every browser, Firefox included.
- Transcription isn't pronunciation assessment. The recogniser guesses the most likely words, so a wrong tone can come out as the right character.

## Coins and the shop

`js/wallet.js` keeps coins, owned items and what the mascot wears in this browser's localStorage
(`convo-app-wallet`; "Clear my data" in settings empties it). A finished conversation pays once per
report: 10 coins if you said at least 3 things, plus 5 per goal reached. `js/shop.js` is the `#/shop`
page: try items on the mascot, buy them, wear or take them off. Prices are in `wallet.js`; the items
themselves are in `mascot/cosmetics.js`. Every mascot in the app wears what you've equipped. Coins are
not synced anywhere, so they're per browser and can be cleared by the browser.
