package com.aquapulse.guarantee;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/guarantee")
public class GuaranteeController {
    private final GuaranteeService svc;
    public GuaranteeController(GuaranteeService svc) { this.svc = svc; }

    @GetMapping("/zones/{zoneId}/cap")
    public ResponseEntity<GuaranteeService.GuaranteeResult> cap(
            @PathVariable String zoneId,
            @RequestParam(defaultValue = "12.0") double dCrit,
            @RequestParam(defaultValue = "0.0") double kappaLog) {
        return ResponseEntity.ok(svc.computeCap(zoneId, dCrit, kappaLog));
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() { return ResponseEntity.ok("guarantee-service OK"); }
}
