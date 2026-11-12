# 2025–2026 cross-field research discovery (v0.6)

## Research objective

Do not anchor the atlas around user-supplied Prediction and Sensitivity. Instead, find reusable **research lenses**, models, metrics and proof techniques by working *from independent proceedings* back to ontology concepts. Official [FOCS 2026](https://focs.computer.org/2026/accepted-papers/), [STOC 2026](https://acm-stoc.org/stoc2026/toc.html), [FOCS 2025](https://focs.computer.org/2025/accepted-papers/), and [STOC 2025](https://acm-stoc.org/stoc2025/accepted-papers.html) are the principal sources of this campaign. SODA sources and current paper preprints were also consulted for terminology.

Research themes promoted to first-class primitive IDs:

1. **Dynamic maintenance**: fully dynamic/incremental/decremental updates, worst-case vs amortized update, dynamic MST, 2-edge connectivity, k-means and treewidth.
2. **Adversarially robust streaming**: adaptive adversaries, turnstile vs insertion-only, frequency moments, space complexity, and polynomial-length linear-sketch equivalence.
3. **Coresets and compact representations**: furthest neighbor, coreset size, geometric low dimensionality and query-preserving summaries.
4. **Parameterized complexity and approximation**: FPT, modular equations, branchwidth, kernelization, randomized branching, time-approximation tradeoffs, ETH/SETH/treewidth assumptions.
5. **Local computation and distributed algorithms**: local solutions, retroactive updates, Lovasz local lemma locality, parallel work/depth.
6. **Instance-optimal and adaptive algorithms**: uniformity tracking, PageRank, instance-wise comparators, space/query tradeoffs.
7. **Learning theory and calibration**: positive-only learning, smoothed analysis, online multicalibration, group-conditional calibration, proximal regret and proximal correlated equilibrium.
8. **Derandomization and beyond-worst-case methods**: deterministic path covers/padded decompositions, parallel derandomization, analytic simplex models.
9. **Quantum and cryptography meta-complexity**: quantum state certification and measurement adaptivity, cryptanalytic preprocessing time/space, EFI pairs, secure broadcast.
10. **Fine-grained and streaming lower-bound techniques**: polynomial space bound for streamed diameter, blueprint lower bounds for matching, ETH lower bounds for pseudopolynomial scheduling, cell probe barriers.

## Paper evidence levels (strict distinction)

- **editorial_abstract_checked**: paper concepts classified from the official publisher's proceedings abstract (STOC 2026 in this campaign). This verifies a conceptual connection but is *not theorem-level verification or peer review*.
- **editorial_metadata_checked**: publication title and author list checked against official FOCS/STOC program; roles inferred *only from the explicit title*. This does not establish all mathematical techniques in the paper.
- **title_inferred_unverified**: previous Crossref title suggestions retained as a separate optional evidence tier. They have a known residual false-positive rate and are not promoted by adding more papers.

Each concept has a stable canonical ID, mathematical summary, scope warning and a source ID. Title-derived paper roles use evidence \`official_title\`; abstract-checked roles use \`official_abstract\`. The Paper-driven Research Graph continues to compute exact AND-intersection of paper memberships, **not** a semantic graph or AI novelty detection.

## Important disambiguations discovered during review

- Generic property testing is **not** automatically graph property testing.
- Local **node** differential privacy is not equivalent to local **edge** differential privacy.
- **Offline bin packing** in a pseudopolynomial ETH lower-bound paper is not online bin packing.
- An **isomorphic-priors model** is not itself the graph-isomorphism problem.
- A **geometry PTAS** from low-dimensionality does not imply FPT parameterized by an unrelated combinatorial parameter.
- Dense minimum-cost flow algorithms do not require complete graphs.
- Work/depth and round complexity, coreset and graph sparsification, query/space and update/space are all different resources.
- The privacy/security of eavesdropper-resistant broadcast does not automatically imply differential privacy.

## What makes a new primitive valuable?

Prefer a concept that (a) has a distinct formal mathematical definition and assumptions, (b) acts as a reusable lens or parameter on several problems, and (c) is anchored to actual papers. Conference title-only associations are kept separate from abstract-checked associations. The dataset is not exhaustive, and cross-field relationships should not be interpreted as original/open just because no indexed paper is present.

## Reproducibility

Run:

\`\`\`bash
cd tcs-ontology
python3 tools/ontology.py validate
python3 tools/ontology.py quality
python3 -m unittest discover -s tests -v
node --test tests/test_graph.cjs tests/test_graph_corpus.cjs
\`\`\`

The official publication metadata is linked through \`data/sources.json\`; the concept links can be inspected in \`data/papers.json\`. The v0.5 map quick-start panel now surfaces the new research lenses as selectable nodes and still supports multi-primitive AND search.
