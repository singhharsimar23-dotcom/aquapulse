"""
AquaPulse v8 — Unified E2E Test Suite Runner
Executes Tiers 1-4 with detailed reporting across all 44 features.
Usage:
  python e2e-tests/run_e2e.py [--tier 1|2|3|4|all] [--target sim|cloud]
"""

import sys
import os
import time
import argparse

# Ensure e2e-tests and root are in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

import pytest

def run_suite(tier_selection="all", target="sim"):
    os.environ["AQUAPULSE_TEST_TARGET"] = target
    print("=" * 80)
    print("    AQUAPULSE v8 — E2E TEST SUITE RUNNER")
    print(f"    Target Environment : {target.upper()}")
    print(f"    Selected Tier      : {tier_selection.upper()}")
    print("=" * 80)

    pytest_args = ["-v", "--tb=short"]

    if tier_selection == "1":
        pytest_args.append(os.path.join(current_dir, "tier1"))
    elif tier_selection == "2":
        pytest_args.append(os.path.join(current_dir, "tier2"))
    elif tier_selection == "3":
        pytest_args.append(os.path.join(current_dir, "tier3"))
    elif tier_selection == "4":
        pytest_args.append(os.path.join(current_dir, "tier4"))
    else:
        pytest_args.extend([
            os.path.join(current_dir, "tier1"),
            os.path.join(current_dir, "tier2"),
            os.path.join(current_dir, "tier3"),
            os.path.join(current_dir, "tier4")
        ])

    start_time = time.time()
    exit_code = pytest.main(pytest_args)
    duration = time.time() - start_time

    print("=" * 80)
    if exit_code == 0:
        print(f"    STATUS: SUCCESS (100% Pass in {duration:.2f}s)")
    else:
        print(f"    STATUS: FAILURE (Exit code {exit_code} in {duration:.2f}s)")
    print("=" * 80)
    return exit_code

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AquaPulse v8 E2E Test Suite Runner")
    parser.add_argument("--tier", default="all", choices=["1", "2", "3", "4", "all"], help="Test tier to execute")
    parser.add_argument("--target", default="sim", choices=["sim", "cloud"], help="Execution target (sim or cloud)")
    args = parser.parse_args()

    code = run_suite(tier_selection=args.tier, target=args.target)
    sys.exit(code)
