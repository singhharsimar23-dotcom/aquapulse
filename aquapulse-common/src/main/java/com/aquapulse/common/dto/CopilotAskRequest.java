package com.aquapulse.common.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Natural language inquiry to the committee RAG assistant.
 */
public record CopilotAskRequest(
        @NotBlank String question,
        String zoneId,
        String language
) {}
