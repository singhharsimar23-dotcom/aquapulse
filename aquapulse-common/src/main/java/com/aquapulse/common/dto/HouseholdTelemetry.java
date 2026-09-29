package com.aquapulse.common.dto;

import com.aquapulse.common.enums.Provenance;
import java.time.Instant;

/**
 * Farmer or household extraction telemetry record.
 */
public record HouseholdTelemetry(
        String readingId,
        String farmerId,
        String zoneId,
        Instant timestamp,
        Double reportedHours,
        Double electricityHours,
        Double trustScore,
        Double verifiedHours,
        Provenance provenance,
        String signature
) {}
