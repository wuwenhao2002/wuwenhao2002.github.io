"""Harvested corpus integrity and SQLite export contract."""
import sys
import sqlite3
from contextlib import closing
import tempfile
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"tools"))
import ontology
class ImportedBibliographyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data=ontology.require_valid()
    def test_imported_papers_have_explicit_title_only_provenance(self):
        imported=self.data["papers-harvested"]
        self.assertGreaterEqual(len(imported),100)
        for p in imported:
            self.assertEqual(p["review_status"],"title_inferred_unverified")
            self.assertGreaterEqual(len(p["primitives"]),2)
            self.assertTrue(p["url"].startswith("https://"))
    def test_imported_papers_resolve_to_canonical_nodes(self):
        ids={p["id"] for p in self.data["primitives"]}
        for p in self.data["papers-harvested"]:
            self.assertTrue(set(x["primitive_id"] for x in p["primitives"])<=ids)
    def test_sql_export_keeps_curation_and_title_inference_separate(self):
        with tempfile.TemporaryDirectory() as temp:
            path=Path(temp)/"paper-graph.sqlite"
            ontology.export_sqlite(self.data,path)
            with closing(sqlite3.connect(path)) as con:
                a=con.execute("SELECT COUNT(*) FROM paper").fetchone()[0]
                b=con.execute("SELECT COUNT(*) FROM imported_paper").fetchone()[0]
                self.assertEqual(a,len(self.data["papers"]))
                self.assertEqual(b,len(self.data["papers-harvested"]))
                self.assertEqual(con.execute("PRAGMA foreign_key_check").fetchall(),[])
if __name__=="__main__":unittest.main()

