# CLAUDE.md — Convo AI

## 1. Project Overview

Convo AI is an AI-powered language-learning platform that develops conversational fluency through realistic, interactive conversations with AI characters.

Instead of memorising vocabulary or completing repetitive exercises, users learn by communicating in realistic situations.

> **Core principle:** Learn by having conversations, not memorising language.

## 2. MVP Scope

Start with a narrowly focused MVP.

| Component   | Specification          |
| ----------- | ---------------------- |
| Language    | Mandarin Chinese       |
| Script      | Simplified Chinese     |
| Level       | A1–A2                  |
| Scenario    | Ordering at a café     |
| Interaction | Text initially         |
| AI model    | Qwen2.5-3B-Instruct    |

**Target users:**

- Students learning Mandarin.
- Tourists preparing to travel.
- Immigrants learning practical communication.

Do not introduce additional languages or scenarios until the MVP is validated.

## 3. Core Features

### A. Personalisation

Allow users to select:

- **Proficiency:** A1 or A2.
- **Display preference:** Chinese, Pinyin, English translations, or a combination.
- **Conversation difficulty:** Easy, Standard, or Challenging.

### B. Scenario Selection

Initially, provide one scenario: **Ordering at a Chinese café**.

The user interacts with an AI character playing a café employee.

### C. AI Conversations

The AI should:

- Respond naturally to user messages.
- Ask relevant follow-up questions.
- Maintain conversation context.
- Adapt vocabulary and complexity to the user's level.
- Introduce occasional unexpected situations.
- Remain in character.
- Handle grammatical mistakes without breaking the conversation.

Conversations must be dynamic, not predetermined scripts.

### D. Post-Conversation Feedback

After each conversation, generate a personalised report containing:

- Overall conversational assessment.
- Grammar corrections.
- Vocabulary improvements.
- More natural expressions.
- Explanations of mistakes.
- Recurring weaknesses.
- Suggested improvements.

Include the original sentence, corrected sentence, Pinyin, and English translation where relevant.

Avoid unnecessary corrections of grammatically valid sentences.

## 4. Technical Architecture

### AI Model

Use **Qwen2.5-3B-Instruct** as the initial model.

The model handles:

- Character simulation.
- Dynamic conversations.
- Difficulty adaptation.
- Grammar correction.
- Feedback generation.

Keep the model integration modular so alternative models can be tested without rewriting the application.

### Main Components

**Frontend**

- Onboarding.
- Scenario selection.
- Conversation interface.
- Learning report.

**Backend**

- Conversation management.
- AI model integration.
- Prompt construction.
- Conversation history.
- Feedback generation.

**AI Layer**

- Character system prompt.
- Learner proficiency context.
- Conversation history.
- Feedback instructions.

## 5. Development Phases

### Phase 1 — Text Conversation

Build:

- Basic application interface.
- User onboarding.
- Café scenario.
- AI character.
- Dynamic text conversations.
- Context retention.
- Post-conversation feedback.
- Evaluation framework.

**Goal:** A complete, functional text-based language-learning experience.

### Phase 2 — Speech Recognition

Integrate Whisper.

Build:

- Microphone input.
- Audio recording.
- Mandarin speech transcription.
- Display of recognised text.
- Ability to edit transcription.
- Integration with the conversation engine.

> **Note:** Speech transcription accuracy is not equivalent to pronunciation assessment.

### Phase 3 — Text-to-Speech

Integrate a Mandarin TTS solution.

Build:

- Spoken AI responses.
- Natural Mandarin pronunciation.
- Audio playback and replay.
- Synchronisation between text and speech.

## 6. Evaluation Framework

Build a reproducible test dataset of 30–50 Mandarin learner sentences containing known mistakes.

**Include:**

- Incorrect word order.
- Incorrect measure words.
- Missing particles.
- Incorrect vocabulary.
- Incorrect question structures.
- Grammatically correct but unnatural expressions.
- Correct sentences that should not be corrected.

**Each test case should contain:**

- Original sentence.
- Intended meaning.
- Error category.
- Expected correction.
- Explanation.

### Evaluation Metrics

| Metric                | Initial Target |
| --------------------- | -------------- |
| Correction accuracy   | ≥ 85%          |
| False correction rate | ≤ 10%          |
| Character consistency | ≥ 90%          |
| Context retention     | ≥ 90%          |
| Explanation accuracy  | ≥ 80%          |

Also test complete conversations to evaluate naturalness, context retention, and difficulty adaptation.

Record results for every model or prompt revision. Use human review to validate subjective metrics.

These targets are goals, not assumed model capabilities.

## 7. AI Behaviour

The AI's primary role is a **café employee, not a language tutor**.

Its system prompt must define:

- Character identity.
- Café scenario.
- Mandarin language.
- A1–A2 proficiency.
- Vocabulary complexity.
- Correction behaviour.
- Conversational objectives.

The AI should prioritise natural conversation while subtly modelling correct Mandarin.

Use structured outputs where appropriate to separate:

- Character response.
- Translation.
- Corrections.
- Conversation state.

Validate generated outputs before displaying them.

## 8. Design Direction

Create a modern, minimal, and sophisticated interface.

Prioritise:

- Clear visual hierarchy.
- Simple navigation.
- Readable Chinese characters.
- Optional Pinyin and translations.
- Clean conversation interface.
- Easy-to-understand feedback reports.

Keep the conversation as the primary focus.

### Brand

**Convo is yellow.** Yellow is the brand's signature colour, carried by the mascot and by primary actions.

| Token        | Hex       | Use                                              |
| ------------ | --------- | ------------------------------------------------ |
| Convo yellow | `#FFD83D` | Mascot, primary buttons, brand mark              |
| Yellow shade | `#E9B10C` | Mascot shading, pressed states                   |
| Lumen        | `#FFFFEB` | Page background                                  |
| Vast         | `#1A1A1A` | Text and ink                                     |
| Dawn         | `#F0D7FF` | Lavender panels (conversation stage, reports)    |
| Fathom       | `#034F46` | Deep green sections                              |
| Pulse        | `#7F1C34` | Mistake text in feedback                         |
| Flare        | `#FF6C4C` | Mistake underlines and marks (not for text)      |

- The neutrals and accents follow Wispr Flow's colour scheme; yellow is Convo's own.
- **Mascot:** Convo's yellow character (rounded body, antenna with a ball, cream face, glossy black eyes, purple expression marks). Use it as the brand character across the product.
- **Mascot motion:** no constant bobbing, floating or jitter. Each state may animate expressively (waving, typing, talking, sparkles, confetti), and the state should change in response to something that happened (a reply, a surprise, the end of a conversation). Respect reduced motion. The shared engine is `mascot/convo-mascot.js`.
- **Visual theme:** do not theme the interface around the café. The café is the first scenario, not the look of the product.

## 9. Development Instructions

Act as a senior full-stack and AI engineer.

### Before implementing

- Inspect the existing repository.
- Understand its architecture and framework.
- Identify the required components.
- Establish a clear implementation plan.

### Throughout development

- Write modular, maintainable code.
- Avoid unnecessary dependencies.
- Test functionality as it is implemented.
- Do not hardcode conversations.
- Do not assume the model is accurate without testing.
- Do not silently substitute AI models.
- Document important limitations.
