package com.aquapulse.common.merkle;

import com.aquapulse.common.constants.AquaPulseConstants;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Objects;

/**
 * High-performance SHA-256 Binary Merkle Tree for AquaPulse v8 Water Ledger Receipts.
 * Implements leaf domain separation (0x00) and node domain separation (0x01).
 * Exactly matches stress/aquapulse_stress.py reference implementation.
 */
public final class MerkleTree {

    private static final HexFormat HEX_FORMAT = HexFormat.of();
    private static final byte[] SEPARATOR = "||".getBytes(StandardCharsets.UTF_8);

    private MerkleTree() {
        throw new UnsupportedOperationException("Utility class cannot be instantiated");
    }

    /**
     * Single step in a cryptographic Merkle inclusion proof.
     * @param sibling 64-character lowercase hex hash of the sibling node.
     * @param isRight true if the sibling is positioned to the right of the current node; false if left.
     */
    public record ProofStep(String sibling, boolean isRight) {
        public ProofStep {
            Objects.requireNonNull(sibling, "sibling must not be null");
        }
    }

    /**
     * Result of building a Merkle tree over a list of leaves.
     * @param root 64-character lowercase hex SHA-256 Merkle root.
     * @param proofs List of inclusion proofs corresponding 1:1 to the input leaf indices.
     */
    public record MerkleResult(String root, List<List<ProofStep>> proofs) {
        public MerkleResult {
            Objects.requireNonNull(root, "root must not be null");
            Objects.requireNonNull(proofs, "proofs must not be null");
        }
    }

    private static MessageDigest createSha256Digest() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 digest algorithm unavailable in JVM", e);
        }
    }

    /**
     * Computes leaf hash: SHA256(0x00 || salt || "||" || value)
     */
    public static String hashLeaf(String salt, String value) {
        Objects.requireNonNull(salt, "salt must not be null");
        Objects.requireNonNull(value, "value must not be null");

        byte[] saltBytes = salt.getBytes(StandardCharsets.UTF_8);
        byte[] valueBytes = value.getBytes(StandardCharsets.UTF_8);

        int totalLen = 1 + saltBytes.length + SEPARATOR.length + valueBytes.length;
        ByteBuffer buffer = ByteBuffer.allocate(totalLen);
        buffer.put(AquaPulseConstants.MERKLE_LEAF_PREFIX);
        buffer.put(saltBytes);
        buffer.put(SEPARATOR);
        buffer.put(valueBytes);

        MessageDigest md = createSha256Digest();
        byte[] digest = md.digest(buffer.array());
        return HEX_FORMAT.formatHex(digest);
    }

    /**
     * Computes parent node hash: SHA256(0x01 || leftBytes || rightBytes)
     */
    public static String hashNode(String leftHex, String rightHex) {
        Objects.requireNonNull(leftHex, "leftHex must not be null");
        Objects.requireNonNull(rightHex, "rightHex must not be null");

        byte[] leftBytes = HEX_FORMAT.parseHex(leftHex);
        byte[] rightBytes = HEX_FORMAT.parseHex(rightHex);

        int totalLen = 1 + leftBytes.length + rightBytes.length;
        ByteBuffer buffer = ByteBuffer.allocate(totalLen);
        buffer.put(AquaPulseConstants.MERKLE_NODE_PREFIX);
        buffer.put(leftBytes);
        buffer.put(rightBytes);

        MessageDigest md = createSha256Digest();
        byte[] digest = md.digest(buffer.array());
        return HEX_FORMAT.formatHex(digest);
    }

    /**
     * Builds a binary Merkle tree and generates inclusion proofs for each leaf.
     * Supports odd-leaf promotion (the odd element is promoted directly to the next level).
     *
     * @param leaves List of 64-character lowercase hex leaf hashes.
     * @return MerkleResult containing root hex and proofs for each leaf index.
     */
    public static MerkleResult buildTree(List<String> leaves) {
        if (leaves == null || leaves.isEmpty()) {
            return new MerkleResult(AquaPulseConstants.EMPTY_MERKLE_ROOT, List.of());
        }

        List<String> currentLevel = new ArrayList<>(leaves);
        int n = leaves.size();
        List<List<ProofStep>> proofs = new ArrayList<>(n);
        List<List<Integer>> indices = new ArrayList<>(n);

        for (int i = 0; i < n; i++) {
            proofs.add(new ArrayList<>());
            List<Integer> single = new ArrayList<>();
            single.add(i);
            indices.add(single);
        }

        while (currentLevel.size() > 1) {
            List<String> nextLevel = new ArrayList<>();
            List<List<Integer>> nextIndices = new ArrayList<>();

            for (int i = 0; i < currentLevel.size(); i += 2) {
                if (i + 1 < currentLevel.size()) {
                    String left = currentLevel.get(i);
                    String right = currentLevel.get(i + 1);
                    String parent = hashNode(left, right);

                    // Proof for left's descendants: sibling is right
                    for (int idx : indices.get(i)) {
                        proofs.get(idx).add(new ProofStep(right, true));
                    }
                    // Proof for right's descendants: sibling is left
                    for (int idx : indices.get(i + 1)) {
                        proofs.get(idx).add(new ProofStep(left, false));
                    }

                    List<Integer> combined = new ArrayList<>(indices.get(i));
                    combined.addAll(indices.get(i + 1));
                    nextIndices.add(combined);
                    nextLevel.add(parent);
                } else {
                    // Odd leaf promotion without duplicate hashing
                    String parent = currentLevel.get(i);
                    nextIndices.add(indices.get(i));
                    nextLevel.add(parent);
                }
            }

            currentLevel = nextLevel;
            indices = nextIndices;
        }

        return new MerkleResult(currentLevel.get(0), proofs);
    }

    /**
     * Verifies receipt authenticity by hashing salt and value and evaluating the proof against rootHex.
     */
    public static boolean verifyReceipt(String rootHex, String salt, String value, List<ProofStep> proof) {
        String leafHash = hashLeaf(salt, value);
        return verifyLeaf(rootHex, leafHash, proof);
    }

    /**
     * Verifies cryptographic inclusion proof for a known leaf hash.
     */
    public static boolean verifyLeaf(String rootHex, String leafHex, List<ProofStep> proof) {
        if (rootHex == null || leafHex == null || proof == null) {
            return false;
        }

        String h = leafHex;
        for (ProofStep step : proof) {
            if (step.isRight()) {
                h = hashNode(h, step.sibling());
            } else {
                h = hashNode(step.sibling(), h);
            }
        }
        return h.equalsIgnoreCase(rootHex);
    }
}
