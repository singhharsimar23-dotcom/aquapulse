package com.aquapulse.common.dto;

/**
 * Result of client-side or gateway Merkle receipt verification.
 */
public record MerkleVerifyResponse(
        String certHash,
        String merkleRoot,
        boolean verified,
        String message
) {}
