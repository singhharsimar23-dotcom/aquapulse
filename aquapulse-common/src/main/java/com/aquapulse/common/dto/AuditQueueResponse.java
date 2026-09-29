package com.aquapulse.common.dto;

import java.time.Instant;

/**
 * Representation of an escalated anomaly record for human auditor review.
 */
public record AuditQueueResponse(
        Long id,
        String farmerId,
        String seasonId,
        Double zScore,
        String status,
        String verifiedBy,
        Instant createdAt
) {}
