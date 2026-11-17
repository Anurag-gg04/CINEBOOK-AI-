# Spring AI integration

## What the AI assistant does

`POST /api/ai/assistant` accepts a natural-language discovery question and calls a Spring AI `ChatClient` configured with an OpenAI-compatible chat model. The service first loads upcoming showtimes from the CineBook database and supplies a bounded snapshot (at most 60 entries) containing actual movie, theatre, city, showtime, screen and starting-price data. Its system prompt explicitly prohibits inventing catalogue details, available seats or booking confirmations.

The endpoint returns the generated answer and the source catalogue entries supplied to the model. Seat availability is deliberately not asserted by this feature: the booking flow fetches current seat inventory separately and locks seats transactionally.

## Configuration

Set these variables in the backend runtime, not in Vercel's public frontend environment:

```dotenv
AI_API_KEY=your-provider-api-key
AI_MODEL=gpt-4o-mini
AI_BASE_URL=https://api.openai.com/v1
AI_PROVIDER_NAME=OpenAI
```

The starter uses Spring AI's OpenAI chat model. `AI_API_KEY` is read from backend environment configuration; it is never bundled in React. With a blank key, `/api/ai/status` reports disabled and the assistant endpoint returns HTTP 503. When the provider fails, CineBook returns an explicit unavailable message while other application functions remain available.

## Important boundaries

- The assistant is a discovery aid, not a booking agent. It cannot create a booking, charge a payment or reserve seats.
- The model prompt is a guardrail, not a formal guarantee against hallucinations. Validate every factual claim against backend data before relying on it. Current response cards show database entries, not model-invented records.
- Historical recommendation models, sentiment analytics, demand forecasts and automatic seat selection are not implemented by this AI service in this release. Existing deterministic seat recommendations are separate from LLM functionality.
- Provider cost, retention and privacy terms apply to prompts sent to the configured LLM. Do not transmit payment secrets or unnecessary personal information.
