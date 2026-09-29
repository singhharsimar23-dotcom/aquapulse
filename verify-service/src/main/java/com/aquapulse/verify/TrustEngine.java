package com.aquapulse.verify;

public class TrustEngine {
    public static double trust(double r, double e) {
        double m = Math.max(r, e);
        return m == 0 ? 1.0 : Math.max(0.0, Math.min(1.0, 1.0 - Math.abs(r - e) / m));
    }
    public static double verified(double r, double e, double t) { return t * r + (1 - t) * e; }
    public static double zScore(double r, double e) { return Math.abs(r - e) / 10.0; }
    public static boolean flag(double z, double rel) { return z > 2.0 || rel < 0.60; }
}
