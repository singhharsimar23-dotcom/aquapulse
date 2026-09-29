package com.aquapulse.common.dto;

import java.util.List;

/**
 * Verified response from committee RAG assistant with citation provenance.
 */
public record CopilotAskResponse(
        String answer,
        List<String> citations,
        boolean grounded,
        String modelUsed
) {}
