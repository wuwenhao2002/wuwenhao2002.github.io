# Data Governance, Review & Research Validity

TCS Ontology distinguishes **terminology**, **mathematical models**, **typed relations**, **scoped research results**, and **candidate research questions**. These are not interchangeable data types.

## Status taxonomy

- \`needs_definition\`: a candidate term present in the backlog without a vetted definition.
- \`seeded_definition_unverified\`: an editorial draft; no claim of having checked literature.
- \`source_checked\`: a human-authored definition and explicit scope note with one or more reputable linked academic sources, reviewed editorially on the stored date. This is **not** formal expert review.
- \`expert_reviewed\`: reserved for a later process with identified qualified reviewers and written evidence; not assigned automatically.
- \`source_checked_statement\`: a source-scoped mathematical statement with assumptions, citations and non-applicability notes. Never infer universally from a single example.

The canonical primitive \`id\` is stable. Synonyms should go into \`aliases\`, not new nodes. The \`data/redirects.json\` file preserves legacy IDs after merges or reclassification. Once a redirect is public, it is part of the compatibility contract.

## Core structural rules

1. Every \`source_checked\` concept has a definition, scope note, \`reviewed_at\` date, and at least one valid \`source_id\`.
2. Each source ID resolves to the source registry, with HTTPS and descriptive title.
3. Each relationship must refer to existing concept IDs. \`is_a\` is for true subtype inclusion; \`composed_of\` is for mechanism composition rather than an automatic subtype. \`related_to\` never licenses theorem inheritance.
4. Directed \`is_a\`, \`subset_of\`, and \`composed_of\` links must be acyclic.
5. A research result must specify its scope, material assumptions, exact statement and source pointer.
6. Typed composition templates should never interpret missing literature coverage as novelty or openness.
7. Explicitly known invalid/unsafe combinations should be excluded by compatibility rules. Unspecified combinations remain *unverified* and require human research, even when type-compatible.
8. Graph class relations should be convention-aware (directed/undirected, simple/multi, finite/infinite).
9. Mathematical statements require objective convention: costs and welfare reverse PoA ratio orientations.
10. A prior academic link supports only the narrow content it states, not every unrelated property of the concept.

## Areas requiring special attention

- **Algorithmic game theory**: finite unweighted Rosenthal congestion games are exact potential games with PNE; weighted variants may lack PNE. Mean-field and nonatomic models use their own equilibrium notions.
- **Mechanism design**: truthful, BIC, DSIC, Bayes–Nash, quasilinear utility, private/common values and prior independence are separate assumptions.
- **Approximation algorithms**: an approximation factor and LP integrality gap are properties of specified algorithms or relaxations, not optimization objectives.
- **Distributed/online computing**: complexity depends on explicit communication, adversary, information, input and resource models.
- **Fairness**: EFX/EFX0, EF1, demographic parity and equalized odds are not synonyms and often conflict under different assumptions.
- **Complexity theory**: P, NP and PSPACE are decision classes, whereas PPAD/PLS/TFNP are search classes; never use cross-type inclusions without defining reductions.
- **Cryptography**: IND-CPA and differential privacy use different security/privacy games and are not the same concept.

## Review workflow

A contributor creates or modifies a concept and includes an explicit original definition (not a copied glossary paragraph), aliases, a precise type, relevant fields, mathematical scope, citation(s), status and date. A reviewer checks the primary paper or reference text against the claim, verifies it is not a synonym, and checks whether any statements imply an unjustified theorem transfer.

Every change must pass:
\`\`\`sh
cd tcs-ontology
python3 tools/ontology.py validate
python3 tools/ontology.py quality
python3 -m unittest discover -s tests -v
python3 tools/ontology.py sqlite --output /tmp/tcs-ontology.sqlite
node --check app.js
\`\`\`

Automated checks prove data-shape consistency, not the truth of definitions. Expert review, when available, should be recorded separately.

## Source licensing and provenance

The initial vocabulary was manually composed. External corpora (OpenAlex, CSO, MSC and others) are listed only as possible future enrichment sources. Do not bulk copy copyrighted definitions; check license and attribution requirements before data ingestion. Prefer stable academic DOI links for theorem-level facts.

## Future schema milestones

The next major upgrade should separate typed mathematical parameters from textual assumptions and add a structured \`Theorem\` record with variables, model scope, proof status, publication venue, peer verification, and machine-checkable logical dependencies. A literature retrieval system must report recall limitations, not pronounce an unexplored topic open.
