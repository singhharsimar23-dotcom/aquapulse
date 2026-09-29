package com.aquapulse.copilot;

import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Set;

@Service
public class AlertExplainerService {
    private final OpenAiChatModel model;

    private static final String SYS = """
        You explain water allocation data to Indian farmers in simple language.
        RULES:
        1. Only use numbers that appear verbatim in the DATA block.
        2. Keep each sentence under 30 words.
        3. Output ONLY JSON: {"explanation_en":"...","explanation_hi":"..."}
        """;

    public AlertExplainerService(OpenAiChatModel model) { this.model = model; }

    public record ExplainResponse(String explanationEn, String explanationHi, boolean grounded) {}

    public ExplainResponse explain(String zoneId, double stress, String category, int confidence, double pool) {
        String data = String.format("DATA: zone=%s stress=%.1f%% category=%s confidence=%d%% pool=%.1fh",
            zoneId, stress, category, confidence, pool);
        Set<String> allowed = Set.of(
            String.valueOf((int) stress), String.format("%.1f", stress),
            String.valueOf(confidence), String.format("%.1f", pool), String.valueOf((int) pool)
        );
        try {
            String raw = model.call(new Prompt(List.of(new SystemMessage(SYS), new UserMessage(data))))
                .getResult().getOutput().getContent();
            if (NumericGroundingValidator.isGrounded(raw, allowed)) {
                // parse simple json
                String en = extract(raw, "explanation_en");
                String hi = extract(raw, "explanation_hi");
                return new ExplainResponse(en, hi, true);
            }
        } catch (Exception ignored) {}
        // fallback deterministic template
        String fb = String.format("Zone %s is %s at %.1f%% of safe budget (%d%% confidence). Pool: %.1f hours.",
            zoneId, category, stress, confidence, pool);
        return new ExplainResponse(fb, fb, false);
    }

    private static String extract(String json, String key) {
        int i = json.indexOf("\"" + key + "\"");
        if (i < 0) return "";
        int s = json.indexOf("\"", i + key.length() + 3) + 1;
        int e = json.indexOf("\"", s);
        return s > 0 && e > s ? json.substring(s, e) : "";
    }
}
