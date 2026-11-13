# Multi-primitive literature coverage: second curation pass (13 November 2026)

## Objective and hard acceptance criterion

Reduce paper-unlinked canonical primitives in the interactive paper graph without making inferred mathematical relations. **Every accepted paper must link at least two distinct, existing canonical primitive IDs.** A topical association is not evidence that a paper formally proves a theorem about that primitive. See `docs/PAPER_GRAPH.md` and `docs/DATA_GOVERNANCE.md`.

## Results on main branch after bibliographic cleanup

| Measure | Before | After | Change |
|---|---:|---:|---:|
| Canonical primitives | 830 | 830 | 0 |
| Editorial paper records | 230 | 288 | +58 |
| Indexed paper coverage, including harvested candidates | 484 | 607 | +123 |
| Unlinked primitives | 346 | 223 | -123 |
| Linked share of canonical vocabulary | 58.3% | 73.1% | +14.8 pp |
| Paper–primitive assignments in this pass | — | 212 | +212 |
| Rejected candidates that would violate the two-primitive rule | — | 1 | — |

All 58 newly accepted papers have at least two unique valid canonical IDs. The coverage calculation combines curated papers and the existing separately labeled, title-inferred Crossref layer, consistent with `map-model.js` merging logic.

## Domain gains

| Area | Newly linked | Currently linked / total |
|---|---:|---:|
| Complexity Theory | 21 | 54/90 |
| Algorithmic Game Theory | 21 | 41/69 |
| Mechanism Design | 14 | 29/49 |
| Graph Algorithms | 13 | 105/123 |
| Learning Theory | 11 | 45/66 |
| Cryptography | 9 | 39/47 |
| Computational Social Choice | 8 | 23/29 |
| Online Algorithms | 7 | 58/73 |
| Streaming Algorithms | 7 | 34/38 |
| Logic and Automata | 5 | 12/15 |
| Other areas, combined | 7 | — |

## Illustrative primary literature and scoped links

- Dinur, *The PCP Theorem by Gap Amplification* (JACM 2007): PCP theorem, gap amplification, 3-SAT, hardness of approximation.
- Roughgarden, *Intrinsic Robustness of the Price of Anarchy* (STOC 2009): smoothness, price of anarchy, correlated equilibria and no-regret outcomes, within applicable games.
- Myerson and Satterthwaite, *Efficient Mechanisms for Bilateral Trading* (JET 1983): Bayesian incentive compatibility, individual rationality, budget balance, bilateral-trade efficiency limits. **Do not conflate bilateral trade with generic double auctions.**
- Bousquet and Elisseeff, *Stability and Generalization* (JMLR 2002): algorithmic learning stability, generalization and IID-sampling assumptions.
- Bera, Chakrabarti and Ghosh, *Graph Coloring via Degeneracy in Streaming and Other Space-Conscious Models* (ICALP 2020): graph degeneracy and arboricity, coloring, graph streams and congested clique.
- Flajolet *et al.*'s HyperLogLog paper and existing streaming literature remain separate from this pass; this second batch instead adds mergeable summaries, graph sketches, reservoir sampling and other cross-model works.
- Garey, Johnson and Sethi, *The Complexity of Flowshop and Jobshop Scheduling* (MOR 1976): flow shop, job shop, makespan, computational complexity.
- Jansen and van der Steenhoven, *Kernelization for Counting Problems on Graphs: Preserving the Number of Minimum Solutions* (IPEC 2023): counting, parameterized complexity and kernelization for stated planar graph problems.

## Evidence and scientific limitations

New papers have publisher/author bibliographic pointers, scoped editorial annotations, and explicit per-link evidence fields. A `review_status` of `editorial_abstract_checked` means a **human/editorial topic association grounded in an abstract**; it is **not** theorem-level verification, full-text audit, or expert peer review of ontology annotations. All other title/bibliographic candidates must retain the lower status. Preprints are not assumed to be peer-reviewed. Missing paper links do **not** imply a research question is new or open.

Old duplicate titles between already-curated records and the *harvested* candidate layer predate this pass. Newly created second-round records are checked for normalized-title duplicates against both.

The publication record for the kernelization/counting paper was corrected to the IPEC 2023 proceedings DOI. The full author lists for two papers were verified against the proceedings/institutional publication records; an unsubstantiated association with generic double auctions and an overbroad semantic-security association were dropped.

## Remaining gaps and follow-on priorities

After this pass, there are 223 unlinked primitives. Largest absolute gaps: Complexity Theory (36), Algorithmic Game Theory (28), Learning Theory (21), Mechanism Design (20), Graph Algorithms (18), Approximation Algorithms (17), Online Algorithms (15), Distributed Computing (11), Randomized Algorithms (9). Other uncovered areas include specialized cryptography, scheduling, property testing and logic.

Next steps should prioritize **primary-paper abstracts/full texts** for specific uncovered ID pairs (rather than automatically broadening titles), and add explicit evidence excerpt pointers and scope qualifications, with direct unit tests.

## Reproducibility

```bash
cd tcs-ontology
python3 tools/ontology.py validate
python3 tools/ontology.py quality
python3 -m unittest discover -s tests -v
node --test tests/test_graph.cjs tests/test_graph_corpus.cjs
```

The coverage-specific regression tests are in `tests/test_round2_paper_coverage.py`. Automated consistency checks do not establish the scientific truth of every tag.
