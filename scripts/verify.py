#!/usr/bin/env python3
"""scripts/verify.py
Verification runner for AquaPulse conforming to AQUAPULSE_V9_2_LEAN.md §A.
Usage:
    python scripts/verify.py [SESSION_ID]
Runs:
    1. preflight (network check)
    2. oracle selftest
    3. scripts/check.py
Logs output tee'd to docs/evidence/<SESSION_ID>.log with `<git SHA> <UTC timestamp>` on first line.
"""

import datetime
import os
import subprocess
import sys
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent


def get_git_sha():
    try:
        res = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=True,
        )
        return res.stdout.strip()
    except Exception:
        return "unknown_sha"


def run_preflight():
    urls = [
        "https://registry.npmjs.org/",
        "https://earth-search.aws.element84.com/v1",
    ]
    for url in urls:
        req = urllib.request.Request(url, headers={"User-Agent": "AquaPulse-Preflight/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status not in (200, 204, 301, 302):
                raise RuntimeError(f"Preflight failed for {url}: status {resp.status}")
    return "PREFLIGHT OK"


def run_command(cmd, log_file, cwd=None):
    effective_cwd = cwd if cwd is not None else REPO_ROOT
    print(f"=== Running: {' '.join(cmd)} in {effective_cwd} ===")
    log_file.write(f"=== Running: {' '.join(cmd)} in {effective_cwd} ===\n")
    proc = subprocess.run(
        cmd,
        cwd=effective_cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    sys.stdout.write(proc.stdout)
    log_file.write(proc.stdout)
    log_file.flush()
    if proc.returncode != 0:
        raise RuntimeError(f"Command failed with exit code {proc.returncode}: {' '.join(cmd)}")


def main():
    session_id = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("-") else "default"
    if session_id.startswith("S="):
        session_id = session_id[2:]

    evidence_dir = REPO_ROOT / "docs" / "evidence"
    evidence_dir.mkdir(parents=True, exist_ok=True)
    log_path = evidence_dir / f"{session_id}.log"

    git_sha = get_git_sha()
    utc_now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    header_line = f"{git_sha} {utc_now}"

    with open(log_path, "w", encoding="utf-8") as log_file:
        print(header_line)
        log_file.write(header_line + "\n")
        log_file.flush()

        # Step 1: Preflight
        try:
            print("=== Preflight network check ===")
            log_file.write("=== Preflight network check ===\n")
            res = run_preflight()
            print(res)
            log_file.write(res + "\n")
            log_file.flush()
        except Exception as err:
            msg = f"PREFLIGHT FAILED: {err}"
            print(msg, file=sys.stderr)
            log_file.write(msg + "\n")
            sys.exit(1)

        # Step 2: Oracle selftest
        try:
            run_command([sys.executable, "reference/aquapulse_ref.py", "--selftest"], log_file)
        except Exception as err:
            print(str(err), file=sys.stderr)
            sys.exit(1)

        # Step 3: check.py selftest & verification
        try:
            run_command([sys.executable, "scripts/check.py", "--selftest"], log_file)
            run_command([sys.executable, "scripts/check.py"], log_file)
        except Exception as err:
            print(str(err), file=sys.stderr)
            sys.exit(1)

        # Step 4: Core Vitest parity & property tests (S1b)
        core_dir = REPO_ROOT / "packages" / "core"
        if core_dir.exists() and (core_dir / "package.json").exists():
            try:
                import shutil
                npx_bin = shutil.which("npx") or "npx"
                run_command([npx_bin, "vitest", "run"], log_file, cwd=core_dir)
            except Exception as err:
                print(str(err), file=sys.stderr)
                sys.exit(1)

    print(f"\nVerification passed! Evidence written to {log_path}")


if __name__ == "__main__":
    main()
