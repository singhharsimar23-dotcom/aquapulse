package com.aquapulse.allocation;

import com.aquapulse.common.*;
import java.time.Instant;
import java.util.*;

public class AllocationEngine {
    public record FarmerInput(String farmerId, double acres, double verifiedHours) {}

    public static AllocationResult allocate(String zoneId, String season, List<FarmerInput> farmers,
            double budgetHours, double mStar, double confidence, double kappaV, String modelHash) {
        double totalAcres = farmers.stream().mapToDouble(FarmerInput::acres).sum();
        double verifiedTotal = farmers.stream().mapToDouble(FarmerInput::verifiedHours).sum();
        double stressPct = budgetHours > 0 ? (verifiedTotal / budgetHours) * 100.0 : 0.0;
        double tierF = tierFactor(stressPct);
        double pool = budgetHours * tierF * mStar;

        List<String> leafHashes = new ArrayList<>();
        List<String> salts = new ArrayList<>(), values = new ArrayList<>();
        for (FarmerInput f : farmers) {
            double h = totalAcres > 0 ? (f.acres() / totalAcres) * pool : 0;
            // enforce dignity floor
            h = Math.max(h, AquaPulseConstants.DIGNITY_FLOOR_M3);
            String salt = "s_" + f.farmerId() + "_" + Instant.now().toEpochMilli();
            String val = f.farmerId() + ":" + String.format("%.4f", h);
            salts.add(salt); values.add(val);
            leafHashes.add(MerkleTree.leafHash(salt, val));
        }
        MerkleTree.TreeResult tree = MerkleTree.buildTree(leafHashes);
        List<FarmerAllocation> allocs = new ArrayList<>();
        for (int i = 0; i < farmers.size(); i++) {
            FarmerInput f = farmers.get(i);
            double h = totalAcres > 0 ? (f.acres() / totalAcres) * pool : 0;
            h = Math.max(h, AquaPulseConstants.DIGNITY_FLOOR_M3);
            List<FarmerAllocation.MerkleProofStep> proof = tree.proofs().get(i).stream()
                .map(s -> new FarmerAllocation.MerkleProofStep(s.siblingHex(), s.isRight())).toList();
            allocs.add(new FarmerAllocation(f.farmerId(), f.acres(), h, MerkleTree.leafHash(salts.get(i), values.get(i)), salts.get(i), values.get(i), proof));
        }
        return new AllocationResult(zoneId, season, verifiedTotal, stressPct, category(stressPct), pool,
            new TraceabilityMetadata(mStar, confidence, kappaV, 1.0, modelHash), tree.root(), allocs);
    }

    static String category(double p) {
        if (p > 100) return "Over-exploited"; if (p >= 90) return "Critical"; if (p > 70) return "Semi-Critical"; return "Safe";
    }
    static double tierFactor(double p) {
        if (p > 100) return 0.65; if (p >= 90) return 0.80; if (p > 70) return 0.90; return 1.00;
    }
}
