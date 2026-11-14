"""Reproducible evaluation (CLAUDE.md section 6).

Two kinds of test, both logged to results/ with the model name and PROMPT_VERSION:

  corrections   learner sentences with known mistakes -> correction accuracy,
                false-correction rate (data/test_cases.csv)
  conversation  scripted learner turns -> character consistency, context retention

Run from the repo root:
    python -m convo.evaluation corrections --split tune
    python -m convo.evaluation corrections --split test      # final score, don't tune after
    python -m convo.evaluation conversation

Strict automatic scores are a LOWER BOUND: a correction worded differently from our
answer counts as a miss. Fill in the human_* columns of the exported CSV and run
`summarise_human_review` for the numbers that count (explanation accuracy needs a person).
"""

import argparse
import csv
import json
import os
import time
from pathlib import Path

from .chat import Conversation
from .prompts import PROMPT_VERSION
from .review import review_sentence
from .settings import Settings
from .structured import normalise

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "test_cases.csv"
RESULTS_DIR = Path(__file__).resolve().parent.parent / "results"

TARGETS = {  # initial targets from CLAUDE.md; goals, not assumed model abilities
    "correction_accuracy": 0.85,
    "false_correction_rate": 0.10,
    "character_consistency": 0.90,
    "context_retention": 0.90,
    "explanation_accuracy": 0.80,
}


def load_cases(path=DATA_PATH, split=None):
    with open(path, newline="", encoding="utf-8") as f:
        cases = list(csv.DictReader(f))
    for c in cases:
        c["has_mistake"] = c["learner"] != c["correct"]
    if split in (None, "all"):
        return cases
    return [c for c in cases if c["split"] == split]


def _rate(num, den):
    return round(num / den, 4) if den else None


# ------------------------------------------------------------------ corrections

def run_correction_eval(backend, cases, level="A2"):
    """Run the sentence checker over `cases`; return rows and metrics."""
    rows = []
    for c in cases:
        r = review_sentence(backend, c["learner"], level)
        rows.append({
            "id": c["id"], "learner": c["learner"], "expected": c["correct"],
            "category_expected": c["category"], "has_mistake": c["has_mistake"],
            "flagged": r.has_error, "model_fix": r.corrected if r.has_error else "",
            "category_model": r.category, "explanation_model": r.explanation,
            "valid": r.valid, "guard": r.guard,
            "fix_exact": r.has_error and normalise(r.corrected) == normalise(c["correct"]),
        })
    mistakes = [r for r in rows if r["has_mistake"]]
    correct = [r for r in rows if not r["has_mistake"]]
    metrics = {
        "n_cases": len(rows), "n_mistake_cases": len(mistakes), "n_correct_cases": len(correct),
        "baseline_mistakes_caught": 0, "baseline_false_corrections": 0,
        "mistakes_flagged": sum(r["flagged"] for r in mistakes),
        "detection_recall": _rate(sum(r["flagged"] for r in mistakes), len(mistakes)),
        "correction_accuracy_strict": _rate(sum(r["fix_exact"] for r in mistakes), len(mistakes)),
        "false_correction_rate": _rate(sum(r["flagged"] for r in correct), len(correct)),
        "false_corrections": sum(r["flagged"] for r in correct),
        "valid_output_rate": _rate(sum(r["valid"] for r in rows), len(rows)),
        "targets": TARGETS,
    }
    by_cat = {}
    for r in mistakes:
        d = by_cat.setdefault(r["category_expected"], {"n": 0, "flagged": 0, "exact": 0})
        d["n"] += 1
        d["flagged"] += r["flagged"]
        d["exact"] += r["fix_exact"]
    metrics["by_category"] = by_cat
    return {"rows": rows, "metrics": metrics}


def export_for_human_review(result, path):
    """CSV for a Chinese speaker to mark; fill human_correction_ok / human_explanation_ok with y/n."""
    cols = ["id", "learner", "expected", "flagged", "model_fix", "category_expected",
            "category_model", "explanation_model", "fix_exact"]
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(cols + ["human_correction_ok", "human_explanation_ok"])
        for r in result["rows"]:
            if r["has_mistake"] or r["flagged"]:
                w.writerow([r[c] for c in cols] + ["", ""])
    return path


def summarise_human_review(path):
    """Score a human-marked review CSV (see export_for_human_review)."""
    yes = {"y", "yes", "1", "true", "ok"}
    no = {"n", "no", "0", "false"}
    with open(path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    flagged = [r for r in rows if str(r["flagged"]).lower() == "true"]
    marked_fix = [r for r in flagged if r["human_correction_ok"].strip().lower() in yes | no]
    marked_expl = [r for r in flagged if r["human_explanation_ok"].strip().lower() in yes | no]
    ok_fix = sum(r["human_correction_ok"].strip().lower() in yes for r in marked_fix)
    ok_expl = sum(r["human_explanation_ok"].strip().lower() in yes for r in marked_expl)
    return {
        "corrections_marked": len(marked_fix), "corrections_ok": ok_fix,
        "correction_accuracy_human": _rate(ok_fix, len(marked_fix)),
        "explanations_marked": len(marked_expl), "explanations_ok": ok_expl,
        "explanation_accuracy_human": _rate(ok_expl, len(marked_expl)),
        "unmarked": len(flagged) - min(len(marked_fix), len(marked_expl)),
    }


# ----------------------------------------------------------------- conversation

# Learner scripts are test fixtures (the waiter's replies are always generated).
# `items` must still be known to the waiter when the learner asks what they ordered.
CONVERSATION_SCRIPTS = [
    {"name": "latte", "turns": ["你好！", "我想要一杯拿铁。", "热的，谢谢。"], "items": ["拿铁"]},
    {"name": "tea", "turns": ["你好。", "你们有茶吗？", "我要一杯绿茶。"], "items": ["茶"]},
    {"name": "cake_water", "turns": ["你好！", "我要一块蛋糕。", "还要一杯水。"], "items": ["蛋糕", "水"]},
    {"name": "americano", "turns": ["你好。", "我要一杯冰美式。", "大杯，不要糖。"], "items": ["美式"]},
    {"name": "juice", "turns": ["你好！", "有果汁吗？", "好，我要一杯果汁。"], "items": ["果汁"]},
    {"name": "bread_coffee", "turns": ["你好。", "我想要一个面包。", "还有一杯咖啡。"], "items": ["面包", "咖啡"]},
]
PROBE = "我刚才点了什么？"


def run_conversation_eval(backend, settings=None, scripts=None):
    settings = settings or Settings(level="A2", difficulty="Standard")
    scripts = scripts or CONVERSATION_SCRIPTS
    transcripts, all_turns = [], []
    retained, tracked = 0, 0
    for s in scripts:
        conv = Conversation(backend, settings, seed=0, temperature=0.0)
        waiter = [conv.start()]
        for t in s["turns"]:
            waiter.append(conv.send(t))
        state_ok = all(any(item in o for o in conv.order) for item in s["items"])
        probe_turn = conv.send(PROBE)
        waiter.append(probe_turn)
        haystack = probe_turn.reply + " ".join(probe_turn.order)
        recalled = all(item in haystack for item in s["items"])
        retained += recalled
        tracked += state_ok
        all_turns += waiter
        transcripts.append({
            "script": s["name"], "items": s["items"], "state_after_order": conv.order,
            "state_tracking_ok": state_ok, "context_retained": recalled,
            "dialogue": [{"learner": u, "waiter": t.reply, "valid": t.valid}
                         for u, t in zip(["(enters)"] + s["turns"] + [PROBE], waiter)],
        })
    n = len(all_turns)
    metrics = {
        "n_scripts": len(scripts), "n_waiter_turns": n,
        "character_consistency": _rate(sum(t.valid for t in all_turns), n),
        "first_try_valid_rate": _rate(sum(t.valid and t.retries == 0 for t in all_turns), n),
        "context_retention": _rate(retained, len(scripts)),
        "state_tracking": _rate(tracked, len(scripts)),
        "targets": TARGETS,
    }
    return {"transcripts": transcripts, "metrics": metrics}


# ---------------------------------------------------------------------- logging

def log_result(kind, backend_name, split, result, results_dir=RESULTS_DIR):
    """Save the full result and append a summary line to results/log.csv."""
    results_dir = Path(results_dir)
    results_dir.mkdir(parents=True, exist_ok=True)
    stamp = time.strftime("%Y%m%d-%H%M%S")
    safe_model = backend_name.replace("/", "_")
    out = results_dir / f"{stamp}_{kind}_{safe_model}_{PROMPT_VERSION}_{split or 'na'}.json"
    payload = {"kind": kind, "model": backend_name, "prompt_version": PROMPT_VERSION,
               "split": split, "timestamp": stamp, **result}
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    log = results_dir / "log.csv"
    new = not log.exists()
    metrics = {k: v for k, v in result["metrics"].items() if k not in ("targets", "by_category")}
    with open(log, "a", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        if new:
            w.writerow(["timestamp", "kind", "model", "prompt_version", "split", "metrics", "file"])
        w.writerow([stamp, kind, backend_name, PROMPT_VERSION, split or "",
                    json.dumps(metrics, ensure_ascii=False), out.name])
    return out


def format_metrics(metrics):
    lines = []
    for k, v in metrics.items():
        if k in ("targets", "by_category"):
            continue
        shown = f"{v:.0%}" if isinstance(v, float) and 0 <= v <= 1 else v
        lines.append(f"  {k}: {shown}")
    return "\n".join(lines)


def main(argv=None):
    p = argparse.ArgumentParser(description="Convo AI evaluation")
    p.add_argument("kind", choices=["corrections", "conversation"])
    p.add_argument("--split", default="tune", choices=["tune", "test", "all"])
    p.add_argument("--level", default="A2", choices=["A1", "A2"])
    p.add_argument("--model", default=None, help="Hugging Face model id (default: Qwen2.5-3B-Instruct)")
    args = p.parse_args(argv)

    from .backends import load_backend
    backend = load_backend(args.model)

    if args.kind == "corrections":
        cases = load_cases(split=args.split)
        unreviewed = sum(1 for c in cases if not c["reviewed_by"].strip())
        if unreviewed:
            print(f"WARNING: {unreviewed}/{len(cases)} test sentences have not been checked by a "
                  "Chinese speaker (fill 'reviewed_by' in data/test_cases.csv).")
        if args.split in ("test", "all"):
            print("NOTE: this is the final score. Don't change the prompt and re-run to improve it.")
        result = run_correction_eval(backend, cases, args.level)
        export_for_human_review(result, RESULTS_DIR / f"human_review_{args.split}.csv")
    else:
        result = run_conversation_eval(backend, Settings(level=args.level))
    path = log_result(args.kind, backend.name, args.split if args.kind == "corrections" else None, result)
    print(format_metrics(result["metrics"]))
    print("saved", path)


if __name__ == "__main__":
    main()
