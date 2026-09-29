package com.aquapulse.common.dto;

import com.aquapulse.common.enums.CgwbTier;
import java.time.Instant;
import java.util.List;
import java.util.Objects;

/**
 * Weekly allocation proposal subject to community review and Merkle certification.
 * Enforces Invariant 4 Traceability Metadata.
 */
public record AllocationProposal(
        String seasonId,
        String zoneId,
        Double stressScore,
        CgwbTier tier,
        Double weeklyPoolHours,
        TraceabilityMetadata traceability,
        List<FarmerAllocationItem> allocations,
        Instant generatedAt
) {
    public AllocationProposal {
        Objects.requireNonNull(seasonId, "seasonId must not be null");
        Objects.requireNonNull(zoneId, "zoneId must not be null");
        Objects.requireNonNull(traceability, "traceability must not be null (Hard Invariant 4)");
        Objects.requireNonNull(allocations, "allocations must not be null");
    }
}
