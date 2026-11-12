#!/usr/bin/env python3
"""TCS Ontology: validate seed data, search primitives, compose questions, export SQLite.

No third-party Python packages required.
Examples:
    python3 tools/ontology.py validate
    python3 tools/ontology.py stats
    python3 tools/ontology.py search "Price of Anarchy"
    python3 tools/ontology.py compose equilibrium-efficiency --limit 5
    python3 tools/ontology.py sqlite --output tcs-ontology.sqlite
"""
from __future__ import annotations

import argparse
import itertools
import json
import re
import sqlite3
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
KINDS = {
    "game", "auction", "equilibrium", "property", "assumption", "framework",
    "graph_class", "problem", "technique", "objective", "task",
    "complexity_class", "model", "lens",
}
ID_PATTERN = re.compile(r"^[a-z_]+\.[a-z0-9]+(?:-[a-z0-9]+)*$")


def load(name: str) -> list[dict]:
    with (DATA / (name + ".json")).open(encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict) or not isinstance(data.get("items"), list):
        raise ValueError(f"{name}: must be an object with an items array")
    return data["items"]


def catalog() -> dict[str, list[dict]]:
    return {k: load(k) for k in (
        "primitives", "relationships", "rules", "literature", "sources",
        "results", "redirects", "papers", "papers-harvested",
    )}


def validate() -> tuple[dict, list[str]]:
    errors: list[str] = []
    db = catalog()
    primitives = db["primitives"]
    ids = set()
    for i, item in enumerate(primitives):
        ident = item.get("id")
        if not isinstance(ident, str) or not ID_PATTERN.fullmatch(ident):
            errors.append(f"primitives[{i}]: invalid id {ident!r}")
            continue
        if ident in ids:
            errors.append(f"primitives[{i}]: duplicate id {ident}")
        ids.add(ident)
        for key in ("name", "definition", "provenance", "review_status"):
            if not isinstance(item.get(key), str):
                errors.append(f"{ident}: {key} must be a string")
        if item.get("kind") not in KINDS:
            errors.append(f"{ident}: invalid kind")
        if not ident.startswith(item.get("kind", "") + "."):
            errors.append(f"{ident}: mismatched kind prefix")
        if not isinstance(item.get("areas"), list) or not item["areas"]:
            errors.append(f"{ident}: expected nonempty areas")
        if not isinstance(item.get("aliases"), list):
            errors.append(f"{ident}: expected aliases list")
        if item.get("review_status") not in (
            "seeded_definition_unverified", "needs_definition", "source_checked", "expert_reviewed",
        ):
            errors.append(f"{ident}: unrecognized review status")
        if item.get("review_status") == "expert_reviewed" and not item.get("source_ids"):
            errors.append(f"{ident}: expert-reviewed entry without source")
    source_ids = {s["id"] for s in db["sources"]}
    if len(source_ids) != len(db["sources"]):
        errors.append("sources: duplicate ids")
    for p in primitives:
        for ref in p.get("source_ids", []):
            if ref not in source_ids:
                errors.append(f"{p['id']}: unknown source {ref}")
        for ref in p.get("compatible_equilibria", []):
            if ref not in ids:
                errors.append(f"{p['id']}: unknown equilibrium {ref}")
            elif not ref.startswith("equilibrium."):
                errors.append(f"{p['id']}: not an equilibrium {ref}")
    predicates = {
        "is_a", "subset_of", "composed_of", "often_uses", "related_to",
        "often_analyzed_by", "has_relevant_solution_concept",
        "studied_on", "studies", "has_variant",
    }
    edges = set()
    for edge in db["relationships"]:
        for key in ("source", "target"):
            if edge.get(key) not in ids:
                errors.append(f"relationship: unknown {key} {edge.get(key)!r}")
        if edge.get("predicate") not in predicates:
            errors.append(f"relationship: unknown predicate {edge.get('predicate')!r}")
        identity = (edge.get("source"), edge.get("predicate"), edge.get("target"))
        if identity in edges:
            errors.append(f"duplicate relation {identity}")
        edges.add(identity)
    rule_ids = set()
    for rule in db["rules"]:
        ident = rule.get("id")
        if ident in rule_ids:
            errors.append(f"duplicate rule {ident}")
        rule_ids.add(ident)
        slots = rule.get("slots", [])
        keys = []
        for slot in slots:
            key = slot.get("key")
            keys.append(key)
            for ref in slot.get("ids", []):
                if ref not in ids:
                    errors.append(f"{ident}: unknown slot primitive {ref}")
            for kind in slot.get("kinds", []):
                if kind not in KINDS:
                    errors.append(f"{ident}: unknown slot kind {kind}")
            if not any(
                (not slot.get("ids") or item["id"] in slot["ids"])
                and (not slot.get("kinds") or item["kind"] in slot["kinds"])
                and (not slot.get("areas") or set(item["areas"]) & set(slot["areas"]))
                for item in primitives
            ):
                errors.append(f"{ident}: empty slot {key}")
        if len(keys) != len(set(keys)):
            errors.append(f"{ident}: duplicate slot keys")
        placeholders = set(re.findall(r"\{([^{}]+)\}", rule.get("template", "")))
        if placeholders != set(keys):
            errors.append(f"{ident}: template placeholders do not match slot keys")
    for item in db["literature"]:
        if item.get("rule_id") not in rule_ids:
            errors.append(f"literature {item.get('id')}: unknown rule")
        for ref in item.get("slots", {}).values():
            if ref not in ids:
                errors.append(f"literature {item.get('id')}: unknown primitive {ref}")
        for ref in item.get("source_ids", []):
            if ref not in source_ids:
                errors.append(f"literature {item.get('id')}: unknown source {ref}")
    from quality import audit
    errors.extend(audit(db))
    return db, errors


def require_valid() -> dict:
    db, errors = validate()
    if errors:
        for err in errors:
            print("ERROR:", err, file=sys.stderr)
        raise SystemExit(1)
    return db


def slot_choices(slot: dict, primitives: list[dict]) -> list[dict]:
    return [
        p for p in primitives
        if (not slot.get("ids") or p["id"] in slot["ids"])
        and (not slot.get("kinds") or p["kind"] in slot["kinds"])
        and (not slot.get("areas") or bool(set(p["areas"]) & set(slot["areas"])))
    ]


def compose(db: dict, rule_id: str, limit: int, seed: str = "",
            include_candidates: bool = False) -> list[dict]:
    """Generate well-typed candidates, excluding known-incompatible combinations.

    No result is a novelty claim. All required mathematical assumptions must
    still be specified. By default only source-checked primitives are selected.
    """
    rule = next((r for r in db["rules"] if r["id"] == rule_id), None)
    if rule is None:
        raise ValueError(f"Unknown rule: {rule_id}; options: {', '.join(r['id'] for r in db['rules'])}")
    slots = rule["slots"]
    candidates = [slot_choices(s, db["primitives"]) for s in slots]
    if not include_candidates:
        candidates = [
            [p for p in group if p["review_status"] in ("source_checked", "expert_reviewed")]
            for group in candidates
        ]
    if seed:
        candidates = [
            sorted(group, key=lambda p: (seed.lower() not in (p["name"] + " " + p["id"]).lower(), p["name"]))
            for group in candidates
        ]
    results = []
    compat = rule.get("compatibility") or {}
    for combination in itertools.product(*candidates):
        assignment = {slot["key"]: p for slot, p in zip(slots, combination)}
        system_key = compat.get("system_slot")
        eq_key = compat.get("equilibrium_slot")
        system = assignment.get(system_key)
        equilibrium = assignment.get(eq_key)
        if system and equilibrium:
            if any(
                pair["system"] == system["id"] and pair["equilibrium"] == equilibrium["id"]
                for pair in compat.get("deny", [])
            ):
                continue
            if compat.get("use_explicit_compatible_equilibria") and system.get("compatible_equilibria"):
                if equilibrium["id"] not in system["compatible_equilibria"]:
                    continue
        if system and "objective" in assignment:
            allowed = compat.get("objective_by_system_kind", {}).get(system["kind"])
            if allowed and assignment["objective"]["id"] not in allowed:
                continue
        title = rule["template"]
        for key, primitive in assignment.items():
            title = title.replace("{" + key + "}", primitive["name"])
        related_literature = [
            entry["id"] for entry in db["literature"]
            if entry["rule_id"] == rule_id
            and all(assignment.get(key, {}).get("id") == id for key,id in entry["slots"].items())
        ]
        results.append({
            "title": title, "rule_id": rule_id,
            "slots": {key: p["id"] for key, p in assignment.items()},
            "validation_status": "syntactic_candidate_not_novelty_checked",
            "exact_tuple_literature_ids": related_literature,
            "warnings": [
                rule.get("risk_note", "Always verify mathematical scope and existing literature."),
                "No result in this dataset proves that this is an open or novel problem.",
            ],
        })
        if len(results) >= limit:
            break
    return results


def export_sqlite(db: dict, outfile: Path) -> None:
    outfile.parent.mkdir(parents=True, exist_ok=True)
    if outfile.exists():
        outfile.unlink()
    with sqlite3.connect(outfile) as con:
        con.executescript("""
        PRAGMA foreign_keys=ON;
        CREATE TABLE primitive (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          kind TEXT NOT NULL,
          definition TEXT NOT NULL,
          review_status TEXT NOT NULL,
          provenance TEXT NOT NULL
        );
        CREATE TABLE primitive_area (
          primitive_id TEXT NOT NULL REFERENCES primitive(id),
          area TEXT NOT NULL,
          PRIMARY KEY (primitive_id, area)
        );
        CREATE TABLE primitive_alias (
          primitive_id TEXT NOT NULL REFERENCES primitive(id),
          alias TEXT NOT NULL,
          PRIMARY KEY (primitive_id, alias)
        );
        CREATE TABLE source (
          id TEXT PRIMARY KEY, title TEXT NOT NULL,
          url TEXT NOT NULL, type TEXT NOT NULL
        );
        CREATE TABLE primitive_source (
          primitive_id TEXT NOT NULL REFERENCES primitive(id),
          source_id TEXT NOT NULL REFERENCES source(id),
          PRIMARY KEY (primitive_id, source_id)
        );
        CREATE TABLE relationship (
          source_id TEXT NOT NULL REFERENCES primitive(id),
          predicate TEXT NOT NULL,
          target_id TEXT NOT NULL REFERENCES primitive(id),
          review_status TEXT NOT NULL,
          PRIMARY KEY (source_id, predicate, target_id)
        );
        CREATE TABLE composition_rule (
          id TEXT PRIMARY KEY, title TEXT NOT NULL,
          template TEXT NOT NULL, json TEXT NOT NULL
        );
        CREATE TABLE literature (
          id TEXT PRIMARY KEY, rule_id TEXT NOT NULL REFERENCES composition_rule(id),
          status TEXT NOT NULL, json TEXT NOT NULL
        );
        CREATE TABLE redirect (old_id TEXT PRIMARY KEY, new_id TEXT NOT NULL REFERENCES primitive(id), reason TEXT NOT NULL);
        CREATE TABLE checked_result (id TEXT PRIMARY KEY, statement TEXT NOT NULL, scope_note TEXT NOT NULL, json TEXT NOT NULL);
        CREATE TABLE paper (id TEXT PRIMARY KEY,title TEXT NOT NULL,year INTEGER NOT NULL,venue TEXT NOT NULL,source_id TEXT NOT NULL REFERENCES source(id),scope_note TEXT NOT NULL);
        CREATE TABLE paper_primitive (paper_id TEXT NOT NULL REFERENCES paper(id),primitive_id TEXT NOT NULL REFERENCES primitive(id),role TEXT NOT NULL,PRIMARY KEY(paper_id,primitive_id));
        CREATE TABLE imported_paper (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          year INTEGER NOT NULL,
          venue TEXT NOT NULL,
          paper_url TEXT NOT NULL,
          review_status TEXT NOT NULL,
          source TEXT NOT NULL
        );
        CREATE TABLE imported_paper_primitive (
          paper_id TEXT NOT NULL REFERENCES imported_paper(id),
          primitive_id TEXT NOT NULL REFERENCES primitive(id),
          role TEXT NOT NULL,
          PRIMARY KEY (paper_id, primitive_id)
        );
        CREATE INDEX idx_imported_primitive_id ON imported_paper_primitive(primitive_id);
        CREATE INDEX idx_primitive_name ON primitive(name);
        CREATE INDEX idx_primitive_kind ON primitive(kind);
        CREATE INDEX idx_primitive_area ON primitive_area(area);
        CREATE INDEX idx_relationship_target ON relationship(target_id);
        """)
        for s in db["sources"]:
            con.execute("INSERT INTO source VALUES (?,?,?,?)",
                        (s["id"], s["title"], s["url"], s["type"]))
        for p in db["primitives"]:
            con.execute("INSERT INTO primitive VALUES (?,?,?,?,?,?)",
                        tuple(p.get(k, "") for k in (
                            "id", "name", "kind", "definition", "review_status", "provenance",
                        )))
            con.executemany("INSERT INTO primitive_area VALUES (?,?)",
                            [(p["id"], area) for area in p["areas"]])
            con.executemany("INSERT INTO primitive_alias VALUES (?,?)",
                            [(p["id"], a) for a in p["aliases"]])
            con.executemany("INSERT INTO primitive_source VALUES (?,?)",
                            [(p["id"], s) for s in p["source_ids"]])
        for r in db["relationships"]:
            con.execute("INSERT INTO relationship VALUES (?,?,?,?)",
                        (r["source"], r["predicate"], r["target"], r["review_status"]))
        for r in db["rules"]:
            con.execute("INSERT INTO composition_rule VALUES (?,?,?,?)",
                        (r["id"], r["title"], r["template"], json.dumps(r)))
        for p in db["literature"]:
            con.execute("INSERT INTO literature VALUES (?,?,?,?)",
                        (p["id"], p["rule_id"], p["status"], json.dumps(p)))
        for link in db.get("redirects", []):
            con.execute("INSERT INTO redirect VALUES (?,?,?)",
                        (link["from"], link["to"], link.get("reason", "")))
        for result in db.get("results", []):
            con.execute("INSERT INTO checked_result VALUES (?,?,?,?)",
                        (result["id"], result["statement"], result["scope_note"], json.dumps(result)))
        for paper in db.get("papers", []):
            con.execute("INSERT INTO paper VALUES (?,?,?,?,?,?)",
                        (paper["id"], paper["title"], paper["year"], paper["venue"], paper["source_id"], paper["scope_note"]))
            for ref in paper["primitives"]:
                con.execute("INSERT INTO paper_primitive VALUES (?,?,?)",
                            (paper["id"], ref["primitive_id"], ref["role"]))
        for paper in db.get("papers-harvested", []):
            con.execute("INSERT INTO imported_paper VALUES (?,?,?,?,?,?,?)",
                        (paper["id"], paper["title"], paper["year"], paper["venue"],
                         paper["url"], paper["review_status"], paper["metadata_source"]))
            for ref in paper["primitives"]:
                con.execute("INSERT INTO imported_paper_primitive VALUES (?,?,?)",
                            (paper["id"], ref["primitive_id"], ref["role"]))
    print(f"Created {outfile} ({len(db['primitives'])} primitives)")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="command", required=True)
    sub.add_parser("validate")
    sub.add_parser("stats")
    sub.add_parser("quality")
    sp = sub.add_parser("search")
    sp.add_argument("query")
    sp.add_argument("--kind")
    sp.add_argument("--area")
    sp.add_argument("--limit", type=int, default=30)
    cp = sub.add_parser("compose")
    cp.add_argument("rule_id")
    cp.add_argument("--limit", type=int, default=10)
    cp.add_argument("--seed", default="")
    cp.add_argument("--include-candidates", action="store_true")
    sq = sub.add_parser("sqlite")
    sq.add_argument("--output", type=Path, default=ROOT / "tcs-ontology.sqlite")
    args = ap.parse_args()
    db = require_valid()
    if args.command == "validate":
        print(f"OK: {len(db['primitives'])} primitives, {len(db['relationships'])} relationships, "
              f"{len(db['rules'])} rules, {len(db['literature'])} literature links, "
              f"{len(db['sources'])} sources.")
    elif args.command == "quality":
        from quality import report
        print(json.dumps(report(db), indent=2, ensure_ascii=False))
    elif args.command == "stats":
        print(json.dumps({
            "primitives": len(db["primitives"]),
            "areas": dict(sorted(Counter(
                area for p in db["primitives"] for area in p["areas"]
            ).items())),
            "kinds": dict(sorted(Counter(p["kind"] for p in db["primitives"]).items())),
            "relationships": len(db["relationships"]),
            "rules": len(db["rules"]),
            "literature": len(db["literature"]),
        }, indent=2))
    elif args.command == "search":
        q = args.query.lower()
        results = [p for p in db["primitives"]
                   if (not args.kind or p["kind"] == args.kind)
                   and (not args.area or args.area in p["areas"])
                   and any(q in str(v).lower() for v in (
                       p["name"], p["id"], p["definition"], " ".join(p["aliases"]),
                       " ".join(p["areas"]),
                   ))][:max(0, args.limit)]
        print(json.dumps(results, indent=2, ensure_ascii=False))
    elif args.command == "compose":
        if args.limit < 1 or args.limit > 1000:
            ap.error("--limit must be between 1 and 1000")
        print(json.dumps(compose(db, args.rule_id, args.limit, args.seed, args.include_candidates),
                         indent=2, ensure_ascii=False))
    elif args.command == "sqlite":
        export_sqlite(db, args.output)


if __name__ == "__main__":
    main()
