package com.aquapulse.common.dto;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TraceabilityMetadataTest {

    @Test
    @DisplayName("Valid metadata record constructs correctly")
    void testValidMetadata() {
        TraceabilityMetadata meta = new TraceabilityMetadata(0.80, 82.0, 1.0, 1.0, "theis-lentz-acsy-v8");
        assertThat(meta.mStar()).isEqualTo(0.80);
        assertThat(meta.confidence()).isEqualTo(82.0);
        assertThat(meta.kappaV()).isEqualTo(1.0);
        assertThat(meta.dataCoverage()).isEqualTo(1.0);
        assertThat(meta.modelHash()).isEqualTo("theis-lentz-acsy-v8");
    }

    @Test
    @DisplayName("Hard Invariant 4: Reject null mStar")
    void testNullMStar() {
        assertThatThrownBy(() -> new TraceabilityMetadata(null, 82.0, 1.0, 1.0, "theis-lentz-acsy-v8"))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Hard Invariant 4");
    }

    @Test
    @DisplayName("Hard Invariant 4: Reject null confidence")
    void testNullConfidence() {
        assertThatThrownBy(() -> new TraceabilityMetadata(0.80, null, 1.0, 1.0, "theis-lentz-acsy-v8"))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Hard Invariant 4");
    }

    @Test
    @DisplayName("Hard Invariant 4: Reject null kappaV")
    void testNullKappaV() {
        assertThatThrownBy(() -> new TraceabilityMetadata(0.80, 82.0, null, 1.0, "theis-lentz-acsy-v8"))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Hard Invariant 4");
    }

    @Test
    @DisplayName("Hard Invariant 4: Reject null dataCoverage")
    void testNullDataCoverage() {
        assertThatThrownBy(() -> new TraceabilityMetadata(0.80, 82.0, 1.0, null, "theis-lentz-acsy-v8"))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Hard Invariant 4");
    }

    @Test
    @DisplayName("Hard Invariant 4: Reject null modelHash")
    void testNullModelHash() {
        assertThatThrownBy(() -> new TraceabilityMetadata(0.80, 82.0, 1.0, 1.0, null))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Hard Invariant 4");
    }

    @Test
    @DisplayName("Reject out-of-bounds mStar (<0 or >1)")
    void testOutOfBoundsMStar() {
        assertThatThrownBy(() -> new TraceabilityMetadata(1.20, 82.0, 1.0, 1.0, "hash"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new TraceabilityMetadata(-0.1, 82.0, 1.0, 1.0, "hash"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("Reject out-of-bounds confidence (<0 or >100)")
    void testOutOfBoundsConfidence() {
        assertThatThrownBy(() -> new TraceabilityMetadata(0.80, 105.0, 1.0, 1.0, "hash"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
