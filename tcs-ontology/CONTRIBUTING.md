# Contributing to TCS Ontology

Thanks for improving the research database. New terms are welcome, but **accuracy over volume** is the project rule.

## Before proposing a primitive

1. Search the existing names and aliases, then inspect \`data/redirects.json\`.
2. Identify the mathematical **object or model**, property or theorem-related metric, method, assumption, objective, or research task. Avoid duplicates caused by variants of capitalization, spelling, or abbreviations.
3. Add a precise but original definition, formal scope caveats, and one primary academic source or established textbook with a stable HTTPS URL. Do not paraphrase a source beyond what it supports.
4. Use \`needs_definition\` for uncertain entries. Only use \`source_checked\` when the definition and scope have been checked against the listed source(s).
5. Prefer normal forms: \`kind.kebab-case-slug\`, full official name; put abbreviations in \`aliases\`.
6. Do not declare an unsolved problem from missing data. Link results only when their assumptions and conclusion are explicit.

## Example

\`\`\`json
{
  "id": "property.price-of-anarchy",
  "name": "Price of Anarchy",
  "kind": "property",
  "areas": ["Algorithmic Game Theory"],
  "aliases": ["PoA"],
  "definition": "Worst-case equilibrium inefficiency relative to an optimum under a fixed game family, objective and solution concept.",
  "scope_note": "Cost-minimization and welfare-maximization conventions reverse the ratio.",
  "review_status": "source_checked",
  "reviewed_at": "2026-11-12",
  "provenance": "manual_seed_v0",
  "source_ids": ["agt-inefficiency"]
}
\`\`\`

Please write the exact paper section or lemma when citing theorems. Distinguish literature pointers and theorem statements, and review changes to all dependent edges and composition rules.

## How to validate

\`\`\`bash
python3 tools/ontology.py validate
python3 tools/ontology.py quality
python3 -m unittest discover -s tests -v
python3 tools/ontology.py compose equilibrium-efficiency --limit 10
python3 tools/ontology.py sqlite --output /tmp/tcs-ontology.sqlite
node --check app.js
\`\`\`

Submit changes via pull request, with a clear explanation of mathematical restrictions and citation links. Submissions that add many unchecked terms without careful scope may be deferred.
