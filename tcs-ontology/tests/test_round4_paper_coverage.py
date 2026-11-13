"""Fourth-pass paper graph regression checks: no fabricated single-concept papers.

This file verifies data shapes and provenance pointers, not mathematical theorems.
"""
import json
import re
import unittest
from pathlib import Path

DATA = Path(__file__).resolve().parents[1] / "data"

def load(name):
    return json.loads((DATA / (name + ".json")).read_text(encoding="utf8"))["items"]

def key(title):
    return " ".join(re.sub(r"[^\w]+", " ", title.casefold()).split())

def is_round4(p):
    return p["id"].startswith(("round4-20261113-", "round4extra-20261113-"))

class FourthPassPaperTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.primitives = load("primitives")
        cls.papers = load("papers")
        cls.harvested = load("papers-harvested")
        cls.sources = load("sources")
        cls.new = [p for p in cls.papers if is_round4(p)]

    def test_every_new_paper_links_two_or_more_distinct_valid_ids(self):
        valid = {p["id"] for p in self.primitives}
        by_source = {s["id"]: s for s in self.sources}
        self.assertGreaterEqual(len(self.new), 50)
        for p in self.new:
            with self.subTest(paper=p["id"]):
                tags = [x["primitive_id"] for x in p["primitives"]]
                self.assertGreaterEqual(len(tags), 2)
                self.assertEqual(len(tags), len(set(tags)))
                self.assertTrue(set(tags) <= valid)
                self.assertIn(p["source_id"], by_source)
                self.assertEqual(p["url"], by_source[p["source_id"]]["url"])
                self.assertTrue(p["url"].startswith("https://"))
                self.assertTrue(p.get("venue"))
                self.assertTrue(p.get("scope_note"))
                self.assertTrue(all(x.get("note") and x.get("evidence")
                                    for x in p["primitives"]))

    def test_no_duplicate_titles_in_new_batch(self):
        old = {key(p["title"]) for p in self.papers + self.harvested if not is_round4(p)}
        for p in self.new:
            normalized = key(p["title"])
            self.assertNotIn(normalized, old)
            old.add(normalized)

    def test_round4_coverage_increment_and_existing_paper_backfill(self):
        base = {x["primitive_id"] for p in self.papers + self.harvested
                if not is_round4(p) for x in p["primitives"]}
        after = base | {x["primitive_id"] for p in self.new for x in p["primitives"]}
        self.assertGreaterEqual(len(after - base), 60)
        self.assertGreaterEqual(len(after), 750)
        self.assertTrue(all(is_round4(p) for p in self.new))

if __name__ == "__main__":
    unittest.main()
