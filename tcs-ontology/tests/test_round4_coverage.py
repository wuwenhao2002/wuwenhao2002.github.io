"""Round-four primary-paper coverage and abstract backfill consistency checks.

These are graph/data assertions, not proof-level validation of published theorems.
"""
import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
PREFIXES = ("round4-20261113-", "round4extra-20261113-")

BACKFILL = {
    "program-stoc-smoothed-positive": {
        "problem.positive-only-learning",
        "assumption.reference-distribution",
    },
    "program-stoc-stream-match": {"problem.streaming-matching"},
    "program-focs25-multi-pass-maxcut": {"technique.multipass-streaming-lower-bound"},
    "curated-dinitz-lasserre-spanner": {"technique.integrality-gap-construction"},
    "dinitz-graphcuts": {"model.edge-differential-privacy"},
}


def items(name):
    with (DATA / (name + ".json")).open(encoding="utf-8") as f:
        return json.load(f)["items"]


def normalize_title(title):
    return " ".join(re.sub(r"[^\w]+", " ", title.casefold()).split())


class RoundFourCoverageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.primitives = items("primitives")
        cls.papers = items("papers")
        cls.harvested = items("papers-harvested")
        cls.sources = items("sources")
        cls.batch = [p for p in cls.papers if p["id"].startswith(PREFIXES)]

    def test_each_new_paper_has_two_distinct_valid_concepts_and_source(self):
        valid = {p["id"] for p in self.primitives}
        source_by_id = {s["id"]: s for s in self.sources}
        self.assertGreaterEqual(len(self.batch), 52)
        for paper in self.batch:
            with self.subTest(id=paper["id"]):
                links = [link["primitive_id"] for link in paper["primitives"]]
                self.assertGreaterEqual(len(links), 2)
                self.assertEqual(len(links), len(set(links)))
                self.assertTrue(set(links).issubset(valid))
                self.assertIn(paper["source_id"], source_by_id)
                self.assertEqual(source_by_id[paper["source_id"]]["url"], paper["url"])
                self.assertTrue(paper["url"].startswith("https://"))
                self.assertTrue(paper["scope_note"])
                self.assertTrue(paper["venue"])
                self.assertTrue(paper["authors"])
                self.assertIn(paper["review_status"], {
                    "editorial_metadata_checked", "editorial_abstract_checked",
                })
                for link in paper["primitives"]:
                    self.assertTrue(link.get("role"))
                    self.assertTrue(link.get("evidence"))
                    self.assertTrue(link.get("note"))

    def test_no_duplicate_titles_created_by_round_four(self):
        existing = {
            normalize_title(p["title"])
            for p in self.papers + self.harvested
            if not p["id"].startswith(PREFIXES)
        }
        for paper in self.batch:
            key = normalize_title(paper["title"])
            self.assertNotIn(key, existing)
            existing.add(key)

    def test_backfilled_existing_papers_reference_canonical_ids(self):
        by_id = {p["id"]: p for p in self.papers}
        valid = {p["id"] for p in self.primitives}
        for paper_id, refs in BACKFILL.items():
            self.assertIn(paper_id, by_id)
            paper = by_id[paper_id]
            linked = {link["primitive_id"] for link in paper["primitives"]}
            self.assertTrue(refs.issubset(linked))
            self.assertTrue(refs.issubset(valid))

    def test_round_four_coverage_growth(self):
        original = {
            link["primitive_id"]
            for paper in self.papers + self.harvested
            if not paper["id"].startswith(PREFIXES)
            and paper["id"] not in BACKFILL
            for link in paper["primitives"]
        }
        # Exclude known post-round-three additions on the five older papers.
        for paper in self.papers:
            if paper["id"] in BACKFILL:
                original.update(
                    link["primitive_id"] for link in paper["primitives"]
                    if link["primitive_id"] not in BACKFILL[paper["id"]]
                )
        new = {
            link["primitive_id"]
            for paper in self.batch for link in paper["primitives"]
        } | set().union(*BACKFILL.values())
        self.assertGreaterEqual(len(new - original), 70)
        self.assertGreaterEqual(len(new | original), 750)

    def test_no_false_perfect_hiding_label_for_statistical_hiding(self):
        paper = next(p for p in self.batch if p["id"].endswith("statistical-commit09"))
        refs = {x["primitive_id"] for x in paper["primitives"]}
        self.assertIn("model.commitment-scheme", refs)
        self.assertNotIn("property.perfect-hiding", refs)

    def test_official_abstract_evidence_labels_agree_with_review_status(self):
        paper_by_id = {p["id"]: p for p in self.papers}
        for paper_id in (
            "program-stoc-smoothed-positive",
            "program-stoc-stream-match",
            "program-focs25-multi-pass-maxcut",
        ):
            paper = paper_by_id[paper_id]
            self.assertEqual(paper["review_status"], "editorial_abstract_checked")
            self.assertTrue(all(link.get("evidence") == "official_abstract"
                                for link in paper["primitives"]))


if __name__ == "__main__":
    unittest.main()
