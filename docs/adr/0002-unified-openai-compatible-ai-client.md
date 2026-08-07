# Unified OpenAI-compatible AI client

All AI providers (Ollama, OpenAI, Groq, OpenRouter, Gemini) are integrated through a single OpenAI-compatible request/response shape, configured via a provider-preset dropdown (Base URL + optional API key + model). Chosen to avoid one integration path per provider. Trade-off: providers without an OpenAI-compatible surface (e.g. native Anthropic) aren't presets and need a compatible proxy to use via "Custom."
