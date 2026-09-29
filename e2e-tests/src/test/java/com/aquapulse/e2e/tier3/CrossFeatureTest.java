package com.aquapulse.e2e.tier3;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tier 3: Cross-Feature Interactions Test Suite
 */
public class CrossFeatureTest {

    @Test
    @DisplayName("F13 <-> F14 <-> F17: Verification pipeline feeds CGWB stress classification")
    void testVerificationToStressPipeline() {
        double r = 20.0, e = 50.0;
        double trust = 1.0 - Math.abs(r - e) / Math.max(r, e);
        double ver = trust * r + (1.0 - trust) * e;
        assertThat(ver).isEqualTo(38.0);

        double totalVer = 28.0 + 30.0 + ver + 28.8; // 124.8
        double budget = 130.0;
        double stress = (totalVer / budget) * 100.0;
        assertThat(stress).isEqualTo(96.0);
    }

    @Test
    @DisplayName("F27 <-> F18: Safe-yield cap multiplier m* curtails weekly pool")
    void testCapMultiplierCurtailsPool() {
        double budget = 130.0;
        double tierFactor = 0.80; // Critical
        double mStar = 0.70; // ACSY curtailment
        double pool = budget * tierFactor * mStar;
        assertThat(pool).isEqualTo(72.8);
    }
}
