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
| `#/home` | `js/dashboard.js` | Greeting, the café conversation (start or resume), this week against your weekly goal and streak, latest report, patterns that keep coming up, practice totals, your setup with a display preview. Everything is worked out from reports on this device (`js/stats.js`); nothing is estimated. |
| `#/talk` | `js/talk.js` | The conversation: chat, the barista, and (when the model provides them) "Help me reply" phrases, goals and notes saved for the report. Leaving and coming back resumes it. |
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
| `convo-app-prefs` | `js/prefs.js` | name, weekly goal, Chinese text size, notes, help, Enter to send, calm mascot |
| `convo-model-url` | `js/model.js` | the live model link, if it was changed from the built-in one (or `placeholder`) |

`js/store.js` and `js/ui.js` are shared with setup; app-only preferences live in `js/prefs.js` so the two pages can change independently.

## The model

Everything the UI needs goes through `js/model.js`:

- `model.start({ settings })` returns the opening turn.
- `model.reply({ history, settings })` returns the next turn: reply (汉字, pinyin, English), and optionally mood, notes for the report, goals reached, suggested phrases, and whether the conversation ended.
- `model.report({ history, notes, settings })` returns the report.

The shapes are documented at the top of the file, and every response goes through `validateTurn` / `validateReport` before it's shown. Setup also imports `GOALS` from this file, so keep that export (ids `order`, `answer`, `surprise`, `pay`).

### The live model (default)

The conversation runs on the team's model: Qwen2.5-3B-Instruct with the v6 prompts, served by the Gradio app in [jackthescammer/Convo-ai-chatbot](https://github.com/jackthescammer/Convo-ai-chatbot) (`app.py` and `convo/`), started by hand on a Google Colab GPU with `share=True`. `gradioModel` in `js/model.js` calls its `/start`, `/send` and `/finish` endpoints:

- The server keeps the conversation under a `session_hash` that the client makes up on `start` and sends with every call. Only the newest learner message goes up on `send`.
- Replies come back as display text (`汉字`, `*pinyin*`, `> English`, from `convo/render.py`), and the report as Markdown (`Report.to_markdown` in `convo/review.py`). Code on the server writes both formats, not the model, so the client can parse them back into the shapes above. Fix titles such as "杯 → 个" come from comparing what was written with the correction.
- The name in the rail, the report and Settings › About is what the server's own footer says it runs (for example "Qwen2.5-3B-Instruct, prompts v6"), not an assumption.

**The link changes every time Colab restarts.** Update `DEFAULT_MODEL_URL` in `js/model.js`, or without editing code, paste the new `https://….gradio.live` link in Settings › About, or open the app once with `?model=<link>`. Settings › About also checks whether the link is up.

If the model can't be reached, the conversation shows "Can't reach the live model" with Try again. It never switches to the placeholder on its own.

What the live model doesn't send, the UI hides instead of guessing: goals (rail, report, report list), notes while you talk (its corrections all come in the report), "Help me reply" phrases, the barista's mood, and the end of the conversation (you end it). Its replies take about 3 seconds; the report checks every sentence one by one, so it takes longer.

### The placeholder

Open the app with `?model=placeholder` (or type `placeholder` in Settings › About) to click through the design without the model. Its barista lines follow a fixed order and ignore what the learner wrote, and its notes come from three hand-written pattern checks (`吗` after a question word, `是` before 很-adjectives, `个` with drinks). The conversation rail, the report and Settings › About all say so.

## Limitations

- The live model only runs while someone has the Colab notebook open, and its link changes on every restart.
- A conversation lives on the model server, so if Colab restarts mid-conversation it can't be resumed: start a new one.
- Learner messages show as typed: no pinyin or English for them until the model provides it.
- Reports, settings and preferences live in this browser only; private windows may not keep them.
- "Delete reports" reloads the page, because `store.js` keeps reports in memory and has no delete call of its own.
- Text only. Voice input and spoken replies are later phases.
