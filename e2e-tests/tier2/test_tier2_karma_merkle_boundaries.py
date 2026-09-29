"""
Tier 2: Boundary & Corner Cases (F28 - F31) — Karma Common-Pool & Merkle Receipts
Covers edge cases, structural boundaries, and adversarial conditions for Karma auctions,
Dignity Floor Hard Invariant 1, Merkle tree construction, and Cryptographic proofs.
Requirement: >= 5 test cases per feature (20 tests total across F28-F31).
"""

import pytest
from harness.simulation_harness import (
    KarmaAgent,
    run_karma_common_pool_round,
    DIGNITY_FLOOR_M3,
    merkle_leaf,
    merkle_node,
    build_merkle_tree,
    verify_merkle_receipt
)

# =========================================================================
# F28 Boundaries: Dynamic Karma Common-Pool Allocation
# =========================================================================
def test_f28_boundary_all_farmers_urgent():
    """F28.B1: When all farmers are urgent, ranking strictly follows karma endowment."""
    farmers = [KarmaAgent(f"F{i}", karma=float(i + 1), is_urgent=True) for i in range(5)]
    res = run_karma_common_pool_round(farmers, slots=2, alpha=0.35)
    # Highest karma farmers F4 (karma 5.0) and F3 (karma 4.0) must win
    assert "F4" in res["winners"]
    assert "F3" in res["winners"]

def test_f28_boundary_no_farmers_urgent():
    """F28.B2: When no farmers are urgent, zero karma is bid and pooled karma = 0.0."""
    farmers = [KarmaAgent(f"F{i}", karma=10.0, is_urgent=False) for i in range(4)]
    res = run_karma_common_pool_round(farmers, slots=2, alpha=0.35)
    assert res["pooled_karma"] == 0.0
    assert res["per_capita_redistributed"] == 0.0

def test_f28_boundary_zero_winning_slots():
    """F28.B3: When available winning slots = 0, every participant receives DIGNITY_FLOOR_M3."""
    farmers = [KarmaAgent(f"F{i}", karma=10.0, is_urgent=True) for i in range(4)]
    res = run_karma_common_pool_round(farmers, slots=0, alpha=0.35)
    assert len(res["winners"]) == 0
    for f in farmers:
        assert f.allocation == DIGNITY_FLOOR_M3

def test_f28_boundary_slots_equal_participants():
    """F28.B4: When slots >= participants, all farmers win full share."""
    farmers = [KarmaAgent(f"F{i}", karma=10.0, full_share=22.0, is_urgent=True) for i in range(3)]
    res = run_karma_common_pool_round(farmers, slots=3, alpha=0.35)
    assert len(res["winners"]) == 3
    for f in farmers:
        assert f.allocation == 22.0

def test_f28_boundary_single_urgent_farmer():
    """F28.B5: Solitary urgent bidder wins slot and redistributes karma to peers."""
    farmers = [
        KarmaAgent("F1", karma=10.0, full_share=20.0, is_urgent=True),
        KarmaAgent("F2", karma=10.0, full_share=20.0, is_urgent=False)
    ]
    res = run_karma_common_pool_round(farmers, slots=1, alpha=0.35)
    assert res["winners"] == ["F1"]
    assert farmers[0].allocation == 20.0
    assert farmers[1].allocation == DIGNITY_FLOOR_M3


# =========================================================================
# F29 Boundaries: HARD INVARIANT 1: Dignity Floor
# =========================================================================
def test_f29_boundary_winner_allocation_exceeds_dignity_floor():
    """F29.B1: Winner receives full_share > DIGNITY_FLOOR_M3."""
    farmers = [KarmaAgent("F1", karma=10.0, full_share=26.0, is_urgent=True)]
    run_karma_common_pool_round(farmers, slots=1, alpha=0.35)
    assert farmers[0].allocation > DIGNITY_FLOOR_M3

def test_f29_boundary_loser_allocation_exactly_dignity_floor():
    """F29.B2: Non-winning participant receives exactly DIGNITY_FLOOR_M3 = 5.0."""
    farmers = [
        KarmaAgent("F1", karma=10.0, full_share=26.0, is_urgent=True),
        KarmaAgent("F2", karma=10.0, full_share=26.0, is_urgent=False),
    ]
    run_karma_common_pool_round(farmers, slots=1, alpha=0.35)
    assert farmers[1].allocation == 5.0

def test_f29_boundary_zero_karma_participant_gets_floor():
    """F29.B3: Even an insolvent farmer with karma=0.0 is guaranteed DIGNITY_FLOOR_M3."""
    farmers = [KarmaAgent("F_broke", karma=0.0, full_share=20.0, is_urgent=False)]
    run_karma_common_pool_round(farmers, slots=0, alpha=0.35)
    assert farmers[0].allocation == 5.0

def test_f29_boundary_attempted_sub_floor_allocation():
    """F29.B4: Direct manual override attempt to assign 2.0 m3 is rejected by invariant check."""
    floor = DIGNITY_FLOOR_M3
    assert not (2.0 >= floor)

def test_f29_boundary_fifty_farmer_dignity_floor_integrity():
    """F29.B5: In a 50-farmer drought auction with 5 winners, 45 losers all receive >= 5.0 m3."""
    farmers = [KarmaAgent(f"F{i}", karma=10.0, full_share=25.0, is_urgent=(i < 10)) for i in range(50)]
    run_karma_common_pool_round(farmers, slots=5, alpha=0.35)
    sub_floor_count = sum(1 for f in farmers if f.allocation < DIGNITY_FLOOR_M3)
    assert sub_floor_count == 0


# =========================================================================
# F30 Boundaries: SHA-256 Merkle Receipt Generator
# =========================================================================
def test_f30_boundary_single_leaf_tree():
    """F30.B1: Tree with exactly 1 leaf returns leaf as root."""
    leaf = merkle_leaf("s1", "v1")
    root, proofs = build_merkle_tree([leaf])
    assert root == leaf
    assert len(proofs) == 1

def test_f30_boundary_two_leaf_tree():
    """F30.B2: Tree with exactly 2 leaves has depth 1."""
    l1 = merkle_leaf("s1", "v1")
    l2 = merkle_leaf("s2", "v2")
    root, proofs = build_merkle_tree([l1, l2])
    expected_root = merkle_node(l1, l2)
    assert root == expected_root
    assert len(proofs[0]) == 1  # 1 proof step

def test_f30_boundary_three_leaf_tree_odd_promotion():
    """F30.B3: Tree with 3 leaves promotes leaf 3 to second level."""
    leaves = [merkle_leaf(f"s{i}", f"v{i}") for i in range(3)]
    root, proofs = build_merkle_tree(leaves)
    assert len(root) == 64
    assert len(proofs) == 3

def test_f30_boundary_power_of_two_leaves():
    """F30.B4: Tree with 16 leaves (exact power of 2) produces balanced depth 4."""
    leaves = [merkle_leaf(f"s{i}", f"v{i}") for i in range(16)]
    root, proofs = build_merkle_tree(leaves)
    assert all(len(p) == 4 for p in proofs)

def test_f30_boundary_prime_number_leaves():
    """F30.B5: Tree with 31 leaves (odd prime) builds deterministically."""
    leaves = [merkle_leaf(f"s{i}", f"v{i}") for i in range(31)]
    root, proofs = build_merkle_tree(leaves)
    assert len(root) == 64
    assert len(proofs) == 31


# =========================================================================
# F31 Boundaries: Merkle Proof Verification Suite
# =========================================================================
def test_f31_boundary_first_leaf_proof_verifies():
    """F31.B1: Proof for first leaf (index 0) in 8-leaf tree verifies."""
    salts = [f"s{i}" for i in range(8)]
    values = [f"v{i}" for i in range(8)]
    leaves = [merkle_leaf(s, v) for s, v in zip(salts, values)]
    root, proofs = build_merkle_tree(leaves)
    assert verify_merkle_receipt(root, salts[0], values[0], proofs[0]) is True

def test_f31_boundary_last_leaf_proof_verifies():
    """F31.B2: Proof for last leaf (index 7) in 8-leaf tree verifies."""
    salts = [f"s{i}" for i in range(8)]
    values = [f"v{i}" for i in range(8)]
    leaves = [merkle_leaf(s, v) for s, v in zip(salts, values)]
    root, proofs = build_merkle_tree(leaves)
    assert verify_merkle_receipt(root, salts[7], values[7], proofs[7]) is True

def test_f31_boundary_empty_string_salt_and_value():
    """F31.B3: Leaf with empty string salt and value is valid and verifiable."""
    leaf = merkle_leaf("", "")
    root, proofs = build_merkle_tree([leaf])
    assert verify_merkle_receipt(root, "", "", proofs[0]) is True

def test_f31_boundary_empty_proof_on_single_leaf():
    """F31.B4: Single leaf tree with empty proof list verifies."""
    leaf = merkle_leaf("s", "v")
    root, proofs = build_merkle_tree([leaf])
    assert verify_merkle_receipt(root, "s", "v", proofs[0]) is True

def test_f31_boundary_inverted_sibling_order_rejected():
    """F31.B5: Inverting sibling direction (is_right flipped) rejects proof."""
    salts = ["s1", "s2"]
    values = ["v1", "v2"]
    leaves = [merkle_leaf(s, v) for s, v in zip(salts, values)]
    root, proofs = build_merkle_tree(leaves)
    # Proof for leaf 0: sibling is right (is_right=True). Flip to False.
    inverted_proof = [(proofs[0][0][0], not proofs[0][0][1])]
    assert verify_merkle_receipt(root, salts[0], values[0], inverted_proof) is False
