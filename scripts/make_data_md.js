// Builds DATA.md (judge-facing) from data/test_cases.csv so the two never disagree.
const fs = require("fs");
const [csvPath, outPath] = process.argv.slice(2);
function parse(text) {
  const rows = []; let row = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { f += '"'; i++; } else if (ch === '"') q = false; else f += ch; }
    else if (ch === '"') q = true;
    else if (ch === ",") { row.push(f); f = ""; }
    else if (ch === "\n") { row.push(f); rows.push(row); row = []; f = ""; }
    else if (ch !== "\r") f += ch;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}
const [head, ...data] = parse(fs.readFileSync(csvPath, "utf8")).filter(r => r.length > 1);
const recs = data.map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
const isMistake = r => !r.correct.split("|").map(s => s.trim()).includes(r.learner.trim());
const esc = s => s.replace(/\|/g, "\|");
const count = (xs, k) => xs.reduce((m, x) => (m[k(x)] = (m[k(x)] || 0) + 1, m), {});
const mist = recs.filter(isMistake), ok = recs.filter(r => !isMistake(r));
const bySplit = count(recs, r => r.split), byCat = count(mist, r => r.category);
const reviewed = recs.filter(r => r.reviewed_by.trim()).length;
const table = list => ["| ID | Split | Learner says | Right answer(s) | Type | Meaning | Why |", "|---|---|---|---|---|---|---|",
  ...list.map(r => `| ${r.id} | ${r.split} | ${r.learner} | ${r.correct.split("|").map(esc).join(" / ")} | ${r.category} | ${esc(r.intended_meaning)} | ${esc(r.explanation)} |`)].join("\n");
const VERSIONS_PATH = require("path").join(require("path").dirname(csvPath), "..", "results", "VERSIONS.md");
const versions = fs.existsSync(VERSIONS_PATH) ? fs.readFileSync(VERSIONS_PATH, "utf8").replace(/^# Version history\s*/, "") : "No results yet.";
const md = `# Convo AI: test data

**Recorded by Ethan**

This is the quiz we use to measure Convo. It is **test data, not training data**: we never train or fine-tune the model. We give Qwen 2.5 3B Instruct each learner sentence and check whether it corrects it properly.

- **Source file:** [\`data/test_cases.csv\`](data/test_cases.csv). This page is generated from it, so the two always match.
- **Scenario:** an A2-level immigrant ordering at a café, in Mandarin Chinese (simplified characters).
- **How we made it:** our team wrote the sentences with help from Claude (an AI assistant), based on common beginner mistakes, then revised them after review (we removed sentences that are natural in real speech, and added extra right answers where more than one is correct).
- **Checked by a Chinese speaker:** ${reviewed} of ${recs.length} sentences. ${reviewed < recs.length ? "**Not all sentences have been checked yet. Treat unchecked rows with caution.**" : ""}

## Summary

| | Count |
|---|---|
| Total sentences | ${recs.length} |
| With a mistake | ${mist.length} |
| Already correct (Convo should leave these alone) | ${ok.length} |
| Tune split (used to improve the prompt) | ${bySplit.tune || 0} |
| Test split (held out, used once for the final score) | ${bySplit.test || 0} |

**Mistake types:** ${Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} (${v})`).join(", ")}.

## How it is scored

- **Mistakes caught:** of the sentences with a mistake, how many Convo flags.
- **False corrections:** of the correct sentences, how many Convo wrongly "fixes".
- **Corrections matching:** how many of Convo's corrections match one of our right answers. This is strict, so a correct answer worded differently counts as a miss; a person also reviews the corrections by hand.
- **Baseline:** a waiter that never corrects anything (catches 0 mistakes, 0 false corrections).
- **Fairness:** we only improved the prompt using the **tune** split. The **test** split is run once, at the end, and the prompt is not changed after that.

Version-by-version scores on the tune split are in [\`results/VERSIONS.md\`](results/VERSIONS.md). Raw outputs for every run are in [\`results/\`](results/).

## Results by version

(Copied from [\`results/VERSIONS.md\`](results/VERSIONS.md).)

${versions}

## Sentences with a mistake (${mist.length})

${table(mist)}

## Correct sentences (${ok.length})

${table(ok)}
`;
fs.writeFileSync(outPath, md);
console.log("rows", recs.length, "mistakes", mist.length, "correct", ok.length, bySplit, "reviewed", reviewed);
