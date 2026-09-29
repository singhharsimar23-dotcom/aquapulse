package com.aquapulse.common;

public final class AquaPulseConstants {
    private AquaPulseConstants() {}
    public static final double DIGNITY_FLOOR_M3 = 5.0; // HARD INVARIANT 1 — never from DB/request
    public static final double KARMA_ALPHA = 0.35;
    public static final byte MERKLE_LEAF_PREFIX = 0x00;
    public static final byte MERKLE_NODE_PREFIX = 0x01;
    public static final double ACSY_ALPHA = 0.10;
    public static final double ACSY_ETA = 0.30;
    public static final double ACSY_KAPPA_LOG_MIN = -1.5;
    public static final double ACSY_KAPPA_LOG_MAX = 3.0;
    public static final double ACSY_ESS_MIN = 150.0;
    public static final double EULER_GAMMA = 0.5772156649015329;
    public static final String MODEL_HASH = "theis-lentz-acsy-v8";
}
