# Paper-driven Research Graph

## Primary definition

Two primitives are **paper-linked** exactly when at least one indexed paper record explicitly lists both canonical IDs. A multi-primitive selection (S) returns the intersection of membership sets:

```text
MatchingPapers(S) = intersection_{primitive in S} PapersTaggedWith(primitive)
Related(S) = union of primitive IDs in MatchingPapers(S), minus S
```

No cosine similarity, knowledge-graph edges, proximity on the canvas, or language-model guesses are used in this relationship. The graph map is only a spatial index. Its positions group primary research areas and include optional gentle drift; distance is not a mathematical similarity score.

## Evidence tiers

**Editorially linked / Curated** (`data/papers.json`): bibliographic entries manually associated with primitive roles from a researcher publication page, title, and when available the official abstract. This is not peer-reviewed extraction of theorems.

**Title-inferred / Unreviewed** (`data/papers-harvested.json`): metadata sourced from Crossref or DBLP. A conservative lexical matcher attaches canonical IDs from explicit title phrases; it has not read or verified the paper's methods, results, or technical meaning. The map exposes an evidence-level toggle and labels these papers conspicuously. Co-occurrence in this layer is a **candidate co-occurrence**, not independently verified proof that both primitives were studied.

**Rejected title candidates** (`data/papers-rejected.json`): exclusions of non-TCS applications, spurious matching terminology, mismatched prediction robustness or general sensitivity, and ambiguous single-label cases. Keep this list to prevent false pairs being silently reintroduced.

The visualization defaults to the curated tier. Choose Both layers explicitly to include title-inferred candidates; this expands discovery without upgrading their evidence status. Do not claim a research topic is open because the paper list is empty.

## UI semantics

- Click a floating node once to **add** it; click again or remove its gold chip to deselect.
- Selected nodes are gold; candidate neighbors are mint; other nodes are muted.
- The right panel lists papers tagged with **all** selected primitives; more selections monotonically shrink (or preserve) the list.
- Each paper row contains title, authors when available, year, venue, link, evidence status, and other primitive tags that can be clicked to extend the selection.
- Use Search to locate nodes, Area to navigate clusters, and evidence dropdown to choose whether to include automatic title tags.
- Zoom and pan with the mouse or keyboard; press Escape to clear selection.
- Export the currently matched paper records and selected IDs as JSON.
- Reduced-motion settings are respected. Nothing requires an external graph-rendering service.

## Shareable views

The address retains selected canonical IDs, primitive search, area/review filters, paper evidence tier, bibliography search and focus mode. Reloading a copied link restores those controls; old primitive links remain supported. Paper-search counts and the canvas summary refer to the same filtered bibliography. Selection uses keyboard-accessible buttons with explicit pressed states.

## Data model and SQLite

Canonical paper membership:

```json
{
  "id": "paper-identifier",
  "title": "Publication title",
  "year": 2026,
  "venue": "STOC 2026",
  "authors": ["Author A", "Author B"],
  "review_status": "title_inferred_unverified",
  "primitives": [
    {"primitive_id": "lens.prediction", "role": "lens", "evidence": "title_exact_phrase"},
    {"primitive_id": "problem.ski-rental", "role": "problem", "evidence": "title_exact_phrase"}
  ]
}
```

In exported SQLite, editorial papers are stored in `paper` / `paper_primitive`; title-inferred records are stored in `imported_paper` / `imported_paper_primitive`. Do not merge evidence levels in production SQL without an explicit status field.

## Refreshing the bibliography

The metadata source API is rate-limited: DBLP requests were blocked from the CI environment in the first attempt. Crossref supplied a smaller, usable alternative corpus. To keep source maintenance safe:

```bash
cd tcs-ontology
python3 tools/harvest_crossref.py --output data/papers-proposed.json --limit 3500
python3 tools/screen_papers.py --input data/papers-proposed.json
python3 tools/ontology.py validate
python3 tools/ontology.py quality
python3 -m unittest discover -s tests -v
node --test tests/*.cjs
```

A manual, opt-in GitHub workflow can generate a **review branch and pull request**. No scheduled import silently alters the curated corpus. Each proposed record requires title/venue inspection, and ambiguous links require full-text confirmation before promoting their evidence status.

## Scientific limitations

The current pipeline is title-first and intentionally conservative. A paper often studies many primitives that do not appear literally in its title: these cannot be inferred reliably from metadata alone. A full-text or abstract annotation workflow with per-link evidence snippets and expert review would substantially improve recall. Dates, venues, and author metadata must be checked against the original publisher before used in a formal citation.

