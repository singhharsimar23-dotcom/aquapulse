package com.aquapulse.common.event;

import java.time.Instant;

/**
 * Event published when trust verification and Bayesian reliability calculations finish.
 */
public record VerificationCompletedEvent(
        String readingId,
        String farmerId,
        String zoneId,
        Double reportedHours,
        Double electricityImpliedHours,
        Double trust,
        Double verifiedHours,
        Double zScore,
        boolean auditFlagged,
        Instant timestamp
) {}
