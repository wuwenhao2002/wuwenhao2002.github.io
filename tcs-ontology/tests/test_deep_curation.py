"""Data-curation integrity for v0.5 source-checked paper annotations."""
from pathlib import Path
import json,unittest
ROOT=Path(__file__).resolve().parents[1]
def data(name):
    return json.loads((ROOT/"data"/(name+".json")).read_text(encoding="utf8"))["items"]
class DeepCurationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.prim=data("primitives");cls.papers=data("papers");cls.sources=data("sources")
        cls.ids={p["id"] for p in cls.prim}
        cls.srcids={s["id"] for s in cls.sources}
    def test_direct_and_source_links(self):
        rich=[p for p in self.papers if p.get("review_status")=="editorial_abstract_checked"]
        self.assertGreaterEqual(len(rich),35)
        direct=0
        for p in rich:
            self.assertTrue(p.get("authors"))
            self.assertIn(p["source_id"],self.srcids)
            self.assertTrue(p.get("scope_note"))
            self.assertTrue(p.get("venue"))
            self.assertTrue(p.get("url","").startswith("https://"))
            direct+=int("doi.org/" in p["url"] or "proceedings." in p["url"] or "openreview.net/" in p["url"])
            for rel in p["primitives"]:
                self.assertIn(rel["primitive_id"],self.ids)
                self.assertIn(rel["role"],{"problem","model","lens","metric","technique","task","assumption"})
                self.assertEqual(rel.get("evidence"),"official_abstract")
                self.assertTrue(rel.get("note"))
        self.assertGreaterEqual(direct,25)
    def test_mathematically_distinct_sensitivity_measures(self):
        for concept in [
            "lens.algorithmic-sensitivity",
            "property.average-algorithmic-sensitivity",
            "property.worst-case-algorithmic-sensitivity",
            "property.global-dp-sensitivity",
            "property.local-dp-sensitivity",
            "property.noise-stability",
        ]:
            self.assertIn(concept,self.ids)
    def test_no_duplicate_normalized_primitive_name(self):
        pairs=[(p["kind"],p["name"].casefold().strip()) for p in self.prim]
        self.assertEqual(len(pairs),len(set(pairs)))
    def test_new_papers_link_to_individual_primitives(self):
        added=[p for p in self.papers if p["id"].startswith("verified-")]
        self.assertGreaterEqual(len(added),35)
        self.assertGreater(sum(len(p["primitives"]) for p in added),105)
if __name__=="__main__":unittest.main()
