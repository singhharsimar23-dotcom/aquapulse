package com.aquapulse.guarantee;

import java.util.List;

public class TheisEngine {
    public record WellSpec(double x, double y, double q, double tStartSec) {}

    public static double singleWell(double q, double T, double S, double r, double tSec) {
        if (tSec <= 0 || r <= 0) return 0.0;
        double u = (r * r * S) / (4.0 * T * tSec);
        if (u > 100) return 0.0;
        return (q / (4.0 * Math.PI * T)) * ExponentialIntegral.e1(u);
    }

    public static double superposition(List<WellSpec> wells, double ox, double oy, double T, double S, double nowSec) {
        double total = 0.0;
        for (WellSpec w : wells) {
            double dt = nowSec - w.tStartSec();
            if (dt <= 0) continue;
            double dx = ox - w.x(), dy = oy - w.y();
            double r = Math.sqrt(dx * dx + dy * dy);
            if (r < 1e-6) r = 0.14 * Math.sqrt(2) * 100.0;
            total += singleWell(w.q(), T, S, r, dt);
        }
        return total;
    }
}
