"""Regenerate the README's current corpus snapshot from validated canonical JSON.

Run without flags to update, or with --check in CI to reject stale statistics.
"""
from __future__ import annotations

import argparse
from pathlib import Path

from ontology import require_valid
from quality import report

START = "<!-- corpus-snapshot:start -->"
END = "<!-- corpus-snapshot:end -->"
README = Path(__file__).resolve().parents[1] / "README.md"


def snapshot(db):
    stats = report(db)
    coverage = stats["paper_coverage"]
    reviewed = sum(stats["review_status"].get(status, 0)
                   for status in ("source_checked", "expert_reviewed"))
    total = stats["total"]
    return "\n".join([
        START,
        "## Current data snapshot",
        "",
        "Generated from canonical JSON with `python3 tools/update_snapshot.py`.",
        "",
        "| Measure | Current value |",
        "| --- | ---: |",
        f"| Canonical primitives | {total:,} |",
        f"| Research areas | {len(stats['areas']):,} |",
        f"| Editorially source-checked primitives | {reviewed:,} |",
        f"| Curated paper records | {stats['indexed_papers']:,} |",
        f"| Separately marked title-inferred records | {stats['title_inferred_papers']:,} |",
        f"| Distinct indexed papers after title/ID deduplication | {stats['distinct_indexed_papers']:,} |",
        f"| Primitives linked to curated papers | {coverage['curated_primitives']:,} / {total:,} |",
        f"| Primitives linked to either paper tier | {coverage['combined_primitives']:,} / {total:,} ({coverage['combined_primitives'] / total:.1%}) |",
        f"| Primitives without an indexed paper | {coverage['unlinked_primitives']:,} |",
        f"| Bibliographic sources | {stats['sources']:,} |",
        "",
        "Editorial source/abstract checks are not expert review or theorem verification. "
        "An empty paper intersection never establishes novelty or an open problem.",
        END,
    ])


def replace_snapshot(text, block):
    if text.count(START) != 1 or text.count(END) != 1:
        raise ValueError("README must contain exactly one corpus snapshot marker pair")
    before, remaining = text.split(START, 1)
    _, after = remaining.split(END, 1)
    return before + block + after


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    text = README.read_text(encoding="utf-8")
    updated = replace_snapshot(text, snapshot(require_valid()))
    if args.check:
        if updated != text:
            parser.exit(1, "README snapshot is stale; run python3 tools/update_snapshot.py\n")
        print("README corpus snapshot is current.")
    else:
        README.write_text(updated, encoding="utf-8")
        print("Updated README corpus snapshot.")


if __name__ == "__main__":
    main()
