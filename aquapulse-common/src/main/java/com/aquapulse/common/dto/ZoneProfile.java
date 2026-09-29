package com.aquapulse.common.dto;

import java.time.Instant;

/**
 * Detailed profile of an aquifer assessment zone.
 */
public record ZoneProfile(
        String id,
        String gecUnit,
        Double dcritM,
        String region,
        Double currentStressScore,
        String currentTier,
        Double weeklyBudgetHours,
        Instant createdAt
) {}
