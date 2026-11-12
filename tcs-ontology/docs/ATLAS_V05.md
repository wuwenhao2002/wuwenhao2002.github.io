# Research Atlas v0.5: source-checked combinations and visual redesign

## Interaction and visual direction

This version replaces the sparse scatterplot appearance with a deliberate scientific dashboard: three-pane research workstation, navy/mint/amber color system, orbital halos, glowing nodes, a bounded collision-avoiding labeling system, evidence badges, upgraded paper cards and a responsive small-screen layout.

The **full atlas mode** places all canonical primitives by their primary research field in a stable compact grid. Distances in this overview are *categorical design*, not embedding similarity.

In **focus mode**, selecting one or more primitives places selected nodes around the center and **only primitive nodes sharing at least one paper that contains every selected item** in surrounding rings. The rings are a visualization of an exact inverted-index co-occurrence intersection, not a model of closeness or proof strength. Paper counts affect which related nodes appear earlier in the orbit, but no scientific claims are derived from position.

Users can click to select or deselect, remove selection chips, zoom/pan with wheel/mouse or keyboard, pause drift, disable focus layout, search by primitive name/alias, filter by research area/status, select a quick cross-cutting research lens, filter source evidence and export matched papers as JSON. Reduced-motion OS settings are honored.

### Formal paper graph semantics

For paper index P, selected primitive IDs S, and primitive membership Tags(p):

    Matches(S) = {p in P : S subseteq Tags(p)}
    Related(S) = (union_{p in Matches(S)} Tags(p)) minus S

There is **no inferred edge** merely because two concepts are geometrically adjacent or synonyms.

### Data evidence tiers

- \`editorial_abstract_checked\`: selected from a researcher's official publications/abstract or primary publisher page. Each newly checked paper includes authors, venue, year, source registry reference and per-concept evidence note. This is **editorial abstract checking**, not full-text review or mathematical verification.
- \`editorial_metadata_checked\`: earlier manually linked paper records, some with title-only context or generic bibliography pages; individual paper-specific links have been upgraded when verified.
- \`title_inferred_unverified\`: Crossref/DBLP metadata automatically mapped from explicit title phrases. These have **not** had their mathematical content checked, and some false associations may remain. See \`papers-rejected.json\` for removed false matches.

Do not promote a paper from title-inferred to abstract-checked without checking its actual research topic, assumptions and concept roles.

### Primary curation areas

**Algorithmic sensitivity and stability:** maximum matching, randomized Gibbs sampling, knapsack, dynamic programming, maximum-weight chain, clustering, geometric problems, stability of machine learning, offline-to-online transformations and random-order regret.

**Differential privacy and graph algorithms:** graph cuts, densest subgraph, shortest path release, cut sparsification, Euclidean private spanning trees, continual releases and privacy amplification.

**Predictions / learning augmentation:** distribution-valued predictions in binary search and ski rental, online matching, fractional matching, learned duals, caching and nonclairvoyant scheduling.

**Graph/network design:** spanner lightness, fault budget, graph emulators, spectral hypergraph sparsification, effective resistance and survivable connectivity.

Paper tags are many-to-many, with explicit \`problem\`, \`model\`, \`lens\`, \`metric\`, \`technique\`, \`task\` and \`assumption\` roles. More specific physical/mathematical variants have separate primitive IDs.

### Quality checks

\`\`\`bash
cd tcs-ontology
python3 tools/ontology.py validate
python3 tools/ontology.py quality
python3 -m unittest discover -s tests -v
node --test tests/test_graph.cjs tests/test_graph_corpus.cjs
\`\`\`

Browser test, on machine with Chromium and Python Playwright:

\`\`\`bash
python3 -m pip install playwright==1.56.0
python3 -m playwright install chromium
python3 -m http.server --directory tcs-ontology 8765 &
python3 tcs-ontology/tests/visual_smoke.py
\`\`\`

The optional GitHub workflow \`tcs-map-visual-smoke.yml\` generates 1600px desktop and 390px mobile screenshots and checks selection, paper intersection, and empty-state transitions in real Chromium.

### Provenance limitations

A paper-level link indicates the selected primitives are part of the paper as described in its title/abstract, **not** that a single formal theorem simultaneously involves them. The actual theorem hypotheses, problem variants, proofs and result classifications remain a long-term extension of the model. Publication metadata is subject to corrections; citation URLs are taken from original publisher/researcher pages where available.

The current corpus is a manually curated, noncomprehensive research sample rather than a systematic literature search or a complete state-of-the-art review. The mere absence of an index result is never evidence that a topic is open.
