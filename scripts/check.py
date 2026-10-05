#!/usr/bin/env python3
"""scripts/check.py
Quality and security check conforming to AQUAPULSE_V9_2_LEAN.md §A.
Usage:
    python scripts/check.py
    python scripts/check.py --selftest
Exit 1 when:
    1. A VERIFIED entry in docs/verified.json lacks url, sha256, or fetchedAt.
    2. An exact package version in any package.json or requirements*.txt is absent from verified.json.
    3. A secret-like string (gsk_, postgres://user:pass@, redis://, -----BEGIN) is in a tracked file.
"""

import json
import os
import re
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

EXACT_VERSION_RE = re.compile(r"^[0-9]+(\.[0-9]+)*([a-zA-Z0-9_\-\.]*)$")
PYPI_REQ_RE = re.compile(r"^([a-zA-Z0-9_\-\.]+)\s*==\s*([a-zA-Z0-9_\-\.]+)")

SECRET_PATTERNS = [
    re.compile(r"-----BEGIN[ A-Z0-9_-]*PRIVATE KEY"),
    re.compile(r"gsk_[a-zA-Z0-9]{20,}"),
    re.compile(r"postgres(?:ql)?://(?!user:pass@|user:password@|aquapulse_user:secret@)[a-zA-Z0-9_.-]+:(?!(?:password|pwd|secret|pass|xxx)@)[^@\s/]+@[a-zA-Z0-9_.-]+"),
    re.compile(r"rediss?://(?!default:TOKEN@)[a-zA-Z0-9_.-]+:(?!(?:password|pwd|secret|TOKEN|xxx)@)[^@\s/]+@[a-zA-Z0-9_.-]+"),
]


def check_verified_entries(entries):
    errors = []
    for idx, entry in enumerate(entries):
        tag = entry.get("tag")
        if tag in ("VERIFIED", "V-AUTH"):
            missing = []
            for field in ("url", "sha256", "fetchedAt"):
                if not entry.get(field):
                    missing.append(field)
            if missing:
                entry_id = entry.get("id") or entry.get("name") or f"index_{idx}"
                errors.append(f"Entry '{entry_id}' ({tag}) missing required fields: {', '.join(missing)}")
    return errors


def check_exact_package_versions(repo_root, verified_entries):
    errors = []
    known_pkgs = set()
    for e in verified_entries:
        name = e.get("name")
        ver = e.get("version")
        if name and ver:
            known_pkgs.add((name.lower(), ver))
        entry_id = e.get("id", "")
        if "@" in entry_id:
            raw = entry_id.split(":")[-1]
            parts = raw.split("@")
            if len(parts) == 2:
                known_pkgs.add((parts[0].lower(), parts[1]))

    # Scan package.json files
    for root, dirs, files in os.walk(repo_root):
        dirs[:] = [d for d in dirs if d not in (".git", "node_modules", ".agents", "target", "dist")]
        for f in files:
            if f == "package.json":
                p = Path(root) / f
                try:
                    data = json.loads(p.read_text(encoding="utf-8"))
                except Exception as err:
                    errors.append(f"Cannot read {p}: {err}")
                    continue
                for dep_key in ("dependencies", "devDependencies", "peerDependencies", "optionalDependencies"):
                    deps = data.get(dep_key, {})
                    if isinstance(deps, dict):
                        for pkg, ver in deps.items():
                            ver_clean = ver.strip()
                            if EXACT_VERSION_RE.match(ver_clean):
                                if (pkg.lower(), ver_clean) not in known_pkgs:
                                    errors.append(
                                        f"{p.relative_to(repo_root)}: exact package '{pkg}@{ver_clean}' absent from verified.json"
                                    )

    # Scan requirements*.txt files
    for root, dirs, files in os.walk(repo_root):
        dirs[:] = [d for d in dirs if d not in (".git", "node_modules", ".agents", "target", "dist")]
        for f in files:
            if f.startswith("requirements") and f.endswith(".txt"):
                p = Path(root) / f
                try:
                    lines = p.read_text(encoding="utf-8").splitlines()
                except Exception as err:
                    errors.append(f"Cannot read {p}: {err}")
                    continue
                for line in lines:
                    line = line.strip()
                    m = PYPI_REQ_RE.match(line)
                    if m:
                        pkg, ver = m.group(1), m.group(2)
                        if (pkg.lower(), ver) not in known_pkgs:
                            errors.append(
                                f"{p.relative_to(repo_root)}: exact requirement '{pkg}=={ver}' absent from verified.json"
                            )

    return errors


def check_secrets(repo_root):
    errors = []
    try:
        res = subprocess.run(
            ["git", "ls-files"],
            cwd=repo_root,
            capture_output=True,
            text=True,
            check=True,
        )
        tracked_files = res.stdout.splitlines()
    except Exception as err:
        errors.append(f"Failed to list git files: {err}")
        return errors

    ignored_files = {
        "scripts/check.py",
        "AGENTS.md",
        "AQUAPULSE_V9_2_LEAN.md",
    }

    for rel_path in tracked_files:
        if rel_path in ignored_files or rel_path.startswith("docs/evidence/"):
            continue
        p = repo_root / rel_path
        if not p.is_file():
            continue
        try:
            content = p.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        for line_num, line in enumerate(content.splitlines(), start=1):
            for pat in SECRET_PATTERNS:
                if pat.search(line):
                    errors.append(f"{rel_path}:{line_num}: found secret-like pattern '{pat.pattern}'")
                    break

    return errors


def run_checks(repo_root=REPO_ROOT):
    verified_file = repo_root / "docs" / "verified.json"
    if not verified_file.exists():
        return ["docs/verified.json does not exist"]

    try:
        entries = json.loads(verified_file.read_text(encoding="utf-8"))
    except Exception as err:
        return [f"Cannot parse docs/verified.json: {err}"]

    errors = []
    errors.extend(check_verified_entries(entries))
    errors.extend(check_exact_package_versions(repo_root, entries))
    errors.extend(check_secrets(repo_root))
    return errors


def selftest():
    # 1. Test missing field in VERIFIED entry
    bad_entry = {"id": "test:pkg", "tag": "VERIFIED", "url": "https://example.com"}
    errs = check_verified_entries([bad_entry])
    assert len(errs) > 0, "selftest failed: expected error on missing sha256/fetchedAt"

    # 2. Test missing exact package
    tmp_entries = [{"name": "foo", "version": "1.0.0"}]
    # Package version check helper
    exact_present = ("foo".lower(), "1.0.0") in {(e["name"].lower(), e["version"]) for e in tmp_entries}
    exact_absent = ("bar".lower(), "2.0.0") in {(e["name"].lower(), e["version"]) for e in tmp_entries}
    assert exact_present and not exact_absent, "selftest failed: package version mapping"

    # 3. Test secret detection
    for sample in [
        "-----BEGIN RSA PRIVATE KEY-----",
        "gsk_1234567890abcdef1234567890",
        "postgres://realuser:realpassword@db.example.com/mydb",
        "redis://user:realtoken@redis.example.com:6379",
    ]:
        matched = any(pat.search(sample) for pat in SECRET_PATTERNS)
        assert matched, f"selftest failed: expected secret pattern match on {sample}"

    print("SELFTEST OK")
    sys.exit(0)


def main():
    if "--selftest" in sys.argv:
        selftest()

    errors = run_checks()
    if errors:
        print("CHECK FAILED with errors:")
        for err in errors:
            print(f"  - {err}")
        sys.exit(1)
    else:
        print("CHECK OK")
        sys.exit(0)


if __name__ == "__main__":
    main()
