# TCS Ontology

**A typed catalog of theoretical computer science primitives and a research-question composer.**

[Open the interactive atlas](https://wuwenhao2002.github.io/tcs-ontology/) · [Open the floating primitive map](https://wuwenhao2002.github.io/tcs-ontology/map.html) · [GitHub source directory](https://github.com/wuwenhao2002/wuwenhao2002.github.io/tree/main/tcs-ontology)

> **Status: versioned, partially editorially source-checked seed (v0.6).** The catalog is *not comprehensive* or expert-verified. Generated combinations are candidate research directions, **not certified open problems, verified mathematical questions, or evidence of novelty**.

## What it does

**v0.6:** paper-driven AND-filter research graph with multi-selection, verified-vs-unreviewed paper filters, and bibliography export. See [docs/PAPER_GRAPH.md](docs/PAPER_GRAPH.md).

**v0.3:** interactive [Primitive Universe](./map.html), structured paper-primitive role indexing, and research lenses (prediction, privacy, sensitivity, stability). See [docs/PAPER_COMBINATIONS.md](docs/PAPER_COMBINATIONS.md) for the curated paper sample and its limitations.

- Browse, filter, search and export TCS primitives across 19 areas, including algorithmic game theory, mechanism design, graph algorithms, approximation, complexity, online/distributed algorithms, learning theory, cryptography, scheduling, streaming, and quantum computing.
- Each primitive has a stable ID, `kind`, `areas`, aliases, a definition when available, a review state, and source pointers when available.
- Follow typed directional relations (`is_a`, `subset_of`, `studied_on`, etc.).
- Compose candidate questions using **typed templates** rather than arbitrarily joining words. Example: **Price of Anarchy × First-Price Auction × Bayesian Nash Equilibrium**.
- Inspect **scoped related literature pointers** (never assume an unlinked combination is unexplored).
- Save draft ideas in browser local storage and export them as JSON.

### Architecture

This is a **static, Git-friendly knowledge database**. Canonical data is kept in reviewable JSON; the website reads it without a server, tracking, logins, or API keys. A Python standard-library tool validates the data, queries it, generates combinations, and exports a relational **SQLite** database. The SQLite file is a generated artifact; JSON files remain the source of truth.

```text
tcs-ontology/
├── index.html            # Static exploration and composition UI
├── map.html              # Floating interactive map
├── map.js                # Canvas multi-selection and paper intersection UI
├── map-model.js          # Pure tested paper-membership index
├── map.css               # Responsive map styling
├── styles.css            # Responsive interface
├── app.js                # Browser-only client
├── data/
│   ├── primitives.json   # Typed primitive nodes
│   ├── relationships.json# Directed conceptual edges
│   ├── rules.json        # Typed composition templates
│   ├── literature.json   # Carefully scoped evidence pointers
│   ├── sources.json      # Literature & external resource registry\n│   ├── redirects.json    # Canonical ID redirects\n│   ├── results.json      # Scope-limited source-checked results
│   ├── papers.json       # Editorially linked papers
│   ├── papers-harvested.json # Unreviewed title-inferred bibliography
│   └── papers-rejected.json # Exclusion/audit registry
├── schema/
│   └── primitive.schema.json
├── tools/
│   ├── ontology.py       # Validate/search/compose/export SQLite\n│   └── quality.py        # Deep referential and editorial quality audit
└── tests/
    ├── test_ontology.py\n    └── test_quality.py
```

## Quick start

For web browsing, visit the published site or run a local HTTP server from the project folder:

```bash
cd tcs-ontology
python3 -m http.server 8000
# Visit http://localhost:8000/
```

Browsers generally block `fetch()` for local `file://` pages: use an HTTP server.

For research workflows and AI:

```bash
python3 tools/ontology.py validate
python3 tools/ontology.py stats\npython3 tools/ontology.py quality
python3 tools/ontology.py search "Price of Anarchy"
python3 tools/ontology.py search "vertex cover" --kind problem
python3 tools/ontology.py compose equilibrium-efficiency --limit 10\n# To include tentative candidate vocabulary:\npython3 tools/ontology.py compose graph-problem-classes --include-candidates --limit 10
python3 tools/ontology.py sqlite --output ./tcs-ontology.sqlite
python3 -m unittest discover -s tests -v
```

Query SQLite with any standard SQL tool:

```sql
SELECT p.name, p.kind, a.area
FROM primitive AS p JOIN primitive_area AS a ON a.primitive_id = p.id
WHERE p.name LIKE '%Anarchy%';

SELECT p.name AS concept, r.predicate, q.name AS related
FROM relationship AS r
JOIN primitive AS p ON p.id = r.source_id
JOIN primitive AS q ON q.id = r.target_id
WHERE p.id = 'game.congestion-game' OR q.id = 'game.congestion-game';
```

You can also directly fetch the JSON files from the static site:

```
https://wuwenhao2002.github.io/tcs-ontology/data/primitives.json
https://wuwenhao2002.github.io/tcs-ontology/data/relationships.json
https://wuwenhao2002.github.io/tcs-ontology/data/rules.json
```

## Modeling

A **primitive** is a reusable TCS entity, such as a game, auction, equilibrium concept, property, graph class, computational problem, model, assumption, method, objective, complexity class, task, or framework. `id` uses `kind.slug-name`.

A **relationship** links existing IDs. Edges can encode containment and softer methodological relationships; no automatic logical entailments are asserted.

A **composition rule** declares slots with ID, type and area restrictions. `template` uses named placeholders matching its slots. A generated tuple is a **candidate question**; its model validity and literature status must be evaluated separately.

A **literature** entry optionally connects an exact tuple of rule/slot IDs to a bibliographic source and a specific scope note. The current seed contains pointers to *related literature*, rather than theorem-level claims.

### Important distinctions

| Status | Meaning |
| --- | --- |
| `needs_definition` | Collected seed concept, definition still pending |
| `seeded_definition_unverified` | Initial editorial definition, needs expert checking |
| `source_checked` | Definition and scope editorially checked against linked reference, but **not peer-reviewed** |\n| `expert_reviewed` | Reserved for a formally expert-reviewed entry (none asserted in v0.2) |
| `related_literature` | Related paper linked with a narrow scope; not a complete state-of-the-art review |
| No literature link | **Unknown / unreviewed**, never automatically called an open problem |

### Why typed combinations?

"Price of Anarchy in First-Price Auction" alone is underspecified. A meaningful formal question needs an equilibrium notion (e.g., Bayesian Nash equilibrium), valuation and information assumptions, welfare objective, and existence conditions. The composer highlights these missing requirements rather than claiming to solve or certify them.

## Contributing primitives

1. Open a pull request editing the smallest necessary JSON entry.
2. Preserve stable IDs and avoid duplicate synonyms; use `aliases` for alternate names.
3. Supply a mathematically precise definition with assumptions, nontrivial contextual distinctions, and a primary publication/standard reference if possible.
4. Specify whether a relationship is logically strict (`is_a`, `subset_of`) or a soft association.
5. If attaching a result, record **the exact theorem conditions**, objective, equilibrium concept, provenance URL, and whether it is a verified theorem or only related background literature.
6. Run `python3 tools/ontology.py validate` and the unittest suite before requesting review.

Do not import entire proprietary datasets, scraped articles, or copyrighted glossary content without verifying terms, attribution, and reuse rights. The external URLs currently serve as **references and future ingestion candidates**; their datasets have not been imported.

## Possible next milestones

- Theorem-level result schema with quantified assumptions, verification and citation provenance.
- Deduplication, synonym normalization, relation taxonomies, and cross-domain identity mapping.
- Scholar/OpenAlex ingestion with source licensing/provenance and human review.
- Search-backed literature audit for each generated tuple; report `known`, `uncertain`, `inapplicable`, or `open_with_source` only with actual evidence.
- MCP/API layer and vector retrieval for research agents.
- Separate standalone repository and automated data quality CI.

## v0.2 review status

The preceding v0.2 catalog contained **588 canonical primitives**, with a **177-entry editorially source-checked core** and **411 entries awaiting review or definitions**, across 19 areas. These are finite editorial snapshots, not a completeness claim. It records 42 typed relations, six scoped result statements, and ten backward-compatible redirects. These values should be regenerated using `python3 tools/ontology.py quality` rather than maintained manually in downstream projects.

The UI initially displays only `source_checked` entries and allows explicitly toggling candidates. Names and IDs from v0.1 are resolved through `data/redirects.json`. Core scientific safeguards include not applying unweighted finite Rosenthal equilibrium guarantees to weighted congestion games, distinguishing single-item auctions from multi-item compositions, and explicitly specifying equilibrium notion and cost versus welfare objectives in efficiency questions.

A **source-checked statement is not a formal proof checker or expert endorsement**: read its premises, original citation, and scope note. References of different authority (primary paper, textbook, lecture note) are typed in `sources.json`. An empty literature association is `unknown`, never `open`.

Read `docs/DATA_GOVERNANCE.md` for curation and review policy, `CONTRIBUTING.md` for review requirements, and `CHANGELOG.md` for versioned releases.

## Acknowledgments and inspiration

- [Computer Science Ontology](https://cso.kmi.open.ac.uk/)
- [OpenAlex Keywords](https://help.openalex.org/data/keywords/)
- [Information System on Graph Classes and their Inclusions](https://www.graphclasses.org/)
- [Scheduling Zoo](https://schedulingzoo.lip6.fr/)
- [Complexity Zoo](https://complexityzoo.net/Complexity_Zoo)
- [NIST DADS](https://xlinux.nist.gov/dads/)

These are inspiration / future ingestion sources, **not** assumed sources for each editorial entry.

## Hosting and ownership

Currently located inside the existing `wuwenhao2002/wuwenhao2002.github.io` site repository, under the isolated `tcs-ontology/` folder, because the connected GitHub integration does not expose a repository-creation operation. A standalone repository can be created later and this directory moved intact. The existing website root files have not been modified.


### Paper-driven Graph (v0.6)

The map now uses **only papers as edges**. Click several primitives to take the AND-intersection of their paper membership sets; mint-highlighted nodes co-occur in at least one of those papers. The right bibliography distinguishes manually mapped scholarly papers from title-derived, explicitly unreviewed Crossref metadata. No trend charts, novelty predictions, or semantic-similarity claims are calculated.

The v0.4 baseline contained 649 canonical primitives, 43 editorial papers and 130 conservatively screened title-inferred papers. The v0.6 snapshot adds a substantial official-abstract-checked set; regenerate current counts from the JSON source or `python3 tools/ontology.py quality`. Regenerate these counts from JSON after later updates; they are not completeness claims.


## 2025–2026 breadth-first curation

Latest campaign: 2025–26 FOCS/STOC program paper metadata and selected STOC abstract checks, adding diverse reusable lenses beyond Prediction and Sensitivity. Each paper record retains title, authors, conference, evidence-level tag and source; the map's graph remains an exact co-occurrence index. See [curation rationale](docs/RESEARCH_DISCOVERY_V06.md).
