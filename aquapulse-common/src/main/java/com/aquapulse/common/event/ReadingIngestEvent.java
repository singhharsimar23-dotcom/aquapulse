package com.aquapulse.common.event;

import com.aquapulse.common.enums.Provenance;
import java.time.Instant;

/**
 * Event published when raw pumping reading telemetry is ingested.
 */
public record ReadingIngestEvent(
        String id,
        String farmerId,
        String zoneId,
        Instant tEvent,
        Double reportedHours,
        Double electricityImpliedHours,
        Provenance prov,
        String sig
) {}
