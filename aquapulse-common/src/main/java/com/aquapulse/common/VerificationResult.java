package com.aquapulse.common;
public record VerificationResult(String readingId, String farmerId, double reportedHours, double electricityImpliedHours, double trust, double verifiedHours, double zScore, boolean auditFlagged, double meanReliability) {}
