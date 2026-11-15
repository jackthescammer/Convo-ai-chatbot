# Convo AI: a Mandarin conversation partner for beginners

**Track:** AI + Languages · **Team:** Nelson, Ethan and Ferrell
**Try it:** [tryconvo.vercel.app](https://tryconvo.vercel.app) (the live chat works while our model is running) · **Demo video:** TODO
**Current version:** prompts v12. The mistake checker was scored at v6 (Results); v7 to v12 added scenarios and live-feedback features without changing the checker.

> **Main takeaway:** a free, small AI model (Qwen 2.5 3B) can start to coach beginner Chinese, but it isn't reliable yet. On 32 sentences it had never seen, our best checker fixed 7/21 mistakes correctly (first version: 3/21) and wrongly changed 2/11 correct sentences (first version: 6/11); a baseline that never corrects fixes 0. Showing the model examples worked far better than giving it rules.

## The problem
Many immigrants learn Chinese vocabulary and grammar but freeze in real conversations, like ordering at a café. Apps built on memorisation and scripted dialogues don't give them practice at responding to a real person. An example stakeholder would be an A2 learner who just moved to a Chinese-speaking city.

## What we built
Convo is a website where you practise a real situation by chatting with an AI character: ordering at a café (our main, tested scenario), shopping, a restaurant, a job interview or an open chat. You type in Chinese characters or pinyin (or use the mic), and after each reply Convo checks your message. For example, on the live model (v12):

> **Barista:** 欢迎光临，请问需要些什么吗？
> **You:** wo yeao yir ge bing cha
> **Live feedback:** Spelling: ~~yeao~~ → yao 要 ("can only be read as ye + ao"), ~~yir~~ → yi 一 ("only 'er' ends in r"). We read it as 我要一个冰茶. Measure words: 一个 → 一杯. Tones: you left out the tone marks. **Try saying:** 我要一杯冰茶。 wǒ yào yī bēi bīng chá, "I would like a cup of iced tea."

If the message is right, it just says **Good job!** If you don't answer the question, go off-topic or reply in English, you get a **Stay in the conversation** warning and the character asks again. At the end, a report goes through every sentence, and a Progress page charts your mistakes over time.

## What we added
Our own idea (4.4.4, a conversation practice partner), not a suggested project.
- **Our own user:** an A2-level immigrant practising everyday situations.
- **Our own data:** 42 café sentences a learner might say, 28 with a common beginner mistake and 14 already correct. We wrote them with help from Claude; Nelson and Ferrell checked every one. Full list: [DATA.md](DATA.md).
- **Our own question:** how do you get a small model to correct beginners well: with rules, with examples, or with a second check?
- **Help for learners without a Chinese keyboard:** pinyin is read as characters, with tone, spelling and English-detection help that is rule-based (not the model).

## How it works
- **Model:** Qwen 2.5 3B Instruct, open source, on a free Google Colab GPU. One prompt plays the character; a separate checker reviews each learner sentence.
- **Data:** our 42 sentences: 10 to improve the checker ("tune"), 32 kept unseen for the final score ("test"). Every checker change was chosen using the tune sentences only.
- **Baseline:** a checker that never corrects anything.
- **Our improvement (v1 to v6):** a written rule (v2) changed nothing. Worked examples stopped the over-correcting (v3) but made the model too cautious, and examples of real mistakes (v4) brought the over-correcting back. Splitting "is it wrong?" from "how do I fix it?" worked once a second check compared the original and the fix side by side (v6).
- **Live feedback (v7 to v12):** the same v6 checker runs after every message. Around it: English explanations; pinyin read as characters (Pinyin2Hanzi); tone checks (pypinyin); spelling suggestions from a syllable list; an English detector; and a turn check that tells the character when the learner didn't answer or went off-topic.

## Results

**Final score: the v6 checker on 32 unseen café sentences (21 with a mistake, 11 correct)**

| Test sentences | Mistakes caught | Fixed correctly | Correct sentences wrongly "fixed" |
|---|---|---|---|
| Baseline (never corrects) | 0/21 | 0/21 | 0/11 |
| v1: first prompt (run once early, by mistake) | 19/21 | 3/21 (14%) | 6/11 (55%) |
| **v6: final** | **15/21** | **7/21 (33%)** | **2/11 (18%)** |

v6 fixes more than twice as many mistakes correctly as v1 and over-corrects far less, but lets more mistakes through. Best on measure words (3/3 fixed), worst on question structure, negation and missing particles (0 fixed). On the 10 tune sentences v6 caught 7/7 and fixed 6/7, so the improvements only partly carried over to new sentences. We never used test results to choose a change.

**Every version** (details: [VERSIONS.md](results/VERSIONS.md); analysis: [DATA.md](DATA.md#data-analysis); live tests: [LIVE_FEEDBACK_CHECKS.md](results/LIVE_FEEDBACK_CHECKS.md))

| Version | What changed | How we tested it | Result |
|---|---|---|---|
| v1 | First checker prompt | 10 tune sentences | 6/7 caught, 4/7 fixed, 2/3 correct ones wrongly "fixed" |
| v2 | Stronger written rule: don't change correct sentences | tune | no change: 6/7, 4/7, 2/3 |
| v3 | Examples of correct sentences left alone | tune | 5/7, 4/7, **0/3** (too cautious) |
| v4 | Examples of real mistakes | tune | 7/7, 6/7, 2/3 (over-correcting back) |
| v5 | Second check: "is the original already correct?" | tune | 4/7, 3/7, 1/3 (said "fine" too easily) |
| **v6** | Second check compares original and fix side by side | tune, then the 32 test sentences once | tune 7/7, 6/7, 1/3; **test 15/21, 7/21, 2/11** |
| v7 | Shop, restaurant, job interview and open chat (café prompts unchanged) | not evaluated | |
| v8 | More realistic China settings for those (real dishes, yuan, scan-or-cash) | not evaluated | |
| v9 | Restaurant server opened with a customer's line (请问有空位吗？); fixed | 5 live openers | 5/5 opened with 您好，(请问)几位？ |
| v10 | Turn check: didn't answer / off-topic / not appropriate | 3 live chats | detection 3/3; character re-asked after "ni hao" but followed the off-topic message |
| v11 | Steer-back instruction moved into the character's prompt, firmer | 3 live chats | all 3 right: re-asked, steered back from football to drinks, normal order fine |
| v12 | English detector (English was being "corrected" as pinyin) | 6 live checks | detection 6/6; character replied in Chinese but didn't fully steer back |

v1 to v6 are scored; v7 to v12 are backed by spot checks on the live model and our own testing ([TEAM_TESTS.md](results/TEAM_TESTS.md)), not a scored test.

**Where it fails**

| Learner wrote (unseen) | Convo's fix | Correct answer | |
|---|---|---|---|
| 我们两个人要一桌子。 | 我们两个人要一张桌子。 | 我们两个人要一张桌子。 | ✅ measure word |
| 我昨天不喝咖啡。 | (no change) | 我昨天没喝咖啡。 | ❌ missed 不 vs 没 |
| 我不会说中文很好。 | 我不會說中文很好。 | 我中文说得不好。 | ❌ switched to traditional characters, mistake kept |
| 谢谢，咖啡来得很快。 (already correct) | 谢谢，咖啡快来了。 | (no change) | ❌ changed a correct sentence's meaning |

- 5 of the 6 mistakes the checker missed were spotted by its first check, then wrongly undone by the second check.
- Explanations sometimes come out in Chinese; the live app asks the model for an English version, but the end-of-chat report doesn't yet.
- In our own testing the character doesn't always keep the conversation going: after 我想要一杯冰茶。 it only confirmed (好的，来一杯冰茶。) without asking anything next, so a beginner has to lead.
- The turn check and English detector were tried on only a handful of messages, and the character's reply to English didn't fully steer back.
- Only the café is evaluated; the quiz is small (10 tune, 32 test), so one sentence moves a score a lot; and the live chat only works while our model runs in Colab.

## What we'd do next
1. Make the second check less eager to undo real corrections, and give English explanations in the report too.
2. Make the character always end with a short follow-up question (sugar, ice, size, anything else, paying).
3. Evaluate the other scenarios, and test the turn check and English detector on many more messages.
4. Test with real A2 learners and find out whether the feedback actually helps them.

## Sources
- Our own 42 test sentences: [data/test_cases.csv](data/test_cases.csv)
- Qwen 2.5 3B Instruct: https://huggingface.co/Qwen/Qwen2.5-3B-Instruct
- Hugging Face Transformers: https://huggingface.co/docs/transformers
- Gradio (the model's app and API): https://www.gradio.app
- pypinyin (pinyin display and tone checks): https://github.com/mozillazg/python-pinyin
- Pinyin2Hanzi (reading typed pinyin as characters): https://github.com/letiantian/Pinyin2Hanzi
- Google Colab (free GPU for the model): https://colab.research.google.com
- ngrok (a fixed web address for the model running in Colab): https://ngrok.com
- Vercel (website hosting): https://vercel.com
- ElevenLabs (the characters' spoken voices, with the browser's own voice as a fallback): https://elevenlabs.io
- Web Speech API (the website's mic button turns speech into text in the browser): https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
- AI tools: Claude (Anthropic), used a lot: for planning, writing and fixing code, drafting the test sentences (then checked by Nelson and Ferrell), the website, and the analysis. We tested every feature on the live model ourselves.
