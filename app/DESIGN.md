---
name: Convo AI
description: Learn Mandarin by talking, not memorising.
colors:
  convo-yellow: "#FFD83D"
  convo-yellow-hover: "#FFCE14"
  convo-yellow-shade: "#E9B10C"
  lumen: "#FFFFEB"
  lumen-dark: "#E4E4D0"
  paper-white: "#FFFFFF"
  vast: "#1A1A1A"
  ink-muted: "rgba(26, 26, 26, 0.72)"
  hairline: "rgba(26, 26, 26, 0.15)"
  dawn: "#F0D7FF"
  fathom: "#034F46"
  fathom-deep: "#023A33"
  pulse: "#7F1C34"
  flare: "#FF6C4C"
  success: "#CEF5CA"
  success-dark: "#114E0B"
  grammar-tint: "#FFE3DC"
  natural-ink: "#4A2A6B"
  surprise-tint: "#FFE9CC"
  surprise-ink: "#6B3A00"
typography:
  display:
    fontFamily: "EB Garamond, Georgia, serif"
    fontSize: "clamp(3.25rem, 7.4vw, 6.25rem)"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "EB Garamond, Georgia, serif"
    fontSize: "clamp(2.5rem, 5.4vw, 4.375rem)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.025em"
  title:
    fontFamily: "EB Garamond, Georgia, serif"
    fontSize: "clamp(1.875rem, 2.6vw, 2.25rem)"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "-0.015em"
  panel-title:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.6
  hanzi-display:
    fontFamily: "Noto Serif SC, Songti SC, SimSun, serif"
    fontSize: "0.92em"
    fontWeight: 400
    lineHeight: 1
  hanzi:
    fontFamily: "Noto Sans SC, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "1.3125rem"
    fontWeight: 500
    lineHeight: 1.45
  pinyin:
    fontFamily: "Noto Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: "0.75rem"
  md: "1.125rem"
  bubble: "1.375rem"
  lg: "1.75rem"
  xl: "2.5rem"
  pill: "999px"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2.5rem"
  gutter: "clamp(1rem, 4vw, 2.5rem)"
  section: "clamp(4.5rem, 9vw, 8rem)"
components:
  button-primary:
    backgroundColor: "{colors.convo-yellow}"
    textColor: "{colors.vast}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 1.75rem"
    height: "3.25rem"
  button-primary-hover:
    backgroundColor: "{colors.convo-yellow-hover}"
  button-primary-active:
    backgroundColor: "{colors.convo-yellow-shade}"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.pill}"
    padding: "0 1rem"
    height: "2.5rem"
  chip-pressed:
    backgroundColor: "{colors.vast}"
    textColor: "{colors.lumen}"
  stage-panel:
    backgroundColor: "{colors.dawn}"
    rounded: "{rounded.xl}"
    padding: "clamp(1rem, 2.4vw, 1.75rem)"
  surface-panel:
    backgroundColor: "{colors.lumen}"
    rounded: "{rounded.lg}"
    padding: "clamp(1rem, 2vw, 1.5rem)"
  bubble-convo:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.vast}"
    rounded: "{rounded.bubble}"
    padding: "0.75rem 1.125rem"
  bubble-learner:
    backgroundColor: "{colors.vast}"
    textColor: "{colors.lumen}"
    rounded: "{rounded.bubble}"
    padding: "0.75rem 1.125rem"
  tag-grammar:
    backgroundColor: "{colors.grammar-tint}"
    textColor: "{colors.pulse}"
    rounded: "{rounded.pill}"
    padding: "0.125rem 0.625rem"
  tag-natural:
    backgroundColor: "{colors.dawn}"
    textColor: "{colors.natural-ink}"
    rounded: "{rounded.pill}"
    padding: "0.125rem 0.625rem"
  tag-left-alone:
    backgroundColor: "{colors.success}"
    textColor: "{colors.success-dark}"
    rounded: "{rounded.pill}"
    padding: "0.125rem 0.625rem"
---

# Design System: Convo AI

## Overview

**Creative North Star: "The Patient Friend"**

Convo should feel like talking to a friend who happens to speak Mandarin: warm, sunny and never lecturing. Yellow brings the energy and belongs to Convo alone, carried by the mascot and every primary action. Around it, Wispr Flow's palette keeps things calm: a cream-yellow Lumen ground, Vast ink, lavender Dawn panels where conversations and reports live, and one deep Fathom green for statements of principle.

The conversation is always the focus. Chinese characters are set large and plainly, with pinyin above and English below as optional layers the learner switches on or off. Mistakes are handled kindly: nothing interrupts the exchange, and corrections arrive afterwards in a report that shows what was said, what's better, and why. Correct sentences are visibly left alone.

Headlines are set in EB Garamond, as on Wispr Flow, always upright; everything else stays in Figtree.

Surfaces are flat and soft: big rounded panels, pill controls, no shadows. Motion belongs to the mascot and to things that just happened (a message arriving, a note being saved), never to decoration. The one standing exception is the hero's flow ribbon, which moves continuously, pauses on request and holds still under reduced motion.

**Key Characteristics:**
- One brand colour, Convo yellow, reserved for the mascot, primary buttons and the brand mark.
- Lavender Dawn panels hold conversation and feedback; Fathom green appears once per page at most.
- Every Chinese line can show 汉字, pinyin and English, each switchable.
- Upright EB Garamond headlines; Figtree for everything you read or use.
- Flat, rounded, shadowless surfaces; depth comes from tonal layering.
- The yellow mascot reacts to events and never idles.

## Colors

A cream-and-ink base from Wispr Flow's scheme, lifted by Convo's own yellow, with lavender and deep green as the two supporting fields.

### Primary
- **Convo Yellow** (#FFD83D): the brand. Primary buttons, the mascot, the brand mark, step markers and text selection. Hover deepens to Marigold Press (#FFCE14); pressed sinks to Yellow Shade (#E9B10C), which is also the mascot's shading and the underline colour of text links.

### Secondary
- **Dawn Lavender** (#F0D7FF): the conversation stage, the report section and closing panels. It is the field the yellow mascot stands on.
- **Fathom Green** (#034F46): one deep section per page for principles and trust statements, with Lumen text. Fathom Deep (#023A33) holds inset notes inside it.

### Tertiary
- **Pulse** (#7F1C34): the learner's mistaken sentence text in feedback, and grammar tag text.
- **Flare** (#FF6C4C): wavy underlines and strike-throughs that mark the mistake. Never used for text (contrast is too low).
- **Fathom Green** also marks the corrected sentence in feedback, so "wrong" and "better" read as pulse and fathom, and are labelled in words as well.
- **Left-alone Green** (#CEF5CA, text #114E0B): the tag for sentences that were correct.

### Neutral
- **Lumen** (#FFFFEB): the page ground and the inner surface of panels.
- **Lumen Dark** (#E4E4D0): quiet fills on Lumen.
- **Paper White** (#FFFFFF): Convo's chat bubbles, report notes and the levels card, so they sit just above Lumen.
- **Vast** (#1A1A1A): all text, the learner's chat bubbles, pressed chips and selected tabs.
- **Muted Ink** (Vast at 72%): secondary text, pinyin and English layers. On colour fields, tint from the field's own ink instead of grey.
- **Hairline** (Vast at 15%): dividers, list rules and outlines.

### Named Rules
**The Yellow Belongs To Convo Rule.** Yellow appears only on the mascot, the brand mark, primary actions and a few small markers. It never becomes a section background or a decorative wash.

**The Two Fields Rule.** Conversation and feedback sit on Dawn; principles sit on Fathom. A page uses Fathom at most once.

**The Red Is Never Text Rule.** Flare marks mistakes with lines; the mistaken words themselves are Pulse.

## Typography

**Display Font:** EB Garamond (with Georgia), regular only
**Body Font:** Figtree (with system-ui)
**Chinese:** Noto Sans SC (with PingFang SC, Microsoft YaHei); Noto Serif SC inside display headings
**Pinyin:** Noto Sans (with Segoe UI)

**Character:** Following Wispr Flow, a bookish old-style serif carries the headlines at regular weight with tight tracking, and a friendly geometric sans carries everything you read or use: body text, labels, controls and the product surfaces (chat, rail, report). Chinese is set in a standard Hei face so learners always see textbook-correct character forms; inside a serif headline it switches to the matching Song face so the line reads as one voice. Pinyin gets its own face because Figtree lacks the tone-marked vowels.

### Hierarchy
- **Display** (EB Garamond 400, clamp(3.25rem, 7.4vw, 6.25rem), line-height 0.95, tracking -0.03em): the hero headline only. It breaks after "talking," so its closing phrase sits on its own line.
- **Headline** (EB Garamond 400, clamp(2.5rem, 5.4vw, 4.375rem), line-height 1, tracking -0.025em): section headings, sentence case, ending in a full stop.
- **Title** (EB Garamond 400, clamp(1.875rem, 2.6vw, 2.25rem), line-height 1.05): step and principle headings.
- **Panel title** (Figtree 700, 1.5rem, line-height 1.2): headings inside product surfaces (report, rail), which stay in the product's sans.
- **Body** (400, 1.0625rem, line-height 1.6): running text, kept under 65ch; lead paragraphs step up to about 1.3rem.
- **Label** (600, 0.8125–0.9375rem): tags, toolbar titles, form labels. Sentence case, never all caps.
- **Hanzi** (500, 1.3125rem in bubbles, up to 2.375rem in feature lines, line-height 1.35–1.45): always the largest layer in a layered line.
- **Pinyin** (400, 0.875rem, Muted Ink): sits above the characters. When characters are hidden, pinyin grows to take their place.

### Named Rules
**The Layer Order Rule.** A layered line always reads pinyin, then 汉字, then English, top to bottom, and any layer can be switched off without breaking the line.

**The No Eyebrow Rule.** Headings carry themselves: no small labels above them. Tags sit beside headings, never on top.

**The Upright Rule.** No italics anywhere: headings, body, labels or product surfaces. Emphasis comes from size, weight and placement, never from slanting the type.

## Layout

Content sits in a centred 76rem container with a fluid gutter (1rem on phones, up to 2.5rem). Sections breathe with clamp(4.5rem, 9vw, 8rem) vertical padding, and coloured sections inset slightly from the viewport edge (0.5–1.25rem) so they read as large panels on the Lumen ground.

The hero is centred: headline, lead, then actions, then the full-bleed flow ribbon. The conversation stage follows, its mascot standing in the space under the rising ribbon (2rem above the stage on desktop, 4.5–5rem below 1040px where the cropped ribbon sits lower), with the conversation (about 60%) beside the notes rail (about 40%) at a matched fixed height. Copy-and-demo sections use a two-column split (about 45/55) that stacks below 1040px; three-item sequences use three columns that stack below 760px. On phones the nav keeps only the brand and the primary action, and every grid uses minmax(0, 1fr) columns so nothing overflows.

## Elevation & Depth

Convo is flat. There are no box shadows anywhere. Depth comes from tonal layering: Lumen page → Dawn stage → Lumen or Paper White surfaces → Vast or yellow controls. The only shadow-like element is the mascot's own soft contact shadow, drawn by the mascot engine.

### Named Rules
**The Flat Friend Rule.** Surfaces never float. If something needs to stand forward, give it a lighter or darker tone, not a shadow.

## Shapes

Soft and generous. Large panels use 2.5rem corners (the stage, report section, principles, close), inner panels 1.75rem, notes 1.125rem, chat bubbles 1.375rem with one corner tightened to 0.375rem on the speaker's side, and every control is a full pill. Dividers are 1px hairlines; the only heavier rule is the 2px Vast line that tops each step in a sequence.

## Components

### Buttons
Confident and simple.
- **Shape:** full pill (999px), 3.25rem tall (2.75rem in the nav).
- **Primary:** Convo Yellow with Vast text, 700 weight, 1.75rem side padding.
- **Hover / Active / Focus:** hover deepens to #FFCE14, press sinks to #E9B10C and nudges down 1px; focus shows a 3px Vast outline offset 3px (Lumen outline on Fathom).
- **Text link (secondary action):** Vast, 600 weight, 2px Yellow Shade underline offset 0.25em, which darkens to Vast on hover.

### Chips (layer toggles)
- **Style:** pills grouped in a pill tray (translucent Lumen on Dawn; white with hairline on Lumen).
- **State:** pressed chips are Vast with Lumen text; unpressed are transparent with Muted Ink. At least one layer always stays on; trying to switch off the last one shows a short Pulse hint instead.

### Tabs
Same pill language as chips, in a Lumen tray; the selected tab is Vast with Lumen text. Arrow keys, Home and End move between tabs.

### Cards / Containers
- **Corner Style:** 2.5rem for stage-scale panels, 1.75rem inside them.
- **Background:** Dawn for stages, Lumen or Paper White inside.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** 1px hairline only where a white surface sits on Lumen.
- **Internal Padding:** 1–1.75rem, fluid.

### Navigation
Sticky, solid Lumen, with a hairline that appears once the page scrolls. Brand mark (mini mascot) plus the "Convo" wordmark in Figtree 800, section links as soft pills that tint on hover, and the yellow primary action on the right. On phones only the brand and a shortened action remain.

### Conversation Stage (signature)
The product's core demo. A Dawn panel with a toolbar (title, layer chips, a round Vast play/pause/replay button), the conversation on Lumen, and the "Saved for your report" rail beside it. Convo's bubbles are Paper White on the left with a small "Convo, as the barista" label; the learner's are Vast on the right. Notes slide into the rail with a tag (Grammar, More natural, Handled a surprise, Left alone) and a struck-through Pulse "from" beside a Fathom "to". The mascot stands on the stage's top edge and changes state with the conversation: listening, thinking, chatting, talking, surprised, celebrate.

### Feedback Report (signature)
A Lumen document: title and a yellow "Sample" badge, an overall summary, then one block per sentence with a heading, a tag beside it, and rows for "You said" (Pulse, wavy Flare underline on the exact mistake), "Better" (Fathom, with pinyin and English) and "Why". Every report includes at least one "Left alone" example when the learner got something right.

### Flow Ribbon (signature)
After Wispr Flow's hero animation, between the hero actions and the stage. One SVG (viewBox 1600 × 400) runs full-bleed: English sentences in Figtree 600 at 30% Vast travel along a looping line into a Lumen pill with a 2px Vast outline, and come out as Mandarin (Noto Sans SC 500, Lumen) on a 50-unit Vast ribbon that rises to the right. The pill holds the mascot, which talks while the ribbon runs and nods as each sentence passes through. Each English sentence is paired with its Mandarin and both lines move at constant speeds in a fixed ratio, so a sentence and its Mandarin cross the pill together; extra space before each Mandarin sentence absorbs the length difference. A snapshot reads as one conversation that switches language at the pill. The pill is the pause button (a small Vast badge shows pause or play); the ribbon also stops off-screen and in hidden tabs, and reduced motion shows one still frame. The edges fade out over 4% of the width; on screens narrower than 58rem the canvas keeps that width and is cropped around the pill. Sentences are A1–A2 café lines that mirror the sample conversation; they live in `landing/app.js` (`FLOW_LINES`).

### Mascot
Rendered only through the shared engine `mascot/convo-mascot.js`. States animate expressively when shown (waves, typing, talking, sparkles), but there's no constant bobbing or jitter, state changes follow events, and reduced motion makes changes instant.

## Do's and Don'ts

### Do:
- **Do** keep Convo Yellow (#FFD83D) for the mascot, the brand mark and primary actions.
- **Do** show Chinese as layered lines (pinyin, 汉字, English) that respect the learner's layer toggles.
- **Do** mark mistakes with Pulse text plus a Flare line, and corrections with Fathom text, always labelled in words too.
- **Do** include a "Left alone" example wherever corrections are shown, so learners see that correct sentences aren't flagged.
- **Do** label demonstration content as a sample.
- **Do** drive mascot state changes from events (a reply, a surprise, the end of a conversation).

### Don't:
- **Don't** use box shadows or floating cards; layer tones instead.
- **Don't** put small labels or eyebrows above headings, or set labels in all caps.
- **Don't** set Flare (#FF6C4C) as text; its contrast on Lumen is too low.
- **Don't** let the mascot bob, float or jitter while idle.
- **Don't** theme screens around the café; it's the first scenario, not the look.
- **Don't** set pinyin in Figtree; it lacks the tone-marked vowels and breaks words into mixed fonts.
- **Don't** set body text, labels or product surfaces in EB Garamond.
- **Don't** use italics, including Wispr Flow's italic heading phrases.
