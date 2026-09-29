package com.aquapulse.guarantee;

import com.aquapulse.common.AquaPulseConstants;
import java.util.Arrays;

public class AcsyEngine {
    public static double updateKappaLog(double kl, double realized, double upperBound) {
        double err = realized > upperBound ? 1.0 : 0.0;
        double u = kl + AquaPulseConstants.ACSY_ETA * (err - AquaPulseConstants.ACSY_ALPHA);
        return Math.max(AquaPulseConstants.ACSY_KAPPA_LOG_MIN, Math.min(AquaPulseConstants.ACSY_KAPPA_LOG_MAX, u));
    }

    public static double mStar(double p90, double kl, double dCrit) {
        double ub = p90 * Math.exp(kl);
        return ub <= 0 ? 1.0 : Math.min(1.0, dCrit / ub);
    }

    /** Bisection tempering: find lambda s.t. ESS(lambda * logliks) >= ACSY_ESS_MIN */
    public static double[] posteriorWeights(double[] logliks) {
        double[] wFull = normalized(logliks, 1.0);
        if (ess(wFull) >= AquaPulseConstants.ACSY_ESS_MIN) return wFull;
        double lo = 0, hi = 1;
        double[] best = uniform(logliks.length);
        for (int i = 0; i < 40; i++) {
            double mid = (lo + hi) / 2.0;
            double[] w = normalized(logliks, mid);
            if (ess(w) >= AquaPulseConstants.ACSY_ESS_MIN) { lo = mid; best = w; }
            else hi = mid;
        }
        return best;
    }

    private static double[] normalized(double[] ll, double t) {
        double max = Arrays.stream(ll).max().getAsDouble();
        double[] w = Arrays.stream(ll).map(x -> Math.exp(t * (x - max))).toArray();
        double s = Arrays.stream(w).sum();
        return Arrays.stream(w).map(x -> x / s).toArray();
    }
    private static double ess(double[] w) { return 1.0 / Arrays.stream(w).map(x -> x * x).sum(); }
    private static double[] uniform(int n) { double[] w = new double[n]; Arrays.fill(w, 1.0/n); return w; }
}
