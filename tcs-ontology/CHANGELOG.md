# Changelog

## 0.6.4 — 2026-11-13

- Fixed the catalog’s All review states filter, added shareable catalog filters, and preserved session ideas for export when browser storage is blocked or full.
- Persisted graph selections and filters in shareable links; synchronized paper-search counts and restored keyboard focus after selections.
- Removed per-frame summary DOM writes and deferred hidden catalog bibliography/source rendering.
- Replaced stale current statistics with a reproducible README snapshot checked in CI: 830 primitives, 390 curated plus 130 title-inferred records, 511 distinct indexed papers, and 757 paper-linked primitives.
- Fixed SQLite connection cleanup on Windows and isolated historical campaign coverage tests from later additions, preserving original acceptance thresholds.
- Added catalog/storage and URL-state regression tests and expanded desktop/mobile browser smoke checks. No scientific records or review tiers changed.


## 0.6.3 — 2026-11-13

- Round-four high-coverage literature campaign: 52 additional curated research papers, 176 direct paper-to-primitive assignments and six repaired associations from original STOC/FOCS/SODA papers. The strict at-least-two-valid-IDs-per-new-paper rule was preserved.
- Paper-linked coverage increased from 684/830 (82.4%) to 757/830 (91.2%); 73 canonical primitives remain without an indexed paper. Curated-only coverage is 755/830, with 130 previously unreviewed harvested records still separate.
- Evidence tiers for STOC 2026 positive-only learning and streaming matching, and FOCS 2025 multi-pass Max-Cut, were raised only after inspecting their official/author abstracts. One-sided and two-sided property-testing error, edge vs local-edge differential privacy, and statistical vs perfect hiding remain distinct.
- Corrections to bibliographic year/venue metadata, source-scope notes, and a targeted regression suite are documented in `docs/LITERATURE_COVERAGE_ROUND4.md`, with all 73 remaining unlinked canonical IDs.
- No further primitives were removed solely for lacking paper coverage; paper co-occurrence is not a validated theorem relationship.


## 0.6.2 — 2026-11-13

- Third targeted multi-primitive paper round: +50 curated papers, 154 new paper–primitive assignments, +77 previously unlinked canonical primitives. Total paper-linked coverage is 684/830 (82.4%), including the separate optional unreviewed harvest layer.
- Retired two wrongly typed `task` nodes (`time-complexity`, `query-complexity`) and replaced them with sourced `property` canonical IDs; added legacy redirects rather than breaking references.
- Corrected the mathematical problem definition and source of `Influence Maximization` to Kempe–Kleinberg–Tardos.
- Added publisher/author evidence links, scope cautions, regression tests for canonical IDs / duplicate-title rejection / multi-primitive membership, and a detailed coverage audit in `docs/LITERATURE_COVERAGE_ROUND3.md`.
- The presence/absence of a paper link does not certify scientific novelty; metadata checks, abstract checks and theorem-level validation remain distinct.


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

