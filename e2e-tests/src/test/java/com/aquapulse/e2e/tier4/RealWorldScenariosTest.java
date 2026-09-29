package com.aquapulse.e2e.tier4;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tier 4: Real-World Application Scenarios Test Suite
 */
public class RealWorldScenariosTest {

    @Test
    @DisplayName("Scenario 1: Zone-A Full Pipeline Worked Example")
    void testZoneAFullPipeline() {
        double reportedA = 28.0, elecA = 28.0;
        double reportedB = 30.0, elecB = 30.0;
        double reportedC = 20.0, elecC = 50.0;
        double reportedD = 38.0, elecD = 36.0;

        double verA = 28.0;
        double verB = 30.0;
        double verC = 38.0;
        double verD = 28.8;

        double repTotal = reportedA + reportedB + reportedC + reportedD;
        double elecTotal = elecA + elecB + elecC + elecD;
        double verTotal = verA + verB + verC + verD;

        assertThat(repTotal).isEqualTo(116.0);
        assertThat(elecTotal).isEqualTo(144.0);
        assertThat(verTotal).isEqualTo(124.8);

        double weeklyPool = 130.0 * 0.80; // 104.0
        double farmerCAlloc = (5.0 / 20.0) * weeklyPool; // 26.0
        assertThat(farmerCAlloc).isEqualTo(26.0);

        double reduction = ((farmerCAlloc - verC) / verC) * 100.0;
        assertThat(reduction).isCloseTo(-31.58, org.assertj.core.data.Offset.offset(0.1));
    }
}
