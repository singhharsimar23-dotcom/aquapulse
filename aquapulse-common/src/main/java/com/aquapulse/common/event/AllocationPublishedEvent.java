package com.aquapulse.common.event;

import com.aquapulse.common.dto.FarmerAllocationItem;
import com.aquapulse.common.dto.TraceabilityMetadata;
import com.aquapulse.common.enums.CgwbTier;
import java.time.Instant;
import java.util.List;

/**
 * Event published when a weekly allocation pool is calculated and certified with a Merkle root.
 */
public record AllocationPublishedEvent(
        String seasonId,
        String zoneId,
        Double stressScore,
        CgwbTier tier,
        Double weeklyPool,
        TraceabilityMetadata traceability,
        String merkleRoot,
        List<FarmerAllocationItem> allocations,
        Instant timestamp
) {}
