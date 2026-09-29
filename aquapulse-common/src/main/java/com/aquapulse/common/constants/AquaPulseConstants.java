package com.aquapulse.common.constants;

/**
 * Immutable system constants for the AquaPulse v8 Guaranteed Groundwater Ledger.
 * Non-negotiable domain invariants are enforced here at compile-time.
 */
public final class AquaPulseConstants {

    private AquaPulseConstants() {
        throw new UnsupportedOperationException("AquaPulseConstants is a static utility class and cannot be instantiated.");
    }

    // ==========================================
    // HARD INVARIANT 1: Dignity Water Floor
    // ==========================================
    /**
     * Non-negotiable human sustenance dignity floor in cubic meters (m^3).
     * Must never be accepted as a request parameter or overridden from an arbitrary database column.
     */
    public static final double DIGNITY_FLOOR_M3 = 5.0;

    // ==========================================
    // Game-Theoretic Karma Allocation Constants
    // ==========================================
    /**
     * Common-pool redistribution factor alpha (35% of winning bids returned to all participants).
     */
    public static final double DEFAULT_KARMA_ALPHA = 0.35;

    /**
     * Initial karma balance credited to newly registered farmers.
     */
    public static final double INITIAL_FARMER_KARMA = 10.0;

    // ==========================================
    // Physics & Bayesian Guarantee Constants
    // ==========================================
    /**
     * Minimum Effective Sample Size (ESS) enforced via bisection posterior tempering.
     */
    public static final double ESS_MIN = 150.0;

    /**
     * Student-t likelihood degrees of freedom for robust heavy-tailed observation weighting.
     */
    public static final double STUDENT_T_NU = 4.0;

    /**
     * Standard observation noise standard deviation (meters) for aquifer drawdown.
     */
    public static final double SIGMA_OBS = 0.5;

    // ==========================================
    // ACSY (Adaptive Conformal Safe-Yield) Constants
    // ==========================================
    /**
     * Target miscoverage rate alpha (10% error budget for 90% confidence).
     */
    public static final double ACSY_ALPHA = 0.10;

    /**
     * Conformal learning rate step size eta.
     */
    public static final double ACSY_ETA = 0.30;

    /**
     * Hard lower clamp on log kappa_v.
     */
    public static final double KAPPA_MIN = -1.5;

    /**
     * Hard upper clamp on log kappa_v.
     */
    public static final double KAPPA_MAX = 3.0;

    /**
     * Default baseline conformal scale factor kappa_v.
     */
    public static final double DEFAULT_KAPPA = 1.0;

    // ==========================================
    // Cryptographic Merkle Receipts Constants
    // ==========================================
    /**
     * Domain separation prefix for leaf hash: SHA256(0x00 || salt || "||" || value)
     */
    public static final byte MERKLE_LEAF_PREFIX = 0x00;

    /**
     * Domain separation prefix for node hash: SHA256(0x01 || left || right)
     */
    public static final byte MERKLE_NODE_PREFIX = 0x01;

    /**
     * Deterministic SHA-256 root hash for an empty Merkle tree (SHA256(0x01)).
     */
    public static final String EMPTY_MERKLE_ROOT = "4bf5122f344554c53bde2ebb8cd2b7e3d1600ad631c385a5d7cce23c7785459a";

    // ==========================================
    // AI Copilot Guardrails Constants
    // ==========================================
    /**
     * Maximum permissible numeric deviation (+/- 0.05) between LLM token and source DTO.
     */
    public static final double NUMERIC_GROUNDING_TOLERANCE = 0.05;

    /**
     * Deterministic fallback message format for ungrounded LLM numeric output.
     */
    public static final String DETERMINISTIC_FALLBACK_TEMPLATE =
            "Zone %s is %s at %.1f%% of its safe weekly budget (%.1f%% confidence). This week's pool is %.1f hours.";

    // ==========================================
    // Kafka Topic Names
    // ==========================================
    public static final String TOPIC_READINGS_INGESTED = "readings-ingested";
    public static final String TOPIC_VERIFICATIONS_COMPLETED = "verifications-completed";
    public static final String TOPIC_DRAWDOWN_UPDATES = "drawdown-updates";
    public static final String TOPIC_ALLOCATIONS_PUBLISHED = "allocations-published";
    public static final String TOPIC_RULE_PROPOSALS = "rule-proposals-events";
}
