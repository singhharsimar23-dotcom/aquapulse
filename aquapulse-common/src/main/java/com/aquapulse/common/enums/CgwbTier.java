package com.aquapulse.common.enums;

/**
 * Central Ground Water Board (CGWB) groundwater exploitation assessment categories.
 */
public enum CgwbTier {
    SAFE(1.00, "<= 70%"),
    SEMI_CRITICAL(0.90, "70% - 90%"),
    CRITICAL(0.80, "90% - 100%"),
    OVER_EXPLOITED(0.65, "> 100%");

    private final double factor;
    private final String range;

    CgwbTier(double factor, String range) {
        this.factor = factor;
        this.range = range;
    }

    public double getFactor() {
        return factor;
    }

    public String getRange() {
        return range;
    }

    public static CgwbTier fromStressScore(double stressScorePct) {
        if (stressScorePct <= 70.0) return SAFE;
        if (stressScorePct <= 90.0) return SEMI_CRITICAL;
        if (stressScorePct <= 100.0) return CRITICAL;
        return OVER_EXPLOITED;
    }
}
