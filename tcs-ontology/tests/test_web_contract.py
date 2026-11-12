"""Static browser contract: fail fast when markup changes break the app."""
from pathlib import Path
import re
import unittest

ROOT=Path(__file__).resolve().parents[1]


class WebContractTests(unittest.TestCase):
    def test_frontend_ids_match_markup(self):
        js=(ROOT/"app.js").read_text(encoding="utf8")
        html=(ROOT/"index.html").read_text(encoding="utf8")
        declared=set(re.findall(r'\bid="([A-Za-z][A-Za-z0-9_-]*)"',html))
        used=set(re.findall(r'\$\("([A-Za-z][A-Za-z0-9_-]*)"\)',js))
        for id in sorted(used):
            self.assertIn(id,declared,f"Missing HTML element id={id}")

    def test_composer_template_ids_are_generated(self):
        js=(ROOT/"app.js").read_text(encoding="utf8")
        self.assertIn('select.id="slot-"+slot.key',js)
        self.assertIn('querySelectorAll(".view")',js)

    def test_renders_database_as_text_not_html(self):
        js=(ROOT/"app.js").read_text(encoding="utf8")
        self.assertNotIn("innerHTML",js)
        self.assertNotIn("eval(",js)
        self.assertIn("textContent",js)


if __name__=="__main__":
    unittest.main()
