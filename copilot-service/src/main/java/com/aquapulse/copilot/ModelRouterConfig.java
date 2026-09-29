package com.aquapulse.copilot;

import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

/** Cloud-first LLM cascade: Groq → Cerebras → Gemini → OpenRouter. No local Ollama. */
@Configuration
public class ModelRouterConfig {
    @Value("${aquapulse.llm.groq.api-key}") String groqKey;
    @Value("${aquapulse.llm.cerebras.api-key:}") String cerebrasKey;
    @Value("${aquapulse.llm.gemini.api-key:}") String geminiKey;
    @Value("${aquapulse.llm.openrouter.api-key:}") String openrouterKey;

    @Bean @Primary
    public OpenAiChatModel primaryModel() {
        // Try Groq first; fall back at runtime via AlertExplainerService
        return new OpenAiChatModel(
            new OpenAiApi("https://api.groq.com/openai/v1", groqKey),
            OpenAiChatOptions.builder().withModel("llama-3.3-70b-versatile").withTemperature(0.0f).build()
        );
    }

    @Bean("cerebrasModel")
    public OpenAiChatModel cerebrasModel() {
        String key = cerebrasKey.isBlank() ? groqKey : cerebrasKey;
        String base = cerebrasKey.isBlank() ? "https://api.groq.com/openai/v1" : "https://api.cerebras.ai/v1";
        return new OpenAiChatModel(new OpenAiApi(base, key),
            OpenAiChatOptions.builder().withModel("llama-3.3-70b-versatile").withTemperature(0.0f).build());
    }
}
