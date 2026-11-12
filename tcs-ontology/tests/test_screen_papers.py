"""Reject ambiguous title-derived tags while preserving audit provenance."""
import sys
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"tools"))
from screen_papers import screen
def sample(title,refs):
    return {"id":"crossref:test","title":title,"year":2025,
            "primitives":[{"primitive_id":id,"role":"metric","evidence":"title_exact_phrase"} for id in refs]}
class ScreeningTests(unittest.TestCase):
    def test_prediction_robustness_requires_prediction_context(self):
        p=sample("Robust Graph Matching",["property.prediction-robustness","problem.graph-matching"])
        out,reason=screen(p,set())
        self.assertIsNone(out)
        self.assertTrue(reason)
    def test_learning_augmented_robustness_is_relevant(self):
        p=sample("Robust Learning-Augmented Ski Rental",["property.prediction-robustness","problem.ski-rental"])
        out,_=screen(p,set())
        self.assertEqual(len(out["primitives"]),2)
    def test_matching_polynomials_not_matching_algorithm(self):
        p=sample("Maximal Matching Polynomials of Aromatic Molecules",
                 ["problem.maximal-matching","problem.graph-matching"])
        self.assertIsNone(screen(p,set())[0])
    def test_known_exclusions_stay_excluded(self):
        p=sample("Learning-Augmented Matching",["lens.prediction","problem.graph-matching"])
        self.assertIsNone(screen(p,{"crossref:test"})[0])
    def test_title_labels_never_upgraded_to_reviewed(self):
        p=sample("Prediction for Minimum k-Cut",["lens.prediction","problem.minimum-k-cut"])
        out,_=screen(p,set())
        self.assertEqual(out["review_status"],"title_inferred_unverified")
if __name__=="__main__":unittest.main()
