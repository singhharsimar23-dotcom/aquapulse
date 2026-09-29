package com.aquapulse.common.dto;

import com.aquapulse.common.merkle.MerkleTree;
import java.util.List;

/**
 * Individual farmer water permit allocation item with cryptographic receipt proof.
 */
public record FarmerAllocationItem(
        String farmerId,
        Double acres,
        Double hours,
        Double creditsSpent,
        String certHash,
        List<MerkleTree.ProofStep> proof
) {}
