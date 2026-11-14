# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML/CSS/JS for the landing page, served locally (no build step, no dependencies). The conversation app itself is not built yet.

## Users

- Students learning Mandarin who can read a little but freeze in real conversation.
- Tourists preparing for a trip to a Mandarin-speaking place who need survival phrases that actually work at a counter.
- Immigrants who need practical, everyday spoken Mandarin.

All are at A1–A2 level. Their job: be able to hold a short, real exchange (ordering, answering a follow-up question, coping with a surprise) without switching to English or pointing.

## Product Purpose

Convo AI builds conversational fluency through realistic text conversations with AI characters, instead of vocabulary memorisation or repetitive drills. Core principle: learn by having conversations, not memorising language.

Success: a learner finishes a café conversation, understands what they got wrong, and does better the next time.

## Positioning

The AI is a café employee, not a tutor. It stays in character, responds dynamically (no scripts), asks follow-ups, throws in occasional unexpected situations (e.g. an item is sold out), and absorbs grammar mistakes without breaking the conversation. Corrections are held back until the conversation ends, then delivered as a personalised report: original sentence, corrected sentence, Pinyin, English, an explanation, and recurring weaknesses. Grammatically valid sentences are not "corrected".

## Operating Context

- One scenario at MVP: ordering at a Chinese café.
- Learner chooses proficiency (A1/A2), display preference (Chinese, Pinyin, English, or a combination), and difficulty (Easy, Standard, Challenging).
- Simplified Chinese script.
- Text conversation first; speech recognition (Whisper) and Mandarin TTS are planned later phases.

## Capabilities and Constraints

- Model: Qwen2.5-3B-Instruct, integrated modularly. Never claim accuracy the model has not demonstrated in testing.
- Evaluation targets in CLAUDE.md are goals, not results. Do not present them as achieved.
- Do not introduce other languages. The landing page may say, in one quiet line, that more scenarios and voice are coming, without naming specific languages or dates.
- Primary action: start the café conversation ("Try the café demo"). The app is not live yet, so the localhost CTA points to a placeholder.

## Brand Commitments

- Name: Convo AI ("Convo" in short form). Wordmark: "Convo" in violet with a four-point sparkle; tagline "Learn. Speak. Connect."
- Mascot: Convo's yellow character (rounded yellow body, antenna with a ball, cream face visor, glossy black eyes, purple expression marks). The user supplied a pose sheet (general poses, emotions, actions, interactions). It is the brand character on every surface.
- Palette (user-pinned): follow Wispr Flow's colour scheme: lumen #FFFFEB ground, vast #1A1A1A ink, dawn #F0D7FF lavender, fathom #034F46 deep green, with glow #FFA946, flare #FF6C4C, signal #FFBCF2, pulse #7F1C34 as accents.
- The café is product content (the first scenario), not the visual theme: the user asked not to base the look on the café.
- Voice: plain, conversational, encouraging without hype.
- Craft-bar reference the user named: wisprflow.ai. The user took the familiar path alongside it: its structure and palette are the commitment, executed at full fidelity, without copying its copy, logos, or imagery.

## Evidence on Hand

None. No testimonials, user counts, press, or evaluation results exist. Do not fabricate any. The page proves the product by demonstration: a sample café conversation and a sample feedback report, labelled as samples.

## Product Principles

1. Conversation first: the exchange is the lesson; everything else supports it.
2. Stay in the scene: the character never breaks to lecture mid-conversation.
3. Correct what matters: only real errors and genuinely more natural phrasings get flagged.
4. Show every layer on request: Chinese, Pinyin, and English are the learner's choice, never forced.
5. Honest about the model: limitations are documented, not hidden.

## Accessibility & Inclusion

Chinese characters must be large and legible; Pinyin and translations must be readable at small sizes with sufficient contrast. Full keyboard support and reduced-motion support on all interactive demos.
