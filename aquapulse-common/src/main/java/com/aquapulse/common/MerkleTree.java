package com.aquapulse.common;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;

public class MerkleTree {
    public record ProofStep(String siblingHex, boolean isRight) {}
    public record TreeResult(String root, List<List<ProofStep>> proofs) {}

    public static String leafHash(String salt, String value) {
        byte[] s = salt.getBytes(StandardCharsets.UTF_8);
        byte[] sep = "||".getBytes(StandardCharsets.UTF_8);
        byte[] v = value.getBytes(StandardCharsets.UTF_8);
        byte[] d = new byte[1 + s.length + sep.length + v.length];
        d[0] = AquaPulseConstants.MERKLE_LEAF_PREFIX;
        System.arraycopy(s, 0, d, 1, s.length);
        System.arraycopy(sep, 0, d, 1 + s.length, sep.length);
        System.arraycopy(v, 0, d, 1 + s.length + sep.length, v.length);
        return hex(sha256(d));
    }

    public static String nodeHash(String lHex, String rHex) {
        byte[] l = unhex(lHex), r = unhex(rHex);
        byte[] d = new byte[1 + l.length + r.length];
        d[0] = AquaPulseConstants.MERKLE_NODE_PREFIX;
        System.arraycopy(l, 0, d, 1, l.length);
        System.arraycopy(r, 0, d, 1 + l.length, r.length);
        return hex(sha256(d));
    }

    public static TreeResult buildTree(List<String> leaves) {
        int n = leaves.size();
        if (n == 0) return new TreeResult(hex(sha256(new byte[]{0x01})), List.of());
        List<String> cur = new ArrayList<>(leaves);
        List<List<Integer>> idx = new ArrayList<>();
        for (int i = 0; i < n; i++) { List<Integer> l = new ArrayList<>(); l.add(i); idx.add(l); }
        List<List<ProofStep>> proofs = new ArrayList<>();
        for (int i = 0; i < n; i++) proofs.add(new ArrayList<>());
        while (cur.size() > 1) {
            List<String> next = new ArrayList<>(); List<List<Integer>> ni = new ArrayList<>();
            for (int i = 0; i < cur.size(); i += 2) {
                if (i + 1 < cur.size()) {
                    String L = cur.get(i), R = cur.get(i + 1);
                    for (int x : idx.get(i)) proofs.get(x).add(new ProofStep(R, true));
                    for (int x : idx.get(i + 1)) proofs.get(x).add(new ProofStep(L, false));
                    List<Integer> c = new ArrayList<>(idx.get(i)); c.addAll(idx.get(i + 1));
                    next.add(nodeHash(L, R)); ni.add(c);
                } else { next.add(cur.get(i)); ni.add(idx.get(i)); }
            }
            cur = next; idx = ni;
        }
        return new TreeResult(cur.get(0), proofs);
    }

    public static boolean verify(String root, String salt, String value, List<ProofStep> proof) {
        String h = leafHash(salt, value);
        for (ProofStep s : proof) h = s.isRight() ? nodeHash(h, s.siblingHex()) : nodeHash(s.siblingHex(), h);
        return h.equals(root);
    }

    private static byte[] sha256(byte[] d) {
        try { return MessageDigest.getInstance("SHA-256").digest(d); }
        catch (NoSuchAlgorithmException e) { throw new RuntimeException(e); }
    }
    private static String hex(byte[] b) {
        StringBuilder sb = new StringBuilder();
        for (byte x : b) sb.append(String.format("%02x", x));
        return sb.toString();
    }
    private static byte[] unhex(String h) {
        byte[] d = new byte[h.length() / 2];
        for (int i = 0; i < d.length; i++) d[i] = (byte) Integer.parseInt(h.substring(i*2, i*2+2), 16);
        return d;
    }
}
