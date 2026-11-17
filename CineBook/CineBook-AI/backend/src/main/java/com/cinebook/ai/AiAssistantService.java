package com.cinebook.ai;

import com.cinebook.catalog.Showtime;
import com.cinebook.catalog.ShowtimeRepository;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class AiAssistantService {
    private final ShowtimeRepository showtimes;
    private final ChatClient chatClient;
    private final String apiKey;
    private final String providerName;

    public record CatalogOption(Long showtimeId, String movie, String theatre, String city,
                                Instant startsAt, String screen, String priceFrom) {}
    public record AssistantReply(boolean configured, String provider, String answer,
                                 List<CatalogOption> matchingShowtimes) {}

    public AiAssistantService(ShowtimeRepository showtimes, ChatClient.Builder chatClientBuilder,
                              @Value("${app.ai.api-key:}") String apiKey,
                              @Value("${app.ai.provider-name:OpenAI}") String providerName) {
        this.showtimes = showtimes;
        this.chatClient = chatClientBuilder.build();
        this.apiKey = apiKey;
        this.providerName = providerName;
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    public AssistantReply ask(String question) {
        if (!isConfigured()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "AI assistant is not configured. Set AI_API_KEY on the backend to enable it.");
        }

        List<Showtime> available = showtimes.browse(Instant.now(), null, null);
        List<Showtime> matched = filterByExplicitConstraints(question, available);
        if (matched.isEmpty()) {
            return new AssistantReply(true, "Spring AI / " + providerName,
                    "I could not find upcoming CineBook showtimes matching those constraints. Try a different budget, genre, city or time.",
                    List.of());
        }
        List<CatalogOption> catalog = matched.stream().limit(60).map(show -> new CatalogOption(
                show.getId(), show.getMovie().getTitle(), show.getScreen().getTheatre().getName(),
                show.getScreen().getTheatre().getCity(), show.getStartsAt(), show.getScreen().getName(),
                show.getBasePrice().toPlainString())).toList();

        String systemPrompt = "You are CineBook's movie discovery assistant. Use ONLY the supplied live catalogue " +
                "snapshot. Never invent movie titles, theatres, cities, prices, showtimes, availability, or bookings. " +
                "Do not claim seats are available; seat availability is not included in this catalogue snapshot. " +
                "When a requested constraint has no match, say so clearly. Recommend at most five matching entries. " +
                "Mention that prices are starting prices in INR. Do not perform or claim to perform bookings. " +
                "Answer naturally and briefly.\nLIVE_CATALOGUE_JSON:\n" + catalog;

        try {
            String answer = chatClient.prompt()
                    .system(systemPrompt)
                    .user(question.trim())
                    .call()
                    .content();
            if (answer == null || answer.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                        "The AI provider returned an empty response. Please retry.");
            }
            return new AssistantReply(true, "Spring AI / " + providerName, answer, catalog);
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "The AI provider is unavailable. The rest of CineBook remains usable.");
        }
    }

    /**
     * Apply constraints that can be checked without an LLM. This prevents the model
     * from receiving or displaying showtimes outside an explicit budget, city, genre
     * or near-term time request. Ambiguous preferences are left to the language model.
     */
    private List<Showtime> filterByExplicitConstraints(String question, List<Showtime> shows) {
        String q = question == null ? "" : question.toLowerCase(Locale.ROOT);
        List<Showtime> result = shows;

        var cities = shows.stream()
                .map(show -> show.getScreen().getTheatre().getCity())
                .filter(city -> city != null && !city.isBlank())
                .distinct().toList();
        String requestedCity = cities.stream()
                .filter(city -> q.contains(city.toLowerCase(Locale.ROOT)))
                .findFirst().orElse(null);
        if (requestedCity != null) {
            result = result.stream().filter(show -> requestedCity.equalsIgnoreCase(
                    show.getScreen().getTheatre().getCity())).toList();
        }

        Map<String, List<String>> genres = Map.of(
                "science fiction", List.of("science fiction", "sci-fi", "scifi"),
                "sci-fi", List.of("science fiction", "sci-fi", "scifi"),
                "comedy", List.of("comedy"),
                "action", List.of("action"),
                "thriller", List.of("thriller"),
                "horror", List.of("horror"),
                "romance", List.of("romance", "romantic"),
                "drama", List.of("drama"),
                "animation", List.of("animation", "animated"),
                "documentary", List.of("documentary")
        );
        List<String> requestedGenres = genres.entrySet().stream()
                .filter(entry -> q.contains(entry.getKey()))
                .flatMap(entry -> entry.getValue().stream()).distinct().toList();
        if (!requestedGenres.isEmpty()) {
            result = result.stream().filter(show -> {
                String actual = show.getMovie().getGenres().toLowerCase(Locale.ROOT);
                return requestedGenres.stream().anyMatch(actual::contains);
            }).toList();
        }

        Matcher budget = Pattern.compile("(?i)(?:under|below|less than|up to|upto|max(?:imum)?)(?:\\s+budget)?\\s*₹?\\s*([0-9][0-9,]*)|₹\\s*([0-9][0-9,]*)")
                .matcher(question == null ? "" : question);
        if (budget.find()) {
            String amount = budget.group(1) != null ? budget.group(1) : budget.group(2);
            BigDecimal ceiling = new BigDecimal(amount.replace(",", ""));
            result = result.stream().filter(show -> show.getBasePrice().compareTo(ceiling) <= 0).toList();
        }

        ZoneId india = ZoneId.of("Asia/Kolkata");
        LocalDate today = LocalDate.now(india);
        LocalDate requestedDate = null;
        if (q.contains("tomorrow")) requestedDate = today.plusDays(1);
        else if (q.contains("tonight") || q.contains("this evening") || q.contains("today")) requestedDate = today;
        if (requestedDate != null) {
            LocalDate date = requestedDate;
            result = result.stream().filter(show -> {
                var localStart = show.getStartsAt().atZone(india);
                if (!localStart.toLocalDate().equals(date)) return false;
                if (date.equals(today) && (q.contains("tonight") || q.contains("this evening"))) {
                    return !localStart.toLocalTime().isBefore(LocalTime.of(17, 0));
                }
                return true;
            }).toList();
        }
        return result;
    }
}
