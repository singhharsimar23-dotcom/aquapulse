package com.aquapulse.common.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.Map;

/**
 * Community water rule change proposal submission payload.
 */
public record RuleProposalRequest(
        @NotBlank String proposedBy,
        @NotBlank String rawText,
        Map<String, Object> structuredJson,
        Map<String, Object> safetyFlags
) {}
