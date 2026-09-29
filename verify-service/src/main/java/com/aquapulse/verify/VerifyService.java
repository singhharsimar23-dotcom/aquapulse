package com.aquapulse.verify;

import com.aquapulse.common.ReadingDto;
import com.aquapulse.common.VerificationResult;
import org.springframework.stereotype.Service;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class VerifyService {
    private final Map<String, BayesianReliabilityTracker> trackers = new ConcurrentHashMap<>();

    public VerificationResult verify(ReadingDto dto) {
        double r = dto.reportedHours(), e = dto.electricityImpliedHours();
        double t = TrustEngine.trust(r, e);
        double v = TrustEngine.verified(r, e, t);
        double z = TrustEngine.zScore(r, e);
        BayesianReliabilityTracker tr = trackers.computeIfAbsent(dto.farmerId(), k -> new BayesianReliabilityTracker());
        tr.update(t);
        return new VerificationResult(UUID.randomUUID().toString(), dto.farmerId(), r, e, t, v, z, TrustEngine.flag(z, tr.mean()), tr.mean());
    }
}
