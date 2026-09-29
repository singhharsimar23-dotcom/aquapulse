package com.aquapulse.common.dto;

import com.aquapulse.common.enums.Provenance;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.time.Instant;

/**
 * REST ingestion payload for self-reported and electricity-implied pump readings.
 */
public record ReadingIngestRequest(
        @NotBlank String farmerId,
        @NotNull Instant tEvent,
        @PositiveOrZero Double reportedHours,
        @PositiveOrZero Double electricityImpliedHours,
        @NotNull Provenance prov,
        String sig
) {}
