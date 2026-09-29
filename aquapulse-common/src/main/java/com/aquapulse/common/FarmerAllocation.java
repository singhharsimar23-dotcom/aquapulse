package com.aquapulse.common;
import java.util.List;
public record FarmerAllocation(String farmerId, double acres, double hours, String certHash, String salt, String value, List<MerkleProofStep> merkleProof) {
    public record MerkleProofStep(String siblingHex, boolean isRight) {}
}
