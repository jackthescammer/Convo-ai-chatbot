# Convo AI

An AI-powered language-learning platform where users develop conversational fluency through realistic, interactive conversations with AI characters.

Instead of memorising vocabulary, completing repetitive exercises or practising scripted dialogues, users learn by actually using the language in realistic situations.

## The problem

Traditional language-learning platforms often focus on:

* Vocabulary memorisation.
* Grammar exercises.
* Multiple-choice questions.
* Scripted conversations.

However, knowing vocabulary doesn't necessarily mean someone can hold a conversation.

## How it works

### 1. Personalise your experience

Users select:

* Chinese
* One proficiency level: Beginner, Intermediate, Advanced
* Their learning preferences.
* Their desired conversation difficulty.

### 2. Choose a scenario

Users select from a range of realistic situations, such as:

* Ordering food at a restaurant.
* Navigating a foreign city.
* Meeting someone for the first time.
* Attending a job interview.
* Shopping at a local market.
* Having casual conversations with native speakers.

### 3. Engage in AI-powered conversations

An AI character assumes the role of another person and engages the user in a dynamic conversation.

Unlike traditional scripted exercises, the AI:

* Responds naturally to the user's answers.
* Asks relevant follow-up questions.
* Adapts its vocabulary and sentence complexity.
* Maintains context throughout the conversation.
* Introduces unexpected situations to challenge the learner.

Users can communicate through voice or text, allowing them to practise at their own pace.

### 4. Receive personalised feedback and grade

After each conversation, Convo analyses the interaction and provides:

* Grammar corrections.
* Vocabulary improvements.
* More natural expressions.
* Identification of recurring mistakes.
* Pronunciation feedback where supported.
* An overall assessment of conversational performance.

Rather than simply identifying errors, the AI explains why something was incorrect and demonstrates how a fluent speaker might express the same idea.

## The vision

The final product is the full platform described above: many scenarios, voice and text, personalised feedback and grading, for learners of many languages.

## What we built this weekend (the first slice)

The hackathon version is a small, tested first step toward that platform. It is not the full platform.

* **Language and scenario:** Chinese, ordering at a cafe.
* **User:** an immigrant at A2 level who needs everyday Chinese to get by in daily life. (Students and tourists are future users.)
* **Model:** Qwen 2.5 3B Instruct.
* **How we test it:** 30-50 learner sentences with known mistakes. We score how often Convo corrects them properly and stays in character, and compare against a simple baseline.

## Roadmap

* **Phase 1 (this weekend):** text conversation with a small Qwen model, test set, baseline scores.
* **Phase 2:** add Whisper for speech input.
* **Phase 3:** TTS for spoken replies.
* **After that:** more scenarios and levels, personalisation, grades and pronunciation feedback.
