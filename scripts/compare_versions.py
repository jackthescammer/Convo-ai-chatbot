"""Regression check: compare a version's tune results with every earlier version.

Reads the raw tune result files in results/ (it does not re-score anything) and
prints, sentence by sentence, which versions got each sentence right:
  - a sentence with a mistake is "right" if the fix matched an accepted answer
  - a correct sentence is "right" if it was left unchanged

Then it checks the new version against the BEST earlier version and lists every
sentence the best version got right that the new version gets wrong. If there are
any, the new version is a regression and exits with code 1: don't make it the
final version.

    python scripts/compare_versions.py v6
"""

import glob
import json
import os
import sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_runs(results_dir=os.path.join(HERE, "results")):
    """First tune run of each prompt version -> {version: {id: row}}."""
    runs = {}
    for path in sorted(glob.glob(os.path.join(results_dir, "*_corrections_*_tune.json"))):
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        runs.setdefault(data["prompt_version"], {r["id"]: r for r in data["rows"]})
    return runs


def is_right(row):
    return row["fix_exact"] if row["has_mistake"] else not row["flagged"]


def version_key(v):
    return int(v.lstrip("v")) if v.lstrip("v").isdigit() else 0


def main(argv):
    runs = load_runs()
    if not runs:
        print("no tune results found")
        return 2
    versions = sorted(runs, key=version_key)
    new = argv[1] if len(argv) > 1 else versions[-1]
    if new not in runs:
        print(f"no tune results for {new}")
        return 2
    ids = list(runs[versions[0]])

    print("id  " + " ".join(f"{v:>3}" for v in versions) + "  sentence")
    for i in ids:
        marks = " ".join(f"{'Y' if is_right(runs[v][i]) else '.':>3}" for v in versions)
        print(f"{i}  {marks}  {runs[versions[0]][i]['learner']}")
    totals = {v: sum(is_right(runs[v][i]) for i in ids) for v in versions}
    print("tot " + " ".join(f"{totals[v]:>3}" for v in versions) + f"  (out of {len(ids)})")

    earlier = [v for v in versions if version_key(v) < version_key(new)]
    if not earlier:
        print(f"\n{new} is the first version; nothing to compare against.")
        return 0
    best = max(earlier, key=lambda v: (totals[v], version_key(v)))
    lost = [i for i in ids if is_right(runs[best][i]) and not is_right(runs[new][i])]
    gained = [i for i in ids if not is_right(runs[best][i]) and is_right(runs[new][i])]
    print(f"\n{new}: {totals[new]}/{len(ids)} right. Best earlier version: {best} with {totals[best]}/{len(ids)}.")
    for i in gained:
        print(f"  better than {best}: {i} {runs[new][i]['learner']}")
    for i in lost:
        r = runs[new][i]
        got = r["model_fix"] or "(no change)"
        print(f"  WORSE than {best}: {i} {r['learner']} -> {got} (expected {r['expected']})")
    if lost:
        print(f"\nREGRESSION: {new} gets {len(lost)} sentence(s) wrong that {best} got right. "
              "Do not use it as the final version without discussing it.")
        return 1
    print(f"\nOK: {new} keeps everything {best} got right.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
