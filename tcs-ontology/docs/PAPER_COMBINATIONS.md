# TCS Ontology v0.3 — Paper-driven Ontology and Interactive Primitive Universe

The v0.3 update prioritizes cross-cutting research lenses rather than unqualified bulk term counts.

## New ontology design

- **Lens** is now an explicit typed primitive distinct from model, mathematical property, algorithm, and research task. Examples: Prediction Lens, Differential Privacy Lens, Algorithmic Sensitivity, Algorithmic Stability, Fault Tolerance, Replicability.
- Prediction models (point, distributional, portfolio) and prediction quality measures (robustness, consistency, error) are distinct nodes.
- Algorithmic output sensitivity, pointwise Lipschitz continuity and DP query sensitivity are **different** technical concepts.
- Privacy variants are distinct by graph adjacency and trust model (edge, node, edge weight, local edge).
- Each new source-checked primitive has original editorial definition, assumptions and a linked research source; source-check status does **not** mean expert-reviewed.

## Evidence index

\`data/papers.json\` captures a selective, explicitly nonexhaustive research-paper sample, and each record specifies:
\`id,title,year,venue,authors,status,source_id,scope_note,primitives: [{primitive_id,role}]\`.
The \`role\` is one of \`problem,lens,model,metric,technique,assumption,task\`. This structure supports many-to-many scientific combinations and reproducible visual connections without implying novelty from missing papers.

The reviewed set includes recent work highlighted by Michael Dinitz and Yuichi Yoshida: learning-augmented ski rental and binary search, graph-cut and distance privacy, and matching, geometry, graph stability and online regret through sensitivity. Publication labels reflect editorial checks and must be revalidated against official venue records before reuse as bibliographic ground truth.

## Interactive map

Open \`map.html\` or use the "Primitive Map" entry in the main atlas. The Canvas map:
- Renders **every** canonical primitive as an individual selectable node, colored by review status and research lens category.
- Places concepts into deterministic research-area clusters. This is a **categorical layout**, not t-SNE/UMAP or scientifically validated semantic embeddings.
- Uses gentle optional sinusoidal motion. Users can pause motion; OS reduced-motion preference suppresses it automatically.
- Offers wheel/keyboard zoom, pointer drag, fit/reset, hover labels, click details, term/area/status search, keyboard-friendly selection list.
- Shows explicit source-linked relationships plus co-occurrence in indexed papers for selected nodes. It never invents unrelated graph edges.
- Adds paper title, venue/status context and precise semantic role in concept detail.

## Validation and maintainability

- JSON references and composition templates are checked against the canonical primitive ID set.
- Paper-to-source and paper-to-primitive references, duplicated edges, unknown roles, and unscoped paper records fail validation.
- SQLite export includes normalized paper and paper_primitive tables, with enforced foreign keys.
- Map HTML/JS contract tests check element IDs and anti-HTML-injection usage.
- The original atlas retains searchable catalog and composer; links to map and paper index are provided.

## Limitations

The paper index is curated, not a systematic literature review; absence of paper relations is **not** evidence of an open problem. Formal mathematical theorem conditions remain to be extracted. No automatic novelty, relevance, or completeness certification is attempted.


## Author metadata and provenance

`featured_researchers` is the subset of people used to select papers for the sample. `authors` is a verified complete author list only where `authors_completeness` is `verified_from_arxiv`; otherwise `authors` is intentionally empty rather than misleadingly abbreviated. Publication metadata should be checked against original venue pages, not inferred solely from the preprint submission year.

Several selected paper abstracts have been independently opened and checked, and short statements have been entered in `data/results.json` with the exact perturbation / model scope. These are still *editorial source-checked statements*, not machine-verified theorems.
