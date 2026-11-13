# Multi-primitive literature coverage: fourth pass (13 November 2026)

## Scope and audit methodology

The canonical paper graph links two primitive nodes **only if an indexed paper has both exact canonical IDs**. An indexed paper must have ≥2 distinct valid canonical primitive IDs. Paper co-occurrence is not a proved implication, reduction, theorem, or similarity estimate. Do not treat the absence of a paper as a sign of an open research problem.

This pass combined (1) original research bibliography searches across theory conferences/journals, (2) a scoped check of publisher/author abstracts and bibliographic sources, and (3) a review of existing publisher-verified paper entries that had missed directly supported primitive tags.

## Coverage outcome

| Metric | Baseline (after round three) | Fourth-pass result | Delta |
|---|---:|---:|---:|
| Canonical primitive count | 830 | 830 | 0 |
| Editorial paper records | 338 | 390 | +52 |
| Unreviewed Crossref title-inferred records | 130 | 130 | 0 |
| Paper-covered primitives, combined layers | 684 | 757 | +73 |
| Paper-unlinked primitives, combined layers | 146 | 73 | -73 |
| Overall coverage | 82.4% | 91.2% | +8.8 percentage points |
| Additional paper-to-primitive assignments | — | 176 from new papers + 6 carefully backfilled | +182 |

**Curated-only coverage:** 755/830. The rest of the combined coverage comes only from the separately labeled, unreviewed title-inferred layer. The corpus is selective rather than exhaustive.

The 52 newly added papers each link at least two canonical IDs. Among existing records, six additional literature relationships were checked and added:

1. `program-stoc-smoothed-positive` → `problem.positive-only-learning`, `assumption.reference-distribution` from the STOC 2026 official abstract;
2. `program-stoc-stream-match` → `problem.streaming-matching` from the STOC 2026 official abstract (single-pass only, not a generic multipass lower-bound statement);
3. `program-focs25-multi-pass-maxcut` → `technique.multipass-streaming-lower-bound` from the FOCS 2025 program and authors' abstract;
4. `curated-dinitz-lasserre-spanner` → `technique.integrality-gap-construction` from the author's publication page and explicit title;
5. `dinitz-graphcuts` → `model.edge-differential-privacy` from the SODA 2026 official abstract.

The three official FOCS/STOC papers with checked abstracts now have matching `editorial_abstract_checked` status and `official_abstract` per-concept evidence flags, preserving existing test contracts.

## Illustrative additions

- **Incomplete-information games and auctions:** Harsanyi, *Games with Incomplete Information Played by Bayesian Players*; Day–Milgrom, *Core-Selecting Package Auctions*; Dobzinski–Lavi–Nisan, *Multi-unit Auctions with Budget Limits*; and Dhangwatnotai–Roughgarden–Yan, *Revenue Maximization with a Single Sample*. These must not be read as a claim of exact truthfulness for arbitrary core-selecting or auction formats.
- **Learning and optimization:** Balcan–Beygelzimer–Langford, *Agnostic Active Learning*; Sugiyama et al., *Covariate Shift Adaptation by Importance Weighted Cross Validation*; Bin Yu, *Assouad, Fano, and Le Cam*; and Dawid, *The Well-Calibrated Bayesian*. Calibration, active learning, covariate shift, and general adversarial noise carry different assumptions.
- **Graph and distributed computation:** Goldreich–Ron, *Property Testing in Bounded Degree Graphs*; Chechik–Zhang, *Incremental Single Source Shortest Paths in Sparse Digraphs*; Gallager–Humblet–Spira, *A Distributed Algorithm for Minimum-Weight Spanning Trees*; and Feuilloley, *How long it takes for an ordinary node with an ordinary id to output?*.
- **Space/time complexity and succinct data structures:** Fischer, *Optimal Succinctness for Range Minimum Queries* (static array; 2n+o(n) bits, O(1)-query time); Ladner, *The Circuit Value Problem is Log Space Complete for P*; and Stockmeyer–Meyer, *Word Problems Requiring Exponential Time* (quantifier/space-class relation marked as historically attributed rather than proof-level verified).
- **Streaming and cryptography:** SODA 2026 edge-DP graph cuts; local-edge-private graph statistics; functional encryption security definitions; and the rigorous distinction between *statistical hiding* and *perfect hiding*. The latter was deliberately **not** asserted as an edge for the statistical-hiding-commitments paper.

## Qualitative ontology audit

The request permitted removing incorrect or meaningless primitive nodes. **No new primitive was removed during round four**, since a lack of literature membership does not establish an invalid mathematical concept. Narrowly scoped cases such as local edge-DP vs central edge-DP; statistical vs perfect hiding; general vs semi-streaming matching; and incremental vs decremental SSSP were kept distinct.

Original ID/redirect totals remain unchanged. Prior round's type corrections remain in effect: `task.time-complexity` → `property.time-complexity` and `task.query-complexity` → `property.query-complexity`. Where old paper tags were title-only but the proceedings abstract was verified, the evidence tier was updated explicitly. No theorem-level validation or expert review is implied.

## Remaining unlinked primitives by research area

| Research area | Unlinked | Covered / total |
|---|---:|---:|
| Graph Algorithms | 10 | 113/123 |
| Algorithmic Game Theory | 10 | 59/69 |
| Approximation Algorithms | 9 | 46/55 |
| Mechanism Design | 8 | 41/49 |
| Online Algorithms | 8 | 65/73 |
| Learning Theory | 5 | 61/66 |
| Complexity Theory | 5 | 85/90 |
| Cryptography | 3 | 44/47 |
| Randomized Algorithms | 3 | 17/20 |
| Distributed Computing | 3 | 37/40 |
| Quantum Computing | 2 | 15/17 |
| Computational Social Choice | 2 | 27/29 |
| Streaming Algorithms | 1 | 37/38 |
| Data Structures | 1 | 27/28 |
| Property Testing | 1 | 26/27 |
| Logic and Automata | 1 | 14/15 |
| Scheduling | 1 | 21/22 |
| Fine-Grained Complexity | 0 | 6/6 |
| Computational Geometry | 0 | 7/7 |
| Algorithmic Fairness | 0 | 9/9 |

## Remaining unlinked IDs (for the next review)

**Graph Algorithms (10):** `graph_class.chordal-bipartite-graph`, `graph_class.chordal-graph`, `graph_class.cograph`, `graph_class.comparability-graph`, `graph_class.complete-graph`, `graph_class.forest`, `graph_class.line-graph`, `graph_class.series-parallel-graph`, `graph_class.tournament`, `property.girth`.

**Algorithmic Game Theory (10):** `equilibrium.perfect-bayesian-equilibrium`, `framework.population-games`, `game.common-interest-game`, `game.cut-game`, `game.differential-game`, `game.load-balancing-game`, `game.public-goods-game`, `game.singleton-congestion-game`, `property.fairness-of-equilibrium`, `property.inefficiency-of-learning`.

**Approximation Algorithms (9):** `framework.biobjective-optimization`, `objective.submodular-welfare`, `problem.local-set-cover`, `problem.stochastic-submodular-probing`, `task.bicriteria-approximation`, `task.gap-reduction`, `task.upper-bound`, `technique.approximation-preserving-reduction`, `technique.fpt-approximation-scheme`.

**Mechanism Design (8):** `assumption.additive-valuations`, `assumption.correlated-private-values`, `assumption.monotone-hazard-rate`, `assumption.no-overbidding`, `assumption.regular-value-distribution`, `auction.clock-auction`, `auction.double-auction`, `property.group-strategyproofness`.

**Online Algorithms (8):** `model.point-prediction`, `model.semi-online-model`, `model.stochastic-arrival-model`, `model.unknown-distribution-model`, `problem.online-knapsack`, `property.algorithmic-robustness`, `property.memory-regret-tradeoff`, `technique.backward-analysis`.

**Learning Theory (5):** `assumption.bounded-loss`, `assumption.lipschitz-continuity`, `assumption.margin-assumption`, `technique.empirical-risk-minimization`, `technique.structural-risk-minimization`.

**Complexity Theory (5):** `complexity_class.nexp`, `complexity_class.rp`, `complexity_class.zpp`, `framework.turing-reduction`, `problem.circuit-satisfiability`.

**Cryptography (3):** `model.symmetric-encryption`, `property.perfect-hiding`, `property.post-quantum-security`.

**Randomized Algorithms (3):** `technique.leverage-score-sampling`, `technique.method-of-conditional-expectations`, `technique.rejection-sampling`.

**Distributed Computing (3):** `model.non-signaling-locality-model`, `problem.distributed-approximate-matching`, `problem.parallel-reachability`.

**Quantum Computing (2):** `problem.quantum-simulation`, `problem.quantum-state-discrimination`.

**Computational Social Choice (2):** `problem.proportional-allocation`, `property.monotonicity-of-voting`.

**Streaming Algorithms (1):** `model.oblivious-adversary`.

**Data Structures (1):** `problem.longest-common-subsequence`.

**Property Testing (1):** `problem.distribution-identity-testing`.

**Logic and Automata (1):** `model.parity-automaton`.

**Scheduling (1):** `problem.interval-scheduling`.

### Suggested next focus

The highest remaining absolute deficits are Graph Algorithms and Algorithmic Game Theory (10 each), Approximation Algorithms (9), Mechanism Design and Online Algorithms (8 each), Learning Theory and Complexity Theory (5 each). Prefer original papers that *genuinely cover at least two of the remaining IDs* rather than attaching unrelated generic methods to produce visually attractive edges. Another priority is expert review of 49 remaining `needs_definition` but paper-unlinked primitives, and 24 `source_checked` yet paper-unlinked ones.

## Reproducibility / limitations

```sh
cd tcs-ontology
python3 tools/ontology.py validate
python3 tools/ontology.py quality
python3 -m unittest discover -s tests -v
node --test tests/test_graph.cjs tests/test_graph_corpus.cjs
```

New `tests/test_round4_coverage.py` checks canonical IDs, 2+ tags per new record, title/source uniqueness, scoped omissions (especially statistical vs perfect hiding), and the five backfilled old-paper records. A connected-repository structured data audit found no duplicate new paper titles, bad primitive links, missing source pointers, or invalid redirects. **Full Python/Node tests and GitHub CI have not been confirmed executed**; do not claim they passed.

Publication metadata and interpretation may still require a second source-by-source editorial and full-text audit. Missing paper links do not certify original/open research problems.
