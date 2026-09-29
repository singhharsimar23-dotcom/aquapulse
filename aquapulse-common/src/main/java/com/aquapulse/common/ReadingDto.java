package com.aquapulse.common;
public record ReadingDto(String farmerId, double reportedHours, double electricityImpliedHours, String prov, String sig) {}
