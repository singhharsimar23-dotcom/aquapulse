package com.aquapulse.common.enums;

/**
 * Status workflow for human auditor review queue.
 */
public enum AuditStatus {
    OPEN,
    INVESTIGATING,
    RESOLVED,
    ESCALATED,
    VERIFIED,
    DISMISSED
}
