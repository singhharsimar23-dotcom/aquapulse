package com.aquapulse.verify;

public class BayesianReliabilityTracker {
    private double alpha, beta;
    public BayesianReliabilityTracker() { this.alpha = 2.0; this.beta = 1.0; }
    public BayesianReliabilityTracker(double a, double b) { this.alpha = a; this.beta = b; }
    public double mean() { return alpha / (alpha + beta); }
    public void update(double trust) {
        if (trust >= 0.8) alpha += 1.0;
        else if (trust <= 0.5) beta += 1.0;
        else { alpha += 0.5; beta += 0.5; }
    }
}
