package com.aquapulse.guarantee;

import com.aquapulse.common.AquaPulseConstants;
import org.springframework.stereotype.Service;
import java.util.Arrays;
import java.util.Random;

@Service
public class GuaranteeService {
    public record GuaranteeResult(String zoneId, double mStar, double kappaLog, double confidence, String modelHash, double forecastP90) {}

    public GuaranteeResult computeCap(String zoneId, double dCrit, double kappaLog) {
        Random rng = new Random(42);
        double[] predictions = new double[200];
        for (int i = 0; i < 200; i++) {
            double T = 50.0 * Math.exp(rng.nextGaussian() * 0.3);
            double S = 0.001 * Math.exp(rng.nextGaussian() * 0.5);
            predictions[i] = TheisEngine.singleWell(500.0 / 86400, T, S, 1000.0, 90 * 86400.0);
        }
        double[] sorted = predictions.clone(); Arrays.sort(sorted);
        double p90 = sorted[(int)(0.90 * sorted.length)];
        double mStar = AcsyEngine.mStar(p90, kappaLog, dCrit);
        return new GuaranteeResult(zoneId, mStar, kappaLog, 1.0 - AquaPulseConstants.ACSY_ALPHA, AquaPulseConstants.MODEL_HASH, p90);
    }

    public double updateKappa(double kl, double realized, double ub) {
        return AcsyEngine.updateKappaLog(kl, realized, ub);
    }
}
