package com.aquapulse.copilot;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/copilot")
public class CopilotController {
    private final AlertExplainerService svc;
    public CopilotController(AlertExplainerService svc) { this.svc = svc; }

    @GetMapping("/explain")
    public ResponseEntity<AlertExplainerService.ExplainResponse> explain(
            @RequestParam String zone,
            @RequestParam double stress,
            @RequestParam String category,
            @RequestParam(defaultValue = "90") int confidence,
            @RequestParam double pool) {
        return ResponseEntity.ok(svc.explain(zone, stress, category, confidence, pool));
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() { return ResponseEntity.ok("copilot-service OK"); }
}
