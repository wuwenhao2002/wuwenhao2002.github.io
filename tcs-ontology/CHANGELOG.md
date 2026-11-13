# Changelog

## 0.6.1 — 2026-11-13

- Expanded the multi-primitive paper graph through two targeted literature campaigns: 129 additional papers compared with the original 159-paper snapshot, spanning complexity, game theory, mechanism design, cryptography, learning, scheduling, distributed/streaming and graph algorithms.
- The second pass contributed 58 papers, 212 paper–primitive links, and 123 previously paper-unlinked canonical primitives. Combined (curated + explicitly unreviewed harvested) coverage now stands at 607/830 (73.1%), with 223 still unlinked.
- Preserved the strict acceptance rule of two or more distinct existing primitive IDs for every added paper; bibliography citations and per-paper scope notes are retained. The paper graph co-occurrence is not a theorem relation.
- Corrected IPEC 2023 publisher metadata, checked publication author lists and removed overbroad concept associations; added regression checks at `tests/test_round2_paper_coverage.py`.
- See `docs/LITERATURE_COVERAGE_ROUND2.md` for coverage methodology, the area breakdown, caveats and follow-up targets. Editorial abstract checks are not expert review.


## v0.5.0 — 2026-11-13

- Rebuilt the Paper-driven Research Graph's visual language: desktop/phone research workstation, orbited related-node focus with a gentle animated starfield, luminous nodes, clearer typography and label collision avoidance.
- Kept all canonical TCS primitives browsable in a deterministic field overview; selected nodes and paper-defined co-occurrences take priority without fabricated semantic distances.
- Deepened editorial abstract annotation of numerous official Dinitz/Yoshida papers plus 2018–2026 publisher articles about prediction-augmented algorithms, sensitivity, private graph algorithms, and network design.
- Added carefully scoped primitives, deduplication redirects and improved direct paper URLs.
- Introduced Chromium visual smoke tests with desktop/mobile screenshots in a separate workflow, plus abstract provenance and scientific typing regression tests.
- Scientific caution: `editorial_abstract_checked` is not peer review, and title-derived Crossref associations remain unverified and opt-in filters are available.

## 0.2.0 — 2026-11-12

- Audited and merged duplicates and misclassified seed primitives; stable legacy IDs now redirect.
- Added definitions, scope warnings, and editorial source checks for a core spanning all 19 existing research areas.
- Added explicit result records for finite unweighted congestion games, weighted-game PNE counterexamples, finite linear-latency PoA, standard first-price auction BNE, second-price truthful bidding and EFX distinctions.
- Marked unreviewed entries as candidates and defaulted catalog/composer to source-checked entries.
- Added type/compatibility filtering, known-incompatible combination exclusions, literature context, graph neighborhood, canonical deep links, keyboard search, CSV/JSON export.
- Added strict integrity audit: source IDs, semantic relation predicates, cycles, redirects, theorem assumptions, review status, and composition slot consistency.
- Extended standard-library CLI/SQLite export to include redirects and scoped statements.
- Improved CI and added negative-regression tests.

### Scientific disclaimer

Source checks are editorial, not peer review. Most entries still require manual review, and no automated novelty/open-problem verifier exists.

## 0.1.0 — 2026-11-12

- Initial GitHub Pages prototype, 593 candidate vocabulary entries, JSON/SQLite interface and seven composition templates.
