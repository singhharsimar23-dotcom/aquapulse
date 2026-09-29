package com.aquapulse.common.dto;

import com.aquapulse.common.enums.AuditStatus;
import java.time.Instant;

/**
 * Audit dispute or flag record for contested pumping verifications.
 */
public record DisputeRecord(
        Long disputeId,
        String farmerId,
        String seasonId,
        Double reportedHours,
        Double electricityHours,
        Double calculatedTrust,
        Double zScore,
        AuditStatus status,
        String assignedAuditor,
        String resolutionNotes,
        Instant openedAt,
        Instant resolvedAt
) {}
