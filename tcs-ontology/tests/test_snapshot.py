"""Keep public statistics aligned with canonical data and graph deduplication."""
import json
from pathlib import Path
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from ontology import require_valid
from quality import report
from update_snapshot import replace_snapshot, snapshot


class SnapshotTests(unittest.TestCase):
    def test_readme_matches_validated_corpus(self):
        text = (ROOT / "README.md").read_text(encoding="utf-8")
        self.assertEqual(text, replace_snapshot(text, snapshot(require_valid())))

    def test_statistics_match_browser_graph_deduplication(self):
        script = """
const fs=require('node:fs'), graph=require('./map-model.js');
const read=name=>JSON.parse(fs.readFileSync('data/'+name+'.json','utf8')).items;
const primitives=read('primitives'), curated=read('papers'), harvested=read('papers-harvested');
const ids=new Set(primitives.map(p=>p.id));
const a=graph.build(curated,ids), b=graph.build(graph.mergePapers(curated,harvested),ids);
console.log(JSON.stringify({distinct:b.papers.length,curated:a.byPrimitive.size,combined:b.byPrimitive.size}));
"""
        result = subprocess.run(["node", "-e", script], cwd=ROOT,
                                text=True, capture_output=True, check=True)
        graph = json.loads(result.stdout)
        stats = report(require_valid())
        self.assertEqual(stats["distinct_indexed_papers"], graph["distinct"])
        self.assertEqual(stats["paper_coverage"]["curated_primitives"], graph["curated"])
        self.assertEqual(stats["paper_coverage"]["combined_primitives"], graph["combined"])
        self.assertEqual(stats["paper_coverage"]["unlinked_primitives"], stats["total"] - graph["combined"])

    def test_missing_or_duplicate_snapshot_markers_are_rejected(self):
        for text in ("", "<!-- corpus-snapshot:start -->" * 2):
            with self.assertRaises(ValueError):
                replace_snapshot(text, "replacement")
