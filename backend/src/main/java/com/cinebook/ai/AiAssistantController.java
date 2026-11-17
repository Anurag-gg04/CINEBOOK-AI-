package com.cinebook.ai;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiAssistantController {
    private final AiAssistantService assistant;

    public AiAssistantController(AiAssistantService assistant) {
        this.assistant = assistant;
    }

    public record AssistantRequest(@NotBlank @Size(max = 1000) String question) {}

    @GetMapping("/status")
    public Map<String, Object> status() {
        return Map.of(
                "enabled", assistant.isConfigured(),
                "provider", "OpenAI-compatible chat completions API",
                "message", assistant.isConfigured()
                        ? "AI assistant is configured."
                        : "Set AI_API_KEY on the backend to enable the AI assistant.");
    }

    @PostMapping("/assistant")
    public AiAssistantService.AssistantReply ask(@Valid @RequestBody AssistantRequest request) {
        return assistant.ask(request.question());
    }
}
