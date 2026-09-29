package com.aquapulse.common.dto;

/**
 * Public response describing zone aquifer stress, pool allocation, and safe-yield bounds.
 */
public record ZoneStatusResponse(
        String zoneId,
        Double stressScore,
        String category,
        Double weeklyPool,
        Double confidence,
        Double capMultiplier,
        Double kappaV
) {}
