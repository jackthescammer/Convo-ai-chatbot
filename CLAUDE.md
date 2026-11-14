# Project context for Claude

Veritas AI International High School Hackathon 2026. Track: Languages. Project: Convo AI.
Team of 3 high school students in Australia, mostly beginners. Explain things simply, one step at a time.
Deadline: Sun Nov 15, 11:59 PM US Eastern (Mon Nov 16 afternoon in Australia). Submit a first version early, then resubmit.

## What we're building
`Convo-AI.md` is the pitch: the long-term vision is a full language-learning platform with many
scenarios, voice and text, and grading. That is NOT what we are building this weekend.

This weekend we build only Phase 1, a small tested slice:
- Language: Chinese. Scenario: ordering at a cafe. User: an immigrant at A2 level.
- An AI waiter (Qwen 2.5 3B Instruct, open-source, run in Google Colab on the free GPU) replies
  in character in Chinese and gently corrects the learner's mistakes, with a short explanation.
- No API keys: Gemini API keys don't work for us in Australia. Everything runs in Colab.

## How we test it (this is what judges score)
- Test set: 30-50 learner sentences we write ourselves, most with a known mistake, some correct.
  Each has the correct version and the mistake type. A Chinese speaker checks them.
- Use ~10 sentences to tune the prompt; keep the rest untouched for the final score (held-out test data).
- Baseline: a reply that always says "sounds good!" and never corrects (catches 0 mistakes).
- Report: mistakes caught, correct sentences wrongly "fixed", and how many corrections a Chinese
  speaker judged right. Show 2-3 failures side by side (model output vs correct) and explain why.

## Later phases (only if Phase 1 is finished and written up)
- Phase 2: Whisper (openai/whisper-small) for speech input. Record on a phone and upload audio files.
- Phase 3: TTS for spoken replies.

## Who owns what (don't edit another person's file without asking)
- README.md: Ethan (the write-up). Do not edit it unless he asks.
- The notebook: one person edits at a time, to avoid merge conflicts.
- Convo-AI.md: the pitch. Keep the vision vs. "what we built this weekend" split honest.

## Rules (from the hackathon brief)
- AI must do the main job. Cite every dataset, model, tutorial and AI tool (with links) in the README.
- Report honest results, including weak ones. Always show the baseline next to the model.
- Never claim features we didn't build. The full platform is the vision, not the demo.
- Use only our own writing and voices, or public data. No other people's messages or voices without permission.
- Every teammate must understand the whole project and be able to explain it to judges.
- If something won't load or run within ~30 minutes, switch approach instead of getting stuck.
- Keep it simple: no new libraries or features unless needed.

## Submission checklist
Public GitHub repo (jackthescammer/Convo-ai-chatbot), notebook saved WITH outputs visible,
README filled in (no TODOs left), credits listed, all links open in an incognito window.
