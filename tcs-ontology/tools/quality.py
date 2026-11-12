"""Strict integrity checks and editorial quality report for TCS Ontology 0.2.

This validator deliberately checks structure, not mathematical truth or novelty.
It uses Python's standard library only.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any
from urllib.parse import urlsplit

STATUSES = {"needs_definition", "seeded_definition_unverified", "source_checked", "expert_reviewed"}
RELATIONS = {"is_a", "subset_of", "composed_of", "related_to", "has_relevant_solution_concept",
             "often_analyzed_by", "often_uses", "studied_on", "studies"}


def _acyclic(edges: list[dict], predicate: str) -> list[str]:
    graph: dict[str, list[str]] = defaultdict(list)
    for edge in edges:
        if edge.get("predicate") == predicate:
            graph[edge["source"]].append(edge["target"])
    colors: dict[str, int] = {}
    errors = []

    def visit(node: str, stack: list[str]) -> None:
        if colors.get(node) == 1:
            errors.append(predicate + " cycle: " + " → ".join(stack + [node]))
            return
        if colors.get(node) == 2:
            return
        colors[node] = 1
        for nxt in graph.get(node, []):
            visit(nxt, stack + [node])
        colors[node] = 2

    for key in list(graph):
        if not colors.get(key):
            visit(key, [])
    return errors


def audit(db: dict[str, list[dict]]) -> list[str]:
    """Return all structural errors; never make unverified semantic assertions."""
    errors: list[str] = []
    primitives = db["primitives"]
    ids = {p["id"] for p in primitives}
    source_ids = {s["id"] for s in db["sources"]}
    name_kind: dict[tuple[str,str], str] = {}
    for p in primitives:
        ident = p["id"]
        if p.get("review_status") not in STATUSES:
            errors.append(f"{ident}: unknown review status")
        if p.get("review_status") in ("source_checked", "expert_reviewed"):
            if not p.get("definition", "").strip():
                errors.append(f"{ident}: checked entry without definition")
            if not p.get("source_ids"):
                errors.append(f"{ident}: checked entry without a linked source")
            if not p.get("scope_note", "").strip():
                errors.append(f"{ident}: checked entry without scope note")
            if not p.get("reviewed_at"):
                errors.append(f"{ident}: checked entry without review date")
        if p.get("review_status") == "needs_definition" and p.get("definition", "").strip():
            errors.append(f"{ident}: has definition but marked needs_definition")
        key = (p["kind"], p["name"].strip().casefold())
        if key in name_kind:
            errors.append(f"duplicate name within kind: {ident} and {name_kind[key]}")
        name_kind[key] = ident
        if len(p.get("aliases", [])) != len(set(p.get("aliases", []))):
            errors.append(f"{ident}: duplicate aliases")
        if len(p.get("areas", [])) != len(set(p.get("areas", []))):
            errors.append(f"{ident}: duplicate research areas")
        for reference in p.get("source_ids", []):
            if reference not in source_ids:
                errors.append(f"{ident}: unknown source {reference}")
        for eq in p.get("compatible_equilibria", []):
            if eq not in ids or not eq.startswith("equilibrium."):
                errors.append(f"{ident}: invalid equilibrium {eq}")
    for s in db["sources"]:
        url = s.get("url", "")
        parts = urlsplit(url)
        if parts.scheme != "https" or not parts.hostname:
            errors.append("source URL is not HTTPS: " + s.get("id", "unknown"))
        if not s.get("title"):
            errors.append("untitled source: " + s.get("id", "unknown"))
    edge_set = set()
    for e in db["relationships"]:
        key = (e["source"], e["predicate"], e["target"])
        if key in edge_set:
            errors.append("duplicate edge: " + repr(key))
        edge_set.add(key)
        if e["predicate"] not in RELATIONS:
            errors.append("unknown predicate: " + e["predicate"])
        if e["source"] not in ids or e["target"] not in ids:
            errors.append("dangling edge: " + repr(key))
        if e["source"] == e["target"]:
            errors.append("self edge: " + repr(key))
        for reference in e.get("source_ids", []):
            if reference not in source_ids:
                errors.append("edge with unknown citation: " + reference)
        if e.get("review_status") == "source_checked" and not e.get("source_ids"):
            errors.append("source-checked edge without citation: " + repr(key))
    for predicate in ("is_a", "subset_of", "composed_of"):
        errors.extend(_acyclic(db["relationships"], predicate))
    redirects = db.get("redirects", [])
    legacy = set()
    for r in redirects:
        old, new = r["from"], r["to"]
        if old in legacy:
            errors.append("duplicate redirect: " + old)
        legacy.add(old)
        if old in ids:
            errors.append("redirect source still canonical: " + old)
        if new not in ids:
            errors.append("redirect target missing: " + new)
        if old == new:
            errors.append("redirect self-loop: " + old)
    rule_ids = set()
    for r in db["rules"]:
        rid = r["id"]
        if rid in rule_ids:
            errors.append("duplicate rule: " + rid)
        rule_ids.add(rid)
        slots = {s["key"]: s for s in r["slots"]}
        if len(slots) != len(r["slots"]):
            errors.append("duplicate slot key: " + rid)
        import re
        placeholders = set(re.findall(r"\{([a-z_]+)\}", r.get("template", "")))
        if placeholders != set(slots):
            errors.append("template and slot mismatch: " + rid)
        for s in r["slots"]:
            choices = [
                p for p in primitives
                if (not s.get("ids") or p["id"] in s["ids"])
                and (not s.get("kinds") or p["kind"] in s["kinds"])
                and (not s.get("areas") or any(a in p["areas"] for a in s["areas"]))
            ]
            if not choices:
                errors.append("empty slot: " + rid + "/" + s["key"])
            if not any(p["review_status"] in ("source_checked", "expert_reviewed") for p in choices):
                errors.append("no source-checked slot options: " + rid + "/" + s["key"])
        compat = r.get("compatibility", {})
        for field in ("equilibrium_slot", "system_slot"):
            if compat and compat.get(field) not in slots:
                errors.append("invalid compatibility slot: " + rid + "/" + field)
        for d in compat.get("deny", []):
            if d["system"] not in ids or d["equilibrium"] not in ids:
                errors.append("invalid denied pair in " + rid)
            for sid in d.get("source_ids", []):
                if sid not in source_ids:
                    errors.append("invalid deny source " + sid)
        for kind, objectives in compat.get("objective_by_system_kind", {}).items():
            for obj in objectives:
                if obj not in ids:
                    errors.append("invalid objective rule id " + obj)
    for item in db["literature"]:
        if item["rule_id"] not in rule_ids:
            errors.append("literature refers to unknown rule: " + item["id"])
        for id in item.get("slots", {}).values():
            if id not in ids:
                errors.append("literature references unknown primitive: " + id)
        for sid in item.get("source_ids", []):
            if sid not in source_ids:
                errors.append("literature references missing source: " + sid)
    result_ids = set()
    for result in db.get("results", []):
        if result["id"] in result_ids:
            errors.append("duplicate result: " + result["id"])
        result_ids.add(result["id"])
        if result.get("status") != "source_checked_statement":
            errors.append("unexpected unverified result status: " + result["id"])
        if not result.get("statement") or not result.get("scope_note") or not result.get("assumptions"):
            errors.append("underspecified theorem record: " + result["id"])
        for id in result["subject_ids"]:
            if id not in ids:
                errors.append("dangling theorem subject: " + id)
        for sid in result["source_ids"]:
            if sid not in source_ids:
                errors.append("dangling theorem source: " + sid)
    return errors


def report(db: dict[str, list[dict]]) -> dict[str, Any]:
    items = db["primitives"]
    kinds = Counter(p["kind"] for p in items)
    areas = Counter(a for p in items for a in p["areas"])
    statuses = Counter(p["review_status"] for p in items)
    return {
        "total": len(items),
        "review_status": dict(sorted(statuses.items())),
        "definition_coverage": sum(bool(p.get("definition", "").strip()) for p in items),
        "source_coverage": sum(bool(p.get("source_ids")) for p in items),
        "kinds": dict(sorted(kinds.items())),
        "areas": dict(sorted(areas.items())),
        "relationships": len(db["relationships"]),
        "checked_relationships": sum(e.get("review_status")=="source_checked" for e in db["relationships"]),
        "results_with_scoped_assumptions": len(db.get("results", [])),
        "redirects": len(db.get("redirects", [])),
        "sources": len(db["sources"]),
        "unreviewed_examples": [p["id"] for p in items if p["review_status"]=="needs_definition"][:20],
    }
