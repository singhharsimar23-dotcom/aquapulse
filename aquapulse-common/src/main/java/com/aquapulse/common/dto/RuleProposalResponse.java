package com.aquapulse.common.dto;

import java.time.Instant;
import java.util.Map;

/**
 * Representation of a stored rule proposal with evaluation status.
 */
public record RuleProposalResponse(
        String id,
        String proposedBy,
        String rawText,
        Map<String, Object> structuredJson,
        Map<String, Object> safetyFlags,
        String status,
        Instant createdAt,
        Instant reviewedAt
) {}
