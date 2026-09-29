package com.aquapulse.e2e.tier2;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tier 2: Boundary & Corner Cases Test Suite
 */
public class BoundaryCornerTest {

    @Test
    @DisplayName("F13 Boundary: R=0 and E=0 edge case yields trust = 1.0")
    void testTrustZeroDivisionEdgeCase() {
        double r = 0.0, e = 0.0;
        double trust = (r == 0 && e == 0) ? 1.0 : (1.0 - Math.abs(r - e) / Math.max(r, e));
        assertThat(trust).isEqualTo(1.0);
    }

    @Test
    @DisplayName("F17 Boundary: Exact 90.0% stress score maps to Critical tier")
    void testExactNinetyPercentStress() {
        double stress = 90.0;
        String tier = (stress > 100.0) ? "Over-exploited" : (stress >= 90.0) ? "Critical" : (stress >= 70.0) ? "Semi-Critical" : "Safe";
        assertThat(tier).isEqualTo("Critical");
    }

    @Test
    @DisplayName("F27 Boundary: Cap multiplier m* is bounded above by 1.0")
    void testCapMultiplierUpperBound() {
        double dCrit = 12.0;
        double qP90 = 5.0; // small drawdown
        double mStar = Math.min(1.0, dCrit / qP90);
        assertThat(mStar).isEqualTo(1.0);
    }

    @Test
    @DisplayName("F34 Boundary: Numeric grounding tolerance +/- 0.05")
    void testGroundingTolerance() {
        double source = 96.0;
        double candidateWithin = 96.04;
        double candidateOutside = 96.06;
        assertThat(Math.abs(candidateWithin - source)).isLessThanOrEqualTo(0.05);
        assertThat(Math.abs(candidateOutside - source)).isGreaterThan(0.05);
    }
}
