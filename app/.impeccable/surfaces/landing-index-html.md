---
version: 1
slug: "landing-index-html"
primary_target: "landing/index.html"
related_targets: []
---

# Landing page (landing/index.html)

Mode: Persuade. Audience: A1–A2 Mandarin learners (students, travellers, immigrants). Job: understand that Convo is an AI conversation partner, believe it helps without interrupting, and start the café demo. Proof: demonstration only (sample conversation and sample report, labelled as samples). No testimonials, stats, or logos exist; none may be invented. Constraint: the app is not live, so the CTA goes to a placeholder page.

## Direction contract

THESIS: One viewport proves the mechanism: a sample conversation plays where mistakes never stop the flow, they quietly collect for the report. Refuses the language-app default of a phone mockup beside a headline.

OWN-WORLD: Wispr Flow's palette, pinned by the user: lumen #FFFFEB ground, vast #1A1A1A ink, dawn #F0D7FF lavender for the stage and report, fathom #034F46 for one deep section and the close. Convo violet wordmark with sparkle. The yellow mascot is the only yellow. Figtree for Latin, Noto Sans SC for Chinese, pinyin as a smaller annotation layer. Large radii on stage-scale sections, pill controls, no card shadows.

STORY: The visitor sees Convo hold a real exchange, sees what the report gives back, learns it won't over-correct, and taps "Try the café demo".

FIRST VIEWPORT: Nav with the wordmark, four links and a dark pill CTA. Centred two-line H1 near 5.5rem, a one-sentence sub, then the primary CTA and a secondary link. Below that, a full-width dawn stage with the mascot peeking over its top edge on the right. The stage plays the conversation (about 60% of its width) beside a "Saved for your report" rail (about 40%). Its toolbar holds the 汉字 / Pinyin / English toggles and a pause button.

FORM: canon, the standing exit. The user took the familiar path alongside wisprflow.ai, with palette and mascot pinned: "can we js folow wispr flows colour scheme", "and the yellow mascot", "like dont base it on the cafe". seed:c0b3119d7bb72b9a. Signature interaction: the mascot reacts to the conversation (talks, startles at the sold-out item, celebrates at the end) while notes slide into the rail, and one display toggle drives every Chinese line on the page.

ADAPTATIONS (each cited):
- Primary actions are Convo yellow pills, not dark pills. Cause: the user said "make sure convo is yellow"; CLAUDE.md now records yellow as the brand colour.
- The hero mascot stands on the stage's top edge instead of peeking over it. Cause: the page adopted the shared engine mascot/convo-mascot.js (the user's yellow mascot, animated per state) so its event states read in full.
- The close sits on dawn, bookending the hero stage. Fathom stays for the principles section only, so deep green appears once.
- Pinyin is set in Noto Sans. Cause: Figtree and the Google slices of Noto Sans SC lack some tone-marked vowels (ǎ ǐ ǒ ǔ ē), which broke pinyin into mixed fonts; correct tone marks are product truth for learners.
- Headings are set in EB Garamond 400, upright only (the user asked to "get rid of italics"); Figtree stays for body, labels and product surfaces. Chinese inside a heading uses Noto Serif SC. Cause: the user asked to "edit the font to this" with a screenshot of Wispr Flow's hero ("Don't type,"), which is EB Garamond.
- A flow ribbon sits between the hero actions and the stage: English loops into the mascot pill and leaves as Mandarin on a Vast ribbon, sentence-synced, pausable from the pill, still under reduced motion. Cause: the user asked to "copy wispr flows animation here and relate it to english going into chinese". It is the one continuous motion on the page; the stage drops below the first viewport on short screens as a result.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- Mascot 3D renders: waiting on the user's pose-sheet file. Until then the mascot is an authored SVG of the same character.
