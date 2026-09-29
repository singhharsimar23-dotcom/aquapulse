package com.aquapulse.verify;

import com.aquapulse.common.ReadingDto;
import com.aquapulse.common.VerificationResult;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/readings")
public class VerifyController {
    private final VerifyService svc;
    public VerifyController(VerifyService svc) { this.svc = svc; }

    @PostMapping
    public ResponseEntity<VerificationResult> ingest(@RequestBody ReadingDto dto) {
        return ResponseEntity.ok(svc.verify(dto));
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() { return ResponseEntity.ok("verify-service OK"); }
}
