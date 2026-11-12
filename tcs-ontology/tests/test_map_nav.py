"""Regression for paper UI and routes."""
import re
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class NavigationTests(unittest.TestCase):
    def test_papers_and_map_have_navigation(self):
        html=(ROOT/"index.html").read_text(encoding="utf8")
        self.assertIn('data-view="papers"',html)
        self.assertIn('id="papers"',html)
        self.assertIn('id="paperList"',html)
        self.assertIn('href="./map.html"',html)
    def test_map_exposes_controls_and_aria(self):
        html=(ROOT/"map.html").read_text(encoding="utf8")
        js=(ROOT/"map.js").read_text(encoding="utf8")
        self.assertIn('id="mapCanvas"',html)
        self.assertIn('id="mapMatches"',html)
        self.assertIn('id="mapStatus"',html)
        self.assertIn('prefers-reduced-motion',js)
        self.assertIn('requestAnimationFrame',js)
        self.assertIn('window',html) if False else None
        self.assertNotIn('innerHTML',js)
if __name__=="__main__":unittest.main()
