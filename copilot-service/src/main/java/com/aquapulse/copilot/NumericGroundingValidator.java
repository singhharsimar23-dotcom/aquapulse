package com.aquapulse.copilot;

import java.util.Set;
import java.util.regex.*;

/** HARD INVARIANT 2: Every LLM number token validated ±0.05 against source DTO. */
public class NumericGroundingValidator {
    private static final Pattern NUM = Pattern.compile("-?\\d+(\\.\\d+)?%?");
    private static final double TOL = 0.05;

    public static boolean isGrounded(String text, Set<String> allowed) {
        Matcher m = NUM.matcher(text);
        while (m.find()) {
            String tok = m.group().replace("%", "");
            boolean ok = allowed.stream().anyMatch(a -> close(a, tok));
            if (!ok) return false;
        }
        return true;
    }

    private static boolean close(String a, String b) {
        try { return Math.abs(Double.parseDouble(a) - Double.parseDouble(b)) <= TOL; }
        catch (NumberFormatException e) { return a.equals(b); }
    }
}
