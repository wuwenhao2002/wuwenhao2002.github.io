# Third Multi-Primitive Literature Curation and Ontology Taxonomy Audit

**Audit date:** 2026-11-13

## Objective

Build paper-defined links for canonical TCS primitives that have no paper coverage, while maintaining a strict scientific distinction between (1) bibliographic title/topic checks, (2) publisher/author abstract checks, and (3) full-text/theorem validation. The third tier has **not** been performed systematically and cannot be claimed by this campaign.

**Hard acceptance condition:** a newly indexed paper must reference **at least two distinct existing canonical primitive IDs**. Never add a generic nearby tag merely to satisfy this rule. When evidence for a second ID is insufficient, reject the candidate.

## Results (after all round-three edits)

| Metric | Before third pass | After third pass | Change |
|---|---:|---:|---:|
| Canonical primitive count | 830 | 830 | 0 |
| Curated paper records | 288 | 338 | +50 |
| Unreviewed title-inferred papers | 130 | 130 | 0 |
| Unique primitives covered by either paper layer | 607 | 684 | +77 |
| Primitive coverage ratio | 73.1% | 82.4% | +9.3 percentage points |
| Paper-unlinked primitives | 223 | 146 | -77 |
| Third-pass paper–primitive links | — | 154 | +154 |
| Legacy primitive redirects | 13 | 15 | +2 |

All 50 new curated records have at least two canonical IDs. The 684/830 numerator includes the 130 existing **title-inferred, unreviewed** harvested records, consistent with the graph's dual-tier co-occurrence behavior. In the map's curated-only filter, the exact coverage count differs.

### Most useful new research connections

| Paper | Scopes and concepts |
|---|---|
| Richard Karp (1972), *Reducibility Among Combinatorial Problems* | Many-one reduction; Exact Cover, Partition, 0–1 Integer Programming, Hamiltonian Cycle and NP-complete decision problems |
| Clemens Lautemann (1983), *BPP and the polynomial hierarchy* | BPP, polynomial hierarchy, second level Sigma-2-P; specifically an inclusion, not equality |
| Christos Papadimitriou (1994), *On the complexity of the parity argument...* | TFNP, PPAD/PLS and End-of-Line-style total search; search, not decision classes |
| Tim Roughgarden (2006), *On the Severity of Braess's Paradox* | Braess paradox and selfish network routing, subject to explicit latencies |
| Kempe, Kleinberg and Tardos (2015), *Maximizing the Spread of Influence through a Social Network* | Influence maximization and submodular expected spread in specified diffusion processes |
| Bertsimas, Farias and Trichakis (2011), *The Price of Fairness* | Price of fairness under max-min and proportional fairness in resource allocation, not an equilibrium concept |
| Papadimitriou and Roughgarden (2008), *Computing correlated equilibria in multi-player games* | Correlated equilibria for graphical, anonymous, congestion and other succinct multiplayer games |
| Robert Beals et al. (2001), *Quantum Lower Bounds by Polynomials* | Quantum oracle query model and query-complexity resource |
| Borodin and Cook (1982), *A Time-Space Tradeoff for Sorting on a General Sequential Model of Computation* | Time complexity, space-time tradeoffs and lower bounds |
| Ramalingam and Reps (1996), *An Incremental Algorithm for a Generalization of the Shortest-Path Problem* | Dynamic SSSP under heterogeneous updates; despite title, supports update operations beyond pure insertion-only algorithms |
| Clark, Colbourn and Johnson (1990), *Unit Disk Graphs* | Unit disk graphs, hard independence/domination problems and tractable geometric-clique case |
| Kasiviswanathan et al. (2011), *What Can We Learn Privately?* | Private learning, statistical-query learning and differentially private sample complexity |

Paper-to-primitive assignments are explicit, **not** automatically generated semantic graph edges, and are never interpreted as proof that one concept implies another.

## Taxonomy quality improvements

Two canonical IDs were mathematically misclassified as research **tasks** even though they are model-dependent computational **resource measures**:

- `task.time-complexity` was replaced by `property.time-complexity`.
- `task.query-complexity` was replaced by `property.query-complexity`.

The old ID nodes were **retired**, not simply hidden. `data/redirects.json` maps each old ID to the new canonical property ID, so old search/bookmark references can be resolved. The new properties have original scoped definitions, sources, `source_checked` editorial status, and matching papers. This is a type-system correction rather than a claim that time/query complexity is not meaningful.

Also corrected `problem.influence-maximization`: the old definition treated the problem itself as an objective and the old sole citation was an unrelated researcher publication list. The corrected definition is the seed-set optimization problem under a specified diffusion process, anchored to Kempe–Kleinberg–Tardos.

**Deletion policy:** absence of a paper link is never sufficient reason to delete a mathematically meaningful primitive. More ambitious merges/removals require synonym checking, mathematical scope comparison, evidence of replacement and redirect compatibility.

## Remaining unlinked concepts by area

| Area | Unlinked |
|---|---:|
| Algorithmic Game Theory | 18 |
| Mechanism Design | 17 |
| Learning Theory | 16 |
| Approximation Algorithms | 13 |
| Graph Algorithms | 13 |
| Complexity Theory | 11 |
| Online Algorithms | 11 |
| Cryptography | 6 |
| Randomized Algorithms | 6 |
| Data Structures | 6 |
| Distributed Computing | 6 |
| Scheduling | 6 |
| Property Testing | 4 |
| Streaming Algorithms | 3 |
| Logic and Automata | 3 |
| Quantum Computing | 3 |
| Computational Social Choice | 3 |
| Fine-Grained Complexity | 1 |
| Algorithmic Fairness | 0 |
| Computational Geometry | 0 |

Remaining unlinked totals sum to **146**. Priority follow-up: an abstract/full-text verification pass for titles that currently carry `editorial_metadata_checked` status, and a targeted original-paper search for the 146 remaining concepts. The absence of an indexed paper **does not** indicate an open problem.

## Reproducibility and testing

```bash
cd tcs-ontology
python3 tools/ontology.py validate
python3 tools/ontology.py quality
python3 -m unittest discover -s tests -v
node --test tests/test_graph.cjs tests/test_graph_corpus.cjs
```

New test file: `tests/test_round3_coverage_taxonomy.py`, checking canonical IDs, at-least-two memberships, references, titles, coverage growth, redirects and corrected influence-maximization provenance. Data-graph audit in the commit pipeline also checked all curated paper link IDs, paper source pointers, directed relationship endpoints and canonical redirects.

**Verification disclaimer:** structural/semantic-scope checks here are editorial and do not substitute for expert proof verification. This chat environment could inspect and validate committed JSON via the GitHub connection, but could not run the Python repository suite locally because the shell runtime could not reach GitHub; no CI pass is asserted.
