"""Regression tests for the graph visualization and paper-to-primitive evidence model."""
import json
from pathlib import Path
import re
import sqlite3
import subprocess
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"data"

def load(name):
    return json.loads((DATA/(name+".json")).read_text(encoding="utf8"))["items"]

class MapAndPapersTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.primitives=load("primitives")
        cls.papers=load("papers")
        cls.sources={s["id"] for s in load("sources")}
        cls.primitive_ids={p["id"] for p in cls.primitives}
    def test_paper_citations_exist(self):
        self.assertGreaterEqual(len(self.papers),12)
        for paper in self.papers:
            self.assertIn(paper["source_id"],self.sources)
            self.assertTrue(paper["scope_note"])
            self.assertTrue(paper["venue"])
            self.assertTrue(paper["primitives"])
            self.assertEqual(len({x["primitive_id"] for x in paper["primitives"]}),len(paper["primitives"]))
            for link in paper["primitives"]:
                self.assertIn(link["primitive_id"],self.primitive_ids)
    def test_crosscutting_lenses_present(self):
        ids={p["id"] for p in self.primitives}
        for expected in ["lens.prediction","lens.differential-privacy","lens.algorithmic-sensitivity",
                         "property.average-algorithmic-sensitivity","model.edge-differential-privacy"]:
            self.assertIn(expected,ids)
    def test_papers_cover_requested_themes(self):
        def topics(paper):
            return {ref["primitive_id"] for ref in paper["primitives"]}
        self.assertTrue(any("lens.prediction" in topics(p) for p in self.papers if "dinitz" in p["id"]))
        self.assertTrue(any("lens.differential-privacy" in topics(p) for p in self.papers if "dinitz" in p["id"]))
        self.assertTrue(any("lens.algorithmic-sensitivity" in topics(p) for p in self.papers if "yoshida" in p["id"]))
    def test_map_is_full_node_canvas_not_static_image(self):
        html=(ROOT/"map.html").read_text(encoding="utf8")
        js=(ROOT/"map.js").read_text(encoding="utf8")
        self.assertIn('<canvas id="mapCanvas"',html)
        self.assertIn('state.items.map',js)
        self.assertIn('pointerup',js)
        self.assertIn('source',js)
        self.assertNotIn("innerHTML",js)
        self.assertNotIn("eval(",js)
        self.assertIn('prefers-reduced-motion',js)
        self.assertIn('state.nodes.length',js)
        used=set(re.findall(r'\$\("([A-Za-z][A-Za-z0-9_-]*)"\)',js))
        declared=set(re.findall(r'\bid="([A-Za-z][A-Za-z0-9_-]*)"',html))
        self.assertFalse(used-declared, "Missing map HTML IDs: "+", ".join(sorted(used-declared)))
    def test_sqlite_exports_papers(self):
        with tempfile.TemporaryDirectory() as d:
            import sys
            sys.path.insert(0,str(ROOT/"tools"))
            import ontology
            db=ontology.require_valid()
            output=Path(d)/"test.sqlite"
            ontology.export_sqlite(db,output)
            with sqlite3.connect(output) as conn:
                self.assertFalse(conn.execute("PRAGMA foreign_key_check").fetchall())
                self.assertEqual(conn.execute("SELECT COUNT(*) FROM paper").fetchone()[0],len(self.papers))
                self.assertGreater(conn.execute("SELECT COUNT(*) FROM paper_primitive").fetchone()[0],35)

if __name__=="__main__":
    unittest.main()
