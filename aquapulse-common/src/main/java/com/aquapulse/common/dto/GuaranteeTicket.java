package com.aquapulse.common.dto;

import java.time.Instant;
import java.util.Objects;

/**
 * Conformal safe-yield guarantee ticket certifying physical sustainability bounds.
 * Enforces Invariant 4 Traceability Metadata.
 */
public record GuaranteeTicket(
        String ticketId,
        String zoneId,
        Double forecastDrawdownP90,
        Double criticalDrawdownDcrit,
        Double safeYieldCapMultiplier,
        TraceabilityMetadata traceability,
        boolean guaranteeSatisfied,
        Instant certifiedAt
) {
    public GuaranteeTicket {
        Objects.requireNonNull(ticketId, "ticketId must not be null");
        Objects.requireNonNull(zoneId, "zoneId must not be null");
        Objects.requireNonNull(traceability, "traceability must not be null (Hard Invariant 4)");
    }
}
