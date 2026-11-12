"""Breadth, provenance and scope regression tests for the 2025-26 discovery campaign."""
from pathlib import Path
import json, unittest
ROOT=Path(__file__).resolve().parents[1]
def rows(name):
    return json.loads((ROOT/"data"/(name+".json")).read_text(encoding="utf8"))["items"]
class ResearchDiscoveryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.primitives=rows("primitives")
        cls.papers=rows("papers")
        cls.sources={x["id"]:x for x in rows("sources")}
        cls.ids={p["id"] for p in cls.primitives}
    def test_diverse_research_lenses_have_unique_ids_and_sources(self):
        concepts=[
            "lens.dynamic-maintenance","lens.adversarially-robust-streaming",
            "lens.coreset-compression","lens.parameterized-tractability",
            "lens.local-computation","lens.instance-adaptivity","lens.space-time-tradeoffs",
            "lens.calibration-constraints","lens.derandomization","lens.smoothed-analysis",
            "lens.meta-complexity","lens.secure-distributed-communication",
        ]
        self.assertTrue(set(concepts)<=self.ids)
        for p in self.primitives:
            if p["id"] in concepts:
                self.assertTrue(p["definition"])
                self.assertTrue(p["scope_note"])
                self.assertTrue(p["source_ids"])
                self.assertTrue(all(ref in self.sources for ref in p["source_ids"]))
    def test_not_overfocused_on_original_lenses(self):
        new=[p for p in self.papers if p["id"].startswith(("program-","reviewed-stoc-","conference2025-"))]
        self.assertGreaterEqual(len(new),50)
        labels={t["primitive_id"] for p in new for t in p["primitives"]}
        for expected in [
            "lens.dynamic-maintenance","lens.space-time-tradeoffs",
            "lens.parameterized-tractability","technique.coreset",
            "property.multicalibration","model.semi-streaming",
            "technique.padded-decomposition","lens.fine-grained-hardness",
        ]:
            self.assertIn(expected,labels)
        self.assertGreaterEqual(len(labels),50)
    def test_provenance_levels_not_conflated(self):
        selected=[p for p in self.papers if p["id"].startswith(("program-","reviewed-stoc-","conference2025-"))]
        for p in selected:
            self.assertIn(p["review_status"],{"editorial_metadata_checked","editorial_abstract_checked"})
            self.assertTrue(p["authors"] and p["source_id"] in self.sources)
            self.assertTrue(p["url"].startswith("https://"))
            self.assertGreaterEqual(len(p["primitives"]),2)
            for relation in p["primitives"]:
                self.assertIn(relation["primitive_id"],self.ids)
                self.assertTrue(relation.get("note"))
                self.assertEqual(relation.get("evidence"),"official_abstract" if p["review_status"]=="editorial_abstract_checked" else "official_title")
    def test_scope_corrections_are_preserved(self):
        by={p["id"]:p for p in self.papers}
        checks=[
          ("program-focs-private-test","problem.graph-property-testing"),
          ("program-focs-local-node","model.local-edge-differential-privacy"),
          ("program-focs-isomorphic","problem.graph-isomorphism"),
          ("program-focs-geometry-ptas","lens.parameterized-tractability"),
          ("program-focs-flow-nearlinear","graph_class.complete-graph"),
          ("program-focs-space-tsp","property.streaming-space-complexity"),
          ("reviewed-stoc-proximal","game.bayesian-game"),
          ("reviewed-stoc-fine-grained-binpack","problem.online-bin-packing"),
        ]
        for paper,forbidden in checks:
            self.assertIn(paper,by)
            tags={r["primitive_id"] for r in by[paper]["primitives"]}
            self.assertNotIn(forbidden,tags)
    def test_research_graph_uses_official_paper_edges_only(self):
        from itertools import combinations
        new=[p for p in self.papers if p["id"].startswith("program-focs")]
        self.assertGreaterEqual(len(new),20)
        for paper in new:
            terms=[x["primitive_id"] for x in paper["primitives"]]
            self.assertEqual(len(set(terms)),len(terms))
            for a,b in combinations(terms,2):
                self.assertIn(a,self.ids)
                self.assertIn(b,self.ids)
    def test_quick_start_lenses_exist_and_are_not_only_prediction_sensitivity(self):
        html=(ROOT/"map.html").read_text(encoding="utf8")
        import re
        names=re.findall(r'data-primitive="([^"]+)"',html)
        self.assertGreaterEqual(len(names),10)
        self.assertTrue(all(x in self.ids for x in names))
        self.assertIn("lens.coreset-compression",names)
        self.assertIn("lens.dynamic-maintenance",names)
        self.assertIn("lens.calibration-constraints",names)
if __name__=="__main__":unittest.main()
