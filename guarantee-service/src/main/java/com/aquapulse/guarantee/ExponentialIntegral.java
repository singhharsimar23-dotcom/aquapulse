package com.aquapulse.guarantee;

import com.aquapulse.common.AquaPulseConstants;

/** E1(x): power series x<=1, Lentz CF x>1. Ported from stress/aquapulse_stress.py */
public final class ExponentialIntegral {
    private ExponentialIntegral() {}

    public static double e1(double x) {
        if (x <= 0) throw new IllegalArgumentException("x must be > 0");
        if (x <= 1.0) {
            double s = -AquaPulseConstants.EULER_GAMMA - Math.log(x);
            double term = 1.0;
            for (int k = 1; k <= 65; k++) { term *= -x / k; s -= term / k; }
            return s;
        } else {
            double b = x + 1.0, c = 1e300, d = 1.0 / b, h = d;
            for (int i = 1; i <= 200; i++) {
                double ai = -(double) i * i;
                b += 2.0; d = 1.0 / (ai * d + b); c = b + ai / c;
                double delta = c * d; h *= delta;
                if (Math.abs(delta - 1.0) < 1e-15) break;
            }
            return h * Math.exp(-x);
        }
    }
}
