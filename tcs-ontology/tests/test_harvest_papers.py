"""No-network regression tests for DBLP title extraction and conservative co-mentions."""
import sys
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"tools"))
import harvest_papers as h
class HarvestTests(unittest.TestCase):
    def setUp(self):self.valid=set(h.PATTERNS)
    def test_normalize_title(self):
        self.assertEqual(h.normalize_title(" A--B: C! "),"a b c")
    def test_two_explicit_terms_required(self):
        p={"title":"Binary Search with Distributional Predictions","year":2024,"authors":["Researcher"],"id":"dblp:x","url":"https://dblp.org/rec/x"}
        refs=h.annotate(p,self.valid)
        self.assertIsNotNone(refs)
        ids={x["primitive_id"] for x in refs["primitives"]}
        self.assertIn("problem.binary-search",ids)
        self.assertIn("model.distributional-prediction",ids)
        self.assertEqual(refs["review_status"],"title_inferred_unverified")
        self.assertIsNone(h.annotate({**p,"title":"Graph Algorithms"},self.valid))
    def test_matching_is_not_maximal_matching(self):
        p={"title":"Fast Maximal Matching with Predictions"}
        refs=h.annotate(p,self.valid)
        self.assertIsNotNone(refs)
        self.assertNotIn("problem.maximum-matching",{v["primitive_id"] for v in refs["primitives"]})
    def test_private_cut_explicit(self):
        p={"title":"Differentially Private Algorithms for Minimum k-Cut"}
        refs=h.annotate(p,self.valid)
        self.assertIn("lens.differential-privacy",{v["primitive_id"] for v in refs["primitives"]})
        self.assertIn("problem.minimum-k-cut",{v["primitive_id"] for v in refs["primitives"]})
    def test_random_unrelated_keyword_not_inferred(self):
        p={"title":"Learning an Efficient Algorithm for High Dimensional Graphs"}
        self.assertIsNone(h.annotate(p,self.valid))
if __name__=="__main__":unittest.main()
