"""Additional coverage for v0.2 quality, redirects, and compatibility."""
import importlib.util
import tempfile
import unittest
import sqlite3
import sys
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
spec = importlib.util.spec_from_file_location("ontology_v2", ROOT / "tools" / "ontology.py")
ontology = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ontology)
from quality import audit, report


class QualityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db = ontology.require_valid()

    def test_all_structural_checks_pass(self):
        self.assertEqual([], audit(self.db))

    def test_redirects_canonical_and_unambiguous(self):
        ids = {x["id"] for x in self.db["primitives"]}
        for ref in self.db["redirects"]:
            self.assertNotIn(ref["from"], ids)
            self.assertIn(ref["to"], ids)
        self.assertEqual(
            next(x["to"] for x in self.db["redirects"] if x["from"] == "assumption.seth"),
            "assumption.strong-exponential-time-hypothesis",
        )

    def test_no_unverified_promoted_to_checked(self):
        for item in self.db["primitives"]:
            if item["review_status"] == "source_checked":
                self.assertTrue(item["definition"])
                self.assertTrue(item["scope_note"])
                self.assertTrue(item["source_ids"])

    def test_weighted_congestion_pure_nash_is_not_generated(self):
        out = ontology.compose(self.db, "equilibrium-efficiency", 2000,
                               include_candidates=True)
        for question in out:
            pair = question["slots"]
            self.assertFalse(pair["system"]=="game.weighted-congestion-game"
                             and pair["equilibrium"]=="equilibrium.pure-nash-equilibrium")

    def test_default_composer_restricts_reviewed_primitives(self):
        out = ontology.compose(self.db, "equilibrium-efficiency", 25)
        self.assertTrue(out)
        by = {x["id"]: x for x in self.db["primitives"]}
        for q in out:
            self.assertTrue(all(by[id]["review_status"]=="source_checked"
                                for id in q["slots"].values()))

    def test_quality_mutations_detected(self):
        altered=deepcopy(self.db)
        altered["redirects"].append({"from":"assumption.fake","to":"property.fake"})
        altered["relationships"].append({"source":"graph_class.tree","predicate":"is_a",
                                         "target":"graph_class.tree","review_status":"editorial_seed"})
        found=audit(altered)
        self.assertTrue(any("redirect target" in err for err in found))
        self.assertTrue(any("self edge" in err for err in found))

    def test_sqlite_retains_redirects_and_scoped_results(self):
        with tempfile.TemporaryDirectory() as d:
            target=Path(d)/"ontology.sqlite"
            ontology.export_sqlite(self.db,target)
            from contextlib import closing
            with closing(sqlite3.connect(target)) as con:
                self.assertEqual(
                    con.execute("SELECT COUNT(*) FROM redirect").fetchone()[0],
                    len(self.db["redirects"]))
                self.assertEqual(
                    con.execute("SELECT COUNT(*) FROM checked_result").fetchone()[0],
                    len(self.db["results"]))
                self.assertFalse(con.execute("PRAGMA foreign_key_check").fetchall())

    def test_quality_report(self):
        summary=report(self.db)
        self.assertEqual(summary["total"],len(self.db["primitives"]))
        self.assertGreater(summary["review_status"]["source_checked"],100)


if __name__ == "__main__":
    unittest.main()

