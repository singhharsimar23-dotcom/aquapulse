package com.aquapulse.common.dto;

/**
 * Anti-hallucinating AI copilot bilingual explanation response.
 */
public record CopilotExplainResponse(
        String zoneId,
        String explanationEn,
        String explanationHi,
        boolean grounded,
        Double stressScore,
        Double confidence,
        Double poolHours
) {}
