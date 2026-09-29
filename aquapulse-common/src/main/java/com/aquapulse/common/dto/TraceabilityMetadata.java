package com.aquapulse.common.dto;

import java.util.Objects;

/**
 * Hard Invariant 4: Allocation and drawdown traceability metadata.
 * No allocation or physics payload may be published without complete provenance.
 */
public record TraceabilityMetadata(
        Double mStar,
        Double confidence,
        Double kappaV,
        Double dataCoverage,
        String modelHash
) {
    public TraceabilityMetadata {
        Objects.requireNonNull(mStar, "mStar must not be null (Hard Invariant 4)");
        Objects.requireNonNull(confidence, "confidence must not be null (Hard Invariant 4)");
        Objects.requireNonNull(kappaV, "kappaV must not be null (Hard Invariant 4)");
        Objects.requireNonNull(dataCoverage, "dataCoverage must not be null (Hard Invariant 4)");
        Objects.requireNonNull(modelHash, "modelHash must not be null (Hard Invariant 4)");

        if (mStar < 0.0 || mStar > 1.0) {
            throw new IllegalArgumentException("mStar must be clamped in [0.0, 1.0], was: " + mStar);
        }
        if (confidence < 0.0 || confidence > 100.0) {
            throw new IllegalArgumentException("confidence must be between 0.0 and 100.0, was: " + confidence);
        }
        if (dataCoverage < 0.0 || dataCoverage > 1.0) {
            throw new IllegalArgumentException("dataCoverage ratio must be between 0.0 and 1.0, was: " + dataCoverage);
        }
    }
}
