---
version: 1
slug: "app-index-html"
primary_target: "app/index.html"
related_targets: ["app/js/onboarding.js","app/js/main.js","app/css/app.css"]
---

# App onboarding (app/index.html)

Mode: Operate. Audience: A1–A2 Mandarin learners arriving from the landing page (students, travellers, immigrants). Job: tell Convo why they're learning, their level, what to show and how hard to push, in about a minute, then reach the café conversation. Constraints: Mandarin only; no accounts, answers stay on the device. Hand-off agreed with the session building the app: setup ends at /app/home.html#/talk, and an onboarded visitor opening /app/ without a step goes to /app/home.html. Files: this surface owns app/index.html, app/js/main.js, app/js/onboarding.js, app/css/app.css; the app owns app/home.html and its own scripts. Scope agreed with the user: adapt Duolingo's flow to Convo (drop the language picker, the attribution survey, the daily goal and the notification prompt); onboarding only.

## Direction contract

THESIS: Setup is a conversation with Convo, not a form. The mascot asks one question per screen in its own speech bubble, answers your last choice in the next bubble, and shows the real conversation surface changing as you choose. Refuses the settings-form default (one long page of dropdowns) and refuses a reskin of Duolingo's green 3D buttons.

OWN-WORLD: Convo's established world from DESIGN.md: Lumen ground; Paper White option rows on hairlines that turn Vast with a yellow icon disc when chosen; Convo's white speech bubble with the speaker corner tightened; Dawn preview stages reusing the conversation bubbles; a Vast progress fill; the yellow pill Continue. Figtree throughout; EB Garamond for the welcome headline and the one principle statement. The principle sits on a Fathom panel, its single use in the flow.

STORY: The learner meets Convo, says why and how much they know, sees how replies will look and how hard Convo will push, learns that corrections wait for the report, and starts the café conversation.

FIRST VIEWPORT: Welcome: brand top left; centred 200px waving mascot, EB Garamond "Learn Mandarin by talking." near 4.5rem, one-line sub, yellow "Get started" with "Skip setup" beside it. Question steps: top bar with back arrow and full-width progress; a 38rem column (60rem on preview steps) with a 104px mascot left of the bubble (reaction line, then the 1.5rem question); options below; a sticky footer with hairline top and Continue at the column's right edge, full width on phones.

FORM: Duolingo's onboarding sequence adapted for the web. seed: none (pinned) "here is the onboarding flow for duolingo, make sure this fits a web app and works", with the confirmed answer "Adapt to Convo (Recommended)". Signature interaction: the next bubble answers what you picked, and the preview re-renders live as you toggle 汉字/Pinyin/English or change difficulty; number keys pick, Enter continues, browser Back walks the steps.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Adaptations

- Fixed-width top and Continue bars (60rem) on every step, so controls never move between steps (finish review).
- Goals step shows the goals as learner bubbles in a Dawn preview beside the Fathom principle, which comes first on phones (finish review).

## Unresolved

- Tokens are duplicated from landing/styles.css into app/css/app.css; a shared base stylesheet would remove the copy.
