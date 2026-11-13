"""Regression checks for the November 2026 second multi-primitive coverage batch."""
import json
import re
import unittest
from pathlib import Path

DATA = Path(__file__).resolve().parents[1] / "data"
PREFIX = "round2-20261113-"


def load(name):
    return json.loads((DATA / (name + ".json")).read_text(encoding="utf8"))["items"]


def normalize_title(title):
    return " ".join(re.sub(r"[^\w]+", " ", title.casefold()).split())


class Round2PaperCoverageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.papers = load("papers")
        cls.harvested = load("papers-harvested")
        cls.primitives = load("primitives")
        cls.sources = load("sources")
        cls.batch = [p for p in cls.papers if p["id"].startswith(PREFIX)]

    def test_every_new_paper_links_two_distinct_canonical_ids(self):
        valid = {p["id"] for p in self.primitives}
        sources = {s["id"]: s for s in self.sources}
        self.assertGreaterEqual(len(self.batch), 50)
        for paper in self.batch:
            with self.subTest(paper=paper["id"]):
                refs = [link["primitive_id"] for link in paper["primitives"]]
                self.assertGreaterEqual(len(refs), 2)
                self.assertEqual(len(refs), len(set(refs)))
                self.assertTrue(set(refs).issubset(valid))
                self.assertIn(paper["source_id"], sources)
                self.assertTrue(paper["url"].startswith("https://"))
                self.assertEqual(paper["url"], sources[paper["source_id"]]["url"])
                self.assertTrue(paper.get("venue"))
                self.assertTrue(paper.get("scope_note"))
                self.assertTrue(paper.get("year"))
                self.assertIn(paper.get("review_status"),
                              {"editorial_metadata_checked", "editorial_abstract_checked"})
                self.assertTrue(all(link.get("evidence") and link.get("note")
                                    for link in paper["primitives"]))

    def test_new_paper_titles_not_duplicated(self):
        existing = {
            normalize_title(p["title"])
            for p in self.harvested + self.papers
            if not p["id"].startswith(PREFIX)
        }
        for p in self.batch:
            with self.subTest(paper=p["id"]):
                title = normalize_title(p["title"])
                self.assertNotIn(title, existing)
                existing.add(title)

    def test_coverage_gain_is_nonzero_and_precise(self):
        # Compare with earlier numbered campaigns only. Including later rounds
        # in "previous" makes successful later curation erase this gain.
        def precedes_batch(paper):
            campaign = re.match(r"^round(\d+)(?:extra)?-20261113-", paper["id"])
            return campaign is None or int(campaign.group(1)) < 2

        previous = {
            x["primitive_id"]
            for p in self.harvested + self.papers
            if precedes_batch(p)
            for x in p["primitives"]
        }
        now = previous | {
            x["primitive_id"] for p in self.batch for x in p["primitives"]
        }
        self.assertGreater(len(now - previous), 100)
        self.assertGreaterEqual(len(now), 600)


if __name__ == "__main__":
    unittest.main()

