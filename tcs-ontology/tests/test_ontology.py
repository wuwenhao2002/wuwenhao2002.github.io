"""Run with: python3 -m unittest discover -s tests -v"""
import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))

SPEC = importlib.util.spec_from_file_location(
    "ontology", Path(__file__).resolve().parents[1] / "tools" / "ontology.py")
ontology = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ontology)


class OntologyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db, cls.errors = ontology.validate()

    def test_valid_references(self):
        self.assertEqual([], self.errors)

    def test_core_examples_exist(self):
        ids = {p["id"] for p in self.db["primitives"]}
        self.assertTrue({
            "property.price-of-anarchy",
            "game.congestion-game",
            "auction.first-price-auction",
            "game.mean-field-game",
        } <= ids)

    def test_multiple_fields_and_types(self):
        self.assertGreaterEqual(
            len(set(p["kind"] for p in self.db["primitives"])), 10)
        self.assertGreaterEqual(
            len(set(a for p in self.db["primitives"] for a in p["areas"])), 15)

    def test_composer_uses_existing_ids(self):
        out = ontology.compose(self.db, "equilibrium-efficiency", 7)
        self.assertEqual(len(out), 7)
        ids = {p["id"] for p in self.db["primitives"]}
        self.assertTrue(all(set(e["slots"].values()) <= ids for e in out))

    def test_sqlite_export(self):
        import sqlite3
        with tempfile.TemporaryDirectory() as tmp:
            dbfile = Path(tmp) / "ontology.sqlite"
            ontology.export_sqlite(self.db, dbfile)
            with sqlite3.connect(dbfile) as con:
                self.assertEqual(
                    con.execute("SELECT COUNT(*) FROM primitive").fetchone()[0],
                    len(self.db["primitives"]),
                )
                self.assertEqual(con.execute("PRAGMA foreign_key_check").fetchall(), [])


if __name__ == "__main__":
    unittest.main()
