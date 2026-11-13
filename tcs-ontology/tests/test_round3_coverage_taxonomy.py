"""Round-three literature coverage and canonical primitive reclassification regression tests.

Scientific caveat: evidence-index consistency is not theorem verification.
"""
import json
import re
import unittest
from pathlib import Path

DATA = Path(__file__).resolve().parents[1] / "data"
PREFIX = "round3-20261113-"


def rows(name):
    return json.loads((DATA / (name + ".json")).read_text(encoding="utf8"))["items"]


def title_key(value):
    return " ".join(re.sub(r"[^\w]+", " ", value.casefold()).split())


class RoundThreeCoverageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.papers = rows("papers")
        cls.harvested = rows("papers-harvested")
        cls.primitives = rows("primitives")
        cls.sources = rows("sources")
        cls.redirects = rows("redirects")
        cls.batch = [p for p in cls.papers if p["id"].startswith(PREFIX)]

    def test_each_new_paper_has_two_distinct_canonical_primitives(self):
        valid = {p["id"] for p in self.primitives}
        source_by_id = {s["id"]: s for s in self.sources}
        self.assertGreaterEqual(len(self.batch), 45)
        for p in self.batch:
            with self.subTest(paper=p["id"]):
                links = [x["primitive_id"] for x in p["primitives"]]
                self.assertGreaterEqual(len(links), 2)
                self.assertEqual(len(links), len(set(links)))
                self.assertTrue(set(links).issubset(valid))
                self.assertIn(p["source_id"], source_by_id)
                self.assertEqual(p["url"], source_by_id[p["source_id"]]["url"])
                self.assertTrue(p["url"].startswith("https://"))
                self.assertTrue(p["scope_note"])
                self.assertTrue(p["venue"])
                self.assertTrue(p["authors"])
                self.assertIn(p["review_status"],
                              {"editorial_metadata_checked", "editorial_abstract_checked"})
                self.assertTrue(all(x.get("evidence") and x.get("note")
                                    for x in p["primitives"]))

    def test_new_titles_unique_against_curated_and_harvested(self):
        seen = {
            title_key(p["title"])
            for p in self.papers + self.harvested
            if not p["id"].startswith(PREFIX)
        }
        for p in self.batch:
            key = title_key(p["title"])
            self.assertNotIn(key, seen)
            seen.add(key)

    def test_new_coverage_is_from_actual_paper_memberships(self):
        previous = {
            x["primitive_id"]
            for p in self.papers + self.harvested
            if not p["id"].startswith(PREFIX)
            for x in p["primitives"]
        }
        now = previous | {
            x["primitive_id"] for p in self.batch for x in p["primitives"]
        }
        self.assertGreaterEqual(len(now - previous), 75)
        self.assertGreaterEqual(len(now), 680)

    def test_complexity_resource_metrics_replace_misclassified_tasks(self):
        by_id = {p["id"]: p for p in self.primitives}
        redirects = {x["from"]: x["to"] for x in self.redirects}
        for suffix in ("time-complexity", "query-complexity"):
            old = "task." + suffix
            new = "property." + suffix
            self.assertNotIn(old, by_id)
            self.assertIn(new, by_id)
            self.assertEqual(redirects.get(old), new)
            self.assertEqual(by_id[new]["kind"], "property")
            self.assertEqual(by_id[new]["review_status"], "source_checked")
            self.assertTrue(by_id[new]["source_ids"])
            self.assertTrue(by_id[new]["definition"])
        self.assertEqual(len(by_id), len(self.primitives))

    def test_influence_maximization_has_correct_problem_definition(self):
        p = {x["id"]: x for x in self.primitives}["problem.influence-maximization"]
        self.assertEqual(p["kind"], "problem")
        self.assertIn("seed", p["definition"].lower())
        self.assertIn("round3-20261113-kempe-influence15", p["source_ids"])
        self.assertNotIn("author-dinitz-publications", p["source_ids"])


if __name__ == "__main__":
    unittest.main()
