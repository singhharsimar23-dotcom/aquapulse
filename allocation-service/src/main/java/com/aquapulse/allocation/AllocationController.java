package com.aquapulse.allocation;

import com.aquapulse.common.AllocationResult;
import com.aquapulse.common.AquaPulseConstants;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api")
public class AllocationController {

    @PostMapping("/zones/{zoneId}/allocations")
    public ResponseEntity<AllocationResult> allocate(@PathVariable String zoneId, @RequestBody Req req) {
        return ResponseEntity.ok(AllocationEngine.allocate(zoneId, req.season(), req.farmers(),
            req.budgetHours(), req.mStar(), 0.90, req.kappaV(), AquaPulseConstants.MODEL_HASH));
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() { return ResponseEntity.ok("allocation-service OK"); }

    public record Req(String season, List<AllocationEngine.FarmerInput> farmers, double budgetHours, double mStar, double kappaV) {}
}
