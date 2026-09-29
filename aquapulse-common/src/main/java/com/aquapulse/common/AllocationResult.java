package com.aquapulse.common;
import java.util.List;
public record AllocationResult(String zoneId, String season, double verifiedTotal, double stressScorePct, String category, double weeklyPool, TraceabilityMetadata traceability, String merkleRoot, List<FarmerAllocation> allocations) {}
