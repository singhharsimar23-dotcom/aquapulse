package com.aquapulse.common.event;

import com.aquapulse.common.dto.TraceabilityMetadata;
import java.time.Instant;

/**
 * Event published when the aquifer physics engine calculates updated safe-yield parameters.
 */
public record DrawdownUpdateEvent(
        String zoneId,
        TraceabilityMetadata traceability,
        Instant timestamp
) {}
