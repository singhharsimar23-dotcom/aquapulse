package com.aquapulse.common.enums;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CgwbTierTest {

    @Test
    @DisplayName("CgwbTier correctly maps stress scores to CGWB categories and tier factors")
    void testStressScoreMapping() {
        // Safe: <= 70%, factor 1.00
        assertThat(CgwbTier.fromStressScore(50.0)).isEqualTo(CgwbTier.SAFE);
        assertThat(CgwbTier.fromStressScore(70.0)).isEqualTo(CgwbTier.SAFE);
        assertThat(CgwbTier.SAFE.getFactor()).isEqualTo(1.00);

        // Semi-Critical: 70% < s <= 90%, factor 0.90
        assertThat(CgwbTier.fromStressScore(70.1)).isEqualTo(CgwbTier.SEMI_CRITICAL);
        assertThat(CgwbTier.fromStressScore(85.0)).isEqualTo(CgwbTier.SEMI_CRITICAL);
        assertThat(CgwbTier.fromStressScore(90.0)).isEqualTo(CgwbTier.SEMI_CRITICAL);
        assertThat(CgwbTier.SEMI_CRITICAL.getFactor()).isEqualTo(0.90);

        // Critical: 90% < s <= 100%, factor 0.80 (Zone-A benchmark at 96.0%)
        assertThat(CgwbTier.fromStressScore(90.1)).isEqualTo(CgwbTier.CRITICAL);
        assertThat(CgwbTier.fromStressScore(96.0)).isEqualTo(CgwbTier.CRITICAL);
        assertThat(CgwbTier.fromStressScore(100.0)).isEqualTo(CgwbTier.CRITICAL);
        assertThat(CgwbTier.CRITICAL.getFactor()).isEqualTo(0.80);

        // Over-Exploited: > 100%, factor 0.65
        assertThat(CgwbTier.fromStressScore(100.1)).isEqualTo(CgwbTier.OVER_EXPLOITED);
        assertThat(CgwbTier.fromStressScore(150.0)).isEqualTo(CgwbTier.OVER_EXPLOITED);
        assertThat(CgwbTier.OVER_EXPLOITED.getFactor()).isEqualTo(0.65);
    }
}
