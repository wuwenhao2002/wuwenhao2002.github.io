"""Coverage campaign regression checks: canonical multi-primitive associations."""
import json
import unittest
from pathlib import Path

DATA = Path(__file__).resolve().parents[1] / "data"


def items(name):
    return json.loads((DATA / (name + ".json")).read_text(encoding="utf8"))["items"]


class MultiPrimitiveCoverageTests(unittest.TestCase):
    def test_new_papers_have_two_distinct_existing_primitives(self):
        valid = {p["id"] for p in items("primitives")}
        sources = {s["id"] for s in items("sources")}
        added = [p for p in items("papers") if p["id"].startswith("coverage-20261113-")]
        self.assertGreaterEqual(len(added), 50)
        for paper in added:
            with self.subTest(paper=paper["id"]):
                linked = [x["primitive_id"] for x in paper["primitives"]]
                self.assertGreaterEqual(len(set(linked)), 2)
                self.assertEqual(len(linked), len(set(linked)))
                self.assertTrue(set(linked) <= valid)
                self.assertIn(paper["source_id"], sources)
                self.assertTrue(paper["scope_note"].strip())
                self.assertTrue(paper.get("url", "").startswith("https://"))
                self.assertEqual(paper["review_status"], "editorial_metadata_checked")
                self.assertTrue(all("evidence" in x for x in paper["primitives"]))

    def test_no_title_duplicate_across_curated_and_harvested(self):
        def normal(s):
            return " ".join("".join(c.lower() if c.isalnum() else " " for c in s).split())
        curated = items("papers")
        harvested = items("papers-harvested")
        old = [p for p in curated if not p["id"].startswith("coverage-20261113-")] + harvested
        seen = {normal(p["title"]) for p in old}
        additions = [p for p in curated if p["id"].startswith("coverage-20261113-")]
        for p in additions:
            key = normal(p["title"])
            self.assertNotIn(key, seen)
            seen.add(key)


if __name__ == "__main__":
    unittest.main()
